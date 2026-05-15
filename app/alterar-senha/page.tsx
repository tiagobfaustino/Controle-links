"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
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
import { AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";

export default function AlterarSenhaPage() {
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

    setLoading(true);

    try {
      const res = await fetch("/api/auth/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaSenha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ geral: data.error ?? "Erro ao alterar a senha. Tente novamente." });
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 1500);
    } catch {
      setErrors({ geral: "Erro de conexão. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Controle de Links
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Primeiro acesso — altere sua senha
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>
            Por segurança, você precisa definir uma nova senha antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-10 text-green-600" />
              <p className="text-sm font-medium text-green-700">
                Senha alterada com sucesso! Redirecionando...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errors.geral && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
