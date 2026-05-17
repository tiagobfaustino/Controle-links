import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("app render error", error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4">
        <div className="w-full rounded-md border border-destructive/40 bg-card p-5 text-card-foreground shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <h1 className="text-lg font-black uppercase tracking-[0.06em]">
                Erro ao abrir o painel
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                O app encontrou um erro de execução. Recarregue a página; se
                persistir, envie a mensagem abaixo.
              </p>
              <pre className="mt-4 max-h-56 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground">
                {this.state.error.message}
              </pre>
            </div>
          </div>
        </div>
      </main>
    );
  }
}
