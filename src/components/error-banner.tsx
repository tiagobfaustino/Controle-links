import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function ErrorBanner({ message, onRetry, retrying }: ErrorBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-bold uppercase tracking-[0.04em]">Falha ao carregar</p>
        <p className="mt-0.5 text-destructive/90">{message}</p>
      </div>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
          className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/20 hover:text-destructive"
        >
          <RefreshCw className={retrying ? "size-3.5 animate-spin" : "size-3.5"} />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function describeError(err: unknown): {
  message: string;
  isAuthError: boolean;
} {
  if (typeof err === "object" && err !== null) {
    const e = err as { status?: number; message?: string; data?: unknown };
    if (e.status === 401 || e.status === 403) {
      return { message: "Sessão expirada ou sem permissão.", isAuthError: true };
    }
    if (e.status === 0) {
      return {
        message: "Sem conexão. Verifique sua rede e tente novamente.",
        isAuthError: false,
      };
    }
    if (e.message) {
      let detail = "";
      if (typeof e.data === "object" && e.data !== null) {
        const data = e.data as { message?: string };
        detail = data.message ? ` ${data.message}` : "";
      }
      return { message: `${e.message}${detail}`, isAuthError: false };
    }
  }
  return { message: "Erro inesperado ao acessar o servidor.", isAuthError: false };
}
