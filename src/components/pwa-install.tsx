import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isInstallHidden() {
  try {
    return localStorage.getItem("pwa-install-hidden") === "1";
  } catch {
    return false;
  }
}

export function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(isInstallHidden);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (isIosDevice()) {
      setShowIosHint(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function dismiss() {
    try {
      localStorage.setItem("pwa-install-hidden", "1");
    } catch {
      // Ignore unavailable storage; the button can still be hidden for this session.
    }
    setHidden(true);
  }

  if (hidden || (!installPrompt && !showIosHint)) {
    return null;
  }

  if (installPrompt) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={installApp}
        className="border-primary-foreground/25 bg-primary text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
      >
        <Download className="size-4" />
        Instalar app
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-primary-foreground/20 px-2.5 py-1.5 text-xs font-semibold text-primary-foreground/85">
      <Smartphone className="size-4 text-accent" />
      <span className="hidden lg:inline">No iPhone: Compartilhar &gt; Adicionar à Tela de Início</span>
      <span className="lg:hidden">Adicionar à Tela de Início</span>
      <button
        type="button"
        onClick={dismiss}
        className="rounded-sm p-0.5 text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
        aria-label="Ocultar dica de instalação"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
