"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import toast from "react-hot-toast";

import { useCart } from "../cart-provider";
import { chatWithAI, type AIChatMessage, type Product } from "../../lib/api";
import { formatINR } from "../../lib/currency";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  suggestedProducts?: Product[];
}

function messageToHistory(messages: Message[]): AIChatMessage[] {
  return messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    const openChatListener = () => setIsOpen(true);
    window.addEventListener("open-autobot", openChatListener);
    return () => window.removeEventListener("open-autobot", openChatListener);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const history = messageToHistory([...messages, userMessage]);
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const res = await chatWithAI({
        message: trimmed,
        history,
        language: "English",
      });
      const assistantMessage: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply || "I could not generate a response right now.",
        timestamp: new Date().toISOString(),
        suggestedProducts: res.suggested_products || [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      toast.error(e?.message || "Could not reach AutoMart AI");
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content:
            "I am temporarily unavailable. You can still browse Spare Parts or Vehicle Search directly.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const welcomeMessage = messages.length === 0 && !isLoading;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[1000] w-16 h-16 bg-gradient-to-r from-primary to-carRed text-primary-foreground rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all duration-300 flex items-center justify-center border-4 border-white/20"
        aria-label="AI Chatbot"
      >
        <MessageCircle className="w-7 h-7" />
      </button>

      {isOpen && (
        <div className="fixed inset-x-4 sm:inset-x-auto bottom-24 sm:right-6 z-[1000] w-auto sm:w-full sm:max-w-md h-[min(560px,calc(100dvh-7.5rem))] max-h-[calc(100dvh-7.5rem)] overflow-visible">
          <div
            className="pointer-events-none absolute -inset-[1px] hidden dark:block rounded-2xl chatbot-glow-outline"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -inset-4 hidden dark:block rounded-[1.4rem] chatbot-glow-blur"
            aria-hidden="true"
          />

          <div className="relative h-full bg-background border border-border/60 dark:border-primary/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-carRed rounded-xl flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">AutoMart AI</h3>
                  <p className="text-sm text-muted-foreground">Spare parts assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto overscroll-contain space-y-3">
              {welcomeMessage && (
                <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4 text-center">
                  <Bot className="w-10 h-10 mx-auto mb-3 text-primary opacity-80" />
                  <h4 className="font-semibold text-foreground mb-1">AutoMart AI is ready</h4>
                  <p className="text-muted-foreground mb-3 text-sm">
                    Share your vehicle company, model, and year to get compatible spare parts.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center text-xs">
                    <button
                      onClick={() => setInputMessage("Suggest brake pads for Honda City 2020 petrol")}
                      className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                    >
                      Honda City brake pads
                    </button>
                    <button
                      onClick={() => setInputMessage("Show universal engine oil options")}
                      className="px-3 py-1 bg-bikeBlue/10 hover:bg-bikeBlue/20 text-bikeBlue rounded-lg transition-colors"
                    >
                      Universal engine oil
                    </button>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-primary to-carRed text-primary-foreground shadow-lg"
                        : "bg-muted/60 border border-border/50 shadow-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-[11px] mt-1 ${
                        message.role === "user" ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>

                    {message.role === "assistant" && (message.suggestedProducts || []).length > 0 && (
                      <div className="mt-3 space-y-2">
                        {(message.suggestedProducts || []).slice(0, 3).map((product) => (
                          <div key={product.id} className="rounded-lg border border-border/60 bg-background/80 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {product.brand || "Generic"} | {product.product_type}
                                </p>
                                <p className="text-xs text-muted-foreground/90 line-clamp-1">
                                  {product.vehicle_compatibility || "Check product detail for compatibility."}
                                </p>
                                <p className="text-sm font-bold text-primary mt-1">{formatINR(product.price)}</p>
                              </div>
                              <div className="flex flex-col gap-1 shrink-0">
                                <button
                                  onClick={() =>
                                    addToCart({
                                      id: String(product.id),
                                      productId: product.id,
                                      title: product.name,
                                      price: product.price,
                                      image: product.image_url || "",
                                    })
                                  }
                                  className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                                >
                                  Add
                                </button>
                                <Link
                                  href={`/products/${product.slug}`}
                                  className="px-2 py-1 rounded-md border border-primary/40 text-primary text-xs font-semibold text-center"
                                >
                                  View
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted/60 border border-border/50 rounded-2xl p-3 shadow-md">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 bg-gradient-to-r from-primary to-carRed rounded-full animate-spin" />
                      <p className="text-xs text-muted-foreground">AutoMart AI is thinking...</p>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border/50 bg-background">
              <div className="flex items-end space-x-2">
                <input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="Example: suggest parts for Hyundai Creta 2022 diesel"
                  className="flex-1 px-4 py-3 bg-muted/50 dark:bg-slate-900/70 border border-input dark:border-primary/45 text-foreground placeholder:text-muted-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-3 bg-gradient-to-r from-primary to-carRed hover:from-carRed hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-lg hover:shadow-xl"
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                AI usage is rate-limited to control free-tier costs.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
