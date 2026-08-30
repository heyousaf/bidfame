"use client";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        ready: () => void;
        expand: () => void;
        colorScheme: "light" | "dark";
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        openInvoice: (url: string, callback: (status: "paid" | "cancelled" | "failed" | "pending") => void) => void;
        openTelegramLink: (url: string) => void;
        initDataUnsafe?: {
          start_param?: string;
          user?: { id: number; username?: string; first_name?: string };
        };
        HapticFeedback?: { notificationOccurred: (type: "success" | "error" | "warning") => void };
      };
    };
  }
}

export function getWebApp() {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function initTelegramApp() {
  const app = getWebApp();
  if (!app) return null;
  app.ready();
  app.expand();
  app.setHeaderColor?.("#0a0713");
  app.setBackgroundColor?.("#0a0713");
  return app;
}

/** Fetch wrapper that attaches verified Telegram initData to every request. */
export async function authedFetch(input: string, init: RequestInit = {}) {
  const app = getWebApp();
  const initData = app?.initData ?? "";
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "Content-Type": "application/json",
      "x-telegram-init-data": initData
    }
  });
}

export function openInvoice(url: string): Promise<"paid" | "cancelled" | "failed" | "pending"> {
  return new Promise((resolve) => {
    const app = getWebApp();
    if (!app) return resolve("failed");
    app.openInvoice(url, (status) => resolve(status));
  });
}
