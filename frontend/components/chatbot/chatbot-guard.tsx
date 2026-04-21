"use client";

import { usePathname } from "next/navigation";

import Chatbot from "./chatbot";

export default function ChatbotGuard() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) {
    return null;
  }
  return <Chatbot />;
}
