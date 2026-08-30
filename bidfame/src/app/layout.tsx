import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "BIDFAME — Current Leader",
  description: "Get seen. Get featured. Bid Telegram Stars to become the #1 leader."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-bg text-white antialiased min-h-screen">{children}</body>
    </html>
  );
}
