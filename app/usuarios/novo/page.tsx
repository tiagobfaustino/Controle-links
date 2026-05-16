"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getPb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Participante = { id: string; numeroCurso: number; nome: string };

export default function NovoUsuarioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    role: "PARTICIPANTE",
    participanteId: "",
  });

  useEffect(() => {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    pb.collection("participantes")
      .getFullList<Participante>({ sort: "numeroCurso" })
      .then(setParticipantes)
      .catch(() => {});
  }, []);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      await pb.collection("users").create({
        email: form.email,
        password: "tpcefs2026",
        passwordConfirm: "tpcefs2026",
        name: form.nome,
        role: form.role,
        firstLogin: true,
        participante: form.role === "PARTICIPANTE" && form.participanteId ? form.participanteId : undefined,
        emailVisibility: true,
      });
      toast.success("Usuário criado com senha provisória tpcefs2026");
      router.push("/usuarios");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar usuário";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Novo Usuário</CardTitle>
          <p className="text-sm text-muted-foreground">
            A senha provisória será <strong>tpcefs2026</strong>. O usuário deverá alterá-la no primeiro acesso.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Perfil</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="GESTOR">Gestor</SelectItem>
                  <SelectItem value="PARTICIPANTE">Participante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === "PARTICIPANTE" && (
              <div className="space-y-1">
                <Label>Participante vinculado</Label>
                <Select value={form.participanteId} onValueChange={(v) => set("participanteId", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar participante..." />
                  </SelectTrigger>
                  <SelectContent>
                    {participantes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.numeroCurso} — {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vincula este login ao participante para que ele confirme o próprio cumprimento.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Criando..." : "Criar Usuário"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
