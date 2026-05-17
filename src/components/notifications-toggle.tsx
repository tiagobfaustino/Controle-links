import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import {
  getPermission,
  getUserPreference,
  isNotificationSupported,
  requestPermission,
  setUserPreference,
} from "@/lib/notifications";

export function NotificationsToggle() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isNotificationSupported());
    setEnabled(getUserPreference() && getPermission() === "granted");
  }, []);

  if (!supported) return null;

  async function handleClick() {
    if (enabled) {
      setUserPreference(false);
      setEnabled(false);
      toast.success("Notificações desativadas");
      return;
    }
    const perm = await requestPermission();
    if (perm === "granted") {
      setUserPreference(true);
      setEnabled(true);
      toast.success("Notificações ativadas");
    } else if (perm === "denied") {
      toast.error(
        "Permissão negada. Habilite manualmente nas configurações do navegador.",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-primary-foreground/20 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.04em] text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10"
      title={enabled ? "Desativar notificações" : "Ativar notificações"}
    >
      {enabled ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
      <span className="hidden lg:inline">
        {enabled ? "Notif. ON" : "Notif."}
      </span>
    </button>
  );
}
