import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";

export default function ConfirmarRecuperacaoPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errors, setErrors] = useState<{
    novaSenha?: string;
    confirmar?: string;
    geral?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate() {
    const next: typeof errors = {};
    if (novaSenha.length < 8) {
      next.novaSenha = "A senha deve ter pelo menos 8 caracteres.";
    }
    if (confirmar !== novaSenha) {
      next.confirmar = "As senhas não coincidem.";
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    if (!token) {
      setErrors({ geral: "Link inválido ou expirado." });
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const pb = getPb();
      await pb
        .collection("users")
        .confirmPasswordReset(token, novaSenha, confirmar);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      console.error("confirmPasswordReset", err);
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      const message =
        status === 400
          ? "Link inválido ou expirado. Solicite um novo na tela de login."
          : err instanceof Error
            ? err.message
            : "Erro ao redefinir senha. Tente novamente.";
      setErrors({ geral: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-7 flex flex-col items-center text-center">
        <img
          src="/android-chrome-192x192.png"
          alt=""
          className="mb-4 size-16 rounded-md border-2 border-primary object-cover shadow-md"
        />
        <p className="tactical-heading">Recuperação de acesso</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-foreground">
          Controle de Links
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Definir nova senha
        </p>
      </div>

      <Card className="w-full max-w-sm border-2 border-primary/70">
        <CardHeader className="border-b border-primary/40 bg-accent text-accent-foreground">
          <CardTitle className="uppercase tracking-[0.08em] text-primary">
            Nova senha
          </CardTitle>
          <CardDescription>
            Escolha uma nova senha para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white pt-1">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-accent" />
              <p className="text-sm font-bold text-primary">
                Senha redefinida com sucesso!
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecionando para o login...
              </p>
            </div>
          ) : !token ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <AlertCircle className="size-10 text-destructive" />
              <p className="text-sm font-bold text-destructive">
                Link inválido
              </p>
              <p className="text-sm text-muted-foreground">
                Solicite um novo link na tela de login.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/recuperar-senha">
                  <ArrowLeft className="size-4" />
                  Solicitar novo link
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errors.geral && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errors.geral}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  aria-invalid={!!errors.novaSenha}
                  required
                  disabled={loading}
                  autoFocus
                />
                {errors.novaSenha && (
                  <p className="text-xs text-destructive">{errors.novaSenha}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmar">Confirmar nova senha</Label>
                <Input
                  id="confirmar"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  aria-invalid={!!errors.confirmar}
                  required
                  disabled={loading}
                />
                {errors.confirmar && (
                  <p className="text-xs text-destructive">{errors.confirmar}</p>
                )}
              </div>

              <Button type="submit" className="mt-2 w-full h-9" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Salvando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <KeyRound className="size-4" />
                    Salvar nova senha
                  </span>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
