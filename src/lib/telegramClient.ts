"use client";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        openInvoice: (url: string, callback: (status: string) => void) => void;
        HapticFeedback?: { notificationOccurred: (type: string) => void };
        showAlert?: (msg: string) => void;
      };
    };
  }
}

export function getTelegramWebApp() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp || null;
}

export function getInitData(): string {
  return getTelegramWebApp()?.initData || "";
}

export function openInvoice(link: string): Promise<"paid" | "cancelled" | "failed" | "pending"> {
  return new Promise((resolve) => {
    const wa = getTelegramWebApp();
    if (!wa) {
      resolve("failed");
      return;
    }
    wa.openInvoice(link, (status) => {
      resolve(status as "paid" | "cancelled" | "failed" | "pending");
    });
  });
}
