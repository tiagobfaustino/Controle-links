import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { getPb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AlertCircle, KeyRound, CheckCircle2, Shield } from "lucide-react";

export default function AlterarSenhaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errors, setErrors] = useState<{ novaSenha?: string; confirmar?: string; geral?: string }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate() {
    const newErrors: typeof errors = {};

    if (novaSenha.length < 8) {
      newErrors.novaSenha = "A senha deve ter pelo menos 8 caracteres.";
    }

    if (confirmar !== novaSenha) {
      newErrors.confirmar = "As senhas não coincidem.";
    }

    return newErrors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!user) {
      setErrors({ geral: "Sessão expirada. Faça login novamente." });
      return;
    }

    setLoading(true);

    try {
      const pb = getPb();
      pb.authStore.loadFromCookie(document.cookie);

      await pb.collection("users").update(user.id, {
        password: novaSenha,
        passwordConfirm: confirmar,
        firstLogin: false,
      });

      await pb.collection("users").authWithPassword(user.email, novaSenha);
      document.cookie = pb.authStore.exportToCookie({ httpOnly: false });

      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao alterar a senha. Tente novamente.";
      setErrors({ geral: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-md border-2 border-primary bg-primary text-accent shadow-md">
          <Shield className="size-9" />
        </div>
        <p className="tactical-heading">Segurança de acesso</p>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-foreground">
          Controle de Links
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          Primeiro acesso — altere sua senha
        </p>
      </div>

      <Card className="w-full max-w-sm border-2 border-primary/70">
        <CardHeader className="border-b border-primary/40 bg-accent text-accent-foreground">
          <CardTitle className="uppercase tracking-[0.08em] text-primary">Alterar Senha</CardTitle>
          <CardDescription>
            Por segurança, você precisa definir uma nova senha antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white pt-1">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-accent" />
              <p className="text-sm font-bold text-primary">
                Senha alterada com sucesso! Redirecionando...
              </p>
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

              <Button
                type="submit"
                className="mt-2 w-full h-9"
                disabled={loading}
              >
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
