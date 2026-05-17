import { useState } from "react";
import { Link } from "react-router-dom";
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
import { AlertCircle, ArrowLeft, CheckCircle2, Send } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const pb = getPb();
      await pb.collection("users").requestPasswordReset(email);
      // Sempre mostrar sucesso, independente do e-mail existir.
      // Evita enumeração de usuários.
      setSent(true);
    } catch (err: unknown) {
      // PocketBase responde 204 mesmo para e-mail inexistente,
      // então qualquer erro aqui é de rede/SMTP, não de validação.
      console.error("requestPasswordReset", err);
      setError(
        "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.",
      );
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
      </div>

      <Card className="w-full max-w-sm border-2 border-primary/70">
        <CardHeader className="border-b border-primary/40 bg-accent text-accent-foreground">
          <CardTitle className="uppercase tracking-[0.08em] text-primary">
            Esqueci minha senha
          </CardTitle>
          <CardDescription>
            Informe seu e-mail cadastrado para receber o link de redefinição.
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white pt-1">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-accent" />
              <p className="text-sm font-bold text-primary">
                E-mail enviado!
              </p>
              <p className="text-sm text-muted-foreground">
                Se o endereço <strong className="break-all">{email}</strong> estiver
                cadastrado, você receberá em alguns minutos um link para
                redefinir sua senha. O link expira em 1 hora.
              </p>
              <p className="text-xs text-muted-foreground">
                Não chegou? Verifique a pasta de spam.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link to="/login">
                  <ArrowLeft className="size-4" />
                  Voltar para o login
                </Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <Button type="submit" className="mt-2 w-full h-9" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="size-4" />
                    Enviar link de redefinição
                  </span>
                )}
              </Button>

              <Link
                to="/login"
                className="text-center text-xs font-medium text-muted-foreground hover:text-primary underline"
              >
                Voltar para o login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
