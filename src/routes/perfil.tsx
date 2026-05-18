import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { loadAuthFromCookie } from "@/lib/auth-cookie";
import { formatPhone } from "@/lib/phone";
import { toUpperPtBr } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, KeyRound, Save, UserRound } from "lucide-react";

type ProfileForm = {
  name: string;
  nomeFuncional: string;
  celular: string;
  email: string;
  senhaAtual: string;
};

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  GESTOR: "Gestor",
};

export default function PerfilPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    nomeFuncional: "",
    celular: "",
    email: "",
    senhaAtual: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: toUpperPtBr(user.name ?? ""),
      nomeFuncional: toUpperPtBr(user.nomeFuncional ?? ""),
      celular: formatPhone(user.celular ?? ""),
      email: user.email ?? "",
      senhaAtual: "",
    });
  }, [user]);

  function set(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) {
      navigate("/login");
      return;
    }

    if (!form.name.trim()) {
      setError("Informe seu nome completo.");
      return;
    }

    const emailChanged = form.email.trim() !== user.email;
    if (emailChanged && !form.senhaAtual) {
      setError("Informe sua senha atual para alterar o e-mail.");
      return;
    }

    setSaving(true);
    const pb = loadAuthFromCookie();

    try {
      const updated = await pb.collection("users").update(user.id, {
        name: toUpperPtBr(form.name.trim()),
        nomeFuncional: form.nomeFuncional.trim()
          ? toUpperPtBr(form.nomeFuncional.trim())
          : null,
        celular: form.celular.trim() || null,
        email: form.email.trim(),
      });

      if (emailChanged) {
        await pb.collection("users").authWithPassword(
          form.email.trim(),
          form.senhaAtual,
        );
      }

      if (pb.authStore.token) {
        pb.authStore.save(pb.authStore.token, pb.authStore.model ?? updated);
        document.cookie = pb.authStore.exportToCookie({ httpOnly: false });
      }

      setForm((prev) => ({ ...prev, senhaAtual: "" }));
      toast.success("Perfil atualizado");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao atualizar perfil.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="border-l-4 border-accent bg-card px-4 py-3 shadow-sm">
        <p className="tactical-heading">Conta do aluno</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black uppercase tracking-[0.06em]">
          <UserRound className="size-6 text-accent" />
          Meu perfil
        </h1>
      </div>

      <Card className="border-2 border-primary/70">
        <CardHeader className="border-b border-primary/40 bg-accent text-accent-foreground">
          <CardTitle className="uppercase tracking-[0.08em] text-primary">
            Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-white pt-1">
          <form onSubmit={submit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", toUpperPtBr(e.target.value))}
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomeFuncional">Nome funcional</Label>
                <Input
                  id="nomeFuncional"
                  value={form.nomeFuncional}
                  onChange={(e) =>
                    set("nomeFuncional", toUpperPtBr(e.target.value))
                  }
                  placeholder="Ex: FAUSTINO"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="celular">Celular</Label>
                <Input
                  id="celular"
                  inputMode="tel"
                  value={form.celular}
                  onChange={(e) => set("celular", formatPhone(e.target.value))}
                  placeholder="(31) 99999-9999"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  E-mail <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
            </div>

            {form.email.trim() !== (user?.email ?? "") && (
              <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
                <Label htmlFor="senhaAtual">Senha atual</Label>
                <Input
                  id="senhaAtual"
                  type="password"
                  autoComplete="current-password"
                  value={form.senhaAtual}
                  onChange={(e) => set("senhaAtual", e.target.value)}
                  placeholder="Obrigatória para alterar o e-mail"
                  required
                  disabled={saving}
                />
                <p className="text-xs font-medium text-amber-800">
                  Ao alterar o e-mail, ele passará a ser usado no próximo login.
                </p>
              </div>
            )}

            <div className="grid gap-3 rounded-md border border-input bg-muted/30 p-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Perfil
                </p>
                <div className="mt-1">
                  <Badge>{roleLabel[user?.role ?? ""] ?? user?.role}</Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Nº curso
                </p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {user?.numeroCurso ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Nº PM
                </p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {user?.numPM ?? "-"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Salvando...
                  </span>
                ) : (
                  <>
                    <Save className="size-4" />
                    Salvar perfil
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/alterar-senha">
                  <KeyRound className="size-4" />
                  Alterar senha
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
