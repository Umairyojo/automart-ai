import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '../components/theme-provider';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { Toaster } from 'react-hot-toast';
import ChatbotGuard from '../components/chatbot/chatbot-guard';
import { Providers } from '../components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AutoMart - Premium Cars & Bikes Marketplace',
  description: 'Buy and sell premium cars and bikes with AI-powered recommendations and real-time notifications.',
  keywords: 'cars, bikes, marketplace, e-commerce, AI chatbot, Razorpay',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: 'AutoMart - Cars & Bikes',
    description: 'Premium cars and bikes marketplace with AI assistant',
    images: ['/og-image.jpg'],
    type: 'website'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <ChatbotGuard />
            </div>
            <Toaster position="top-right" />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

