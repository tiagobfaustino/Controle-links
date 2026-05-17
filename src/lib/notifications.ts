// Notificações in-app via Notification API do browser.
// Só funciona quando o app está aberto (tab ou PWA). Push real "com app
// fechado" exigiria VAPID + serviço Node — fora do escopo do MVP.

const STORAGE_KEY = "controle-links.notifications-enabled";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export function getUserPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUserPreference(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

export type NotifyOptions = {
  title: string;
  body?: string;
  tag?: string; // dedupes — mesma tag substitui notificação anterior
  url?: string; // ao clicar, navega/foca para esta URL
  icon?: string;
};

export function notify(opts: NotifyOptions): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  if (!getUserPreference()) return;
  // Não notifica se a aba está em foco — evita ruído duplicado
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    return;
  }

  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      icon: opts.icon ?? "/android-chrome-192x192.png",
      badge: "/favicon-32x32.png",
    });
    if (opts.url) {
      n.onclick = () => {
        window.focus();
        window.location.href = opts.url!;
        n.close();
      };
    }
  } catch {
    // Alguns browsers/SO bloqueiam silenciosamente. Best-effort.
  }
}
