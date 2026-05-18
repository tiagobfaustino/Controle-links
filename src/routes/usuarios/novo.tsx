import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getPb } from "@/lib/pocketbase";
import { formatPhone } from "@/lib/phone";
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

export default function NovoUsuarioPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    nomeFuncional: "",
    email: "",
    role: "GESTOR",
    celular: "",
    numeroCurso: "",
    numPM: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      const payload: Record<string, unknown> = {
        email: form.email,
        password: "tpcefs2026",
        passwordConfirm: "tpcefs2026",
        name: form.nome,
        role: form.role,
        firstLogin: true,
        emailVisibility: true,
      };

      if (form.nomeFuncional) payload.nomeFuncional = form.nomeFuncional;
      if (form.celular) payload.celular = form.celular;
      if (form.numeroCurso) payload.numeroCurso = Number(form.numeroCurso);
      if (form.numPM) payload.numPM = Number(form.numPM);

      await pb.collection("users").create(payload);
      toast.success("Aluno criado com senha provisória tpcefs2026");
      navigate("/usuarios");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar aluno";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card className="border-2 border-primary/70">
        <CardHeader className="border-b border-primary/40 bg-accent text-accent-foreground">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary/75">Cadastro de efetivo</p>
          <CardTitle className="uppercase tracking-[0.08em] text-primary">Novo Aluno</CardTitle>
          <p className="text-sm font-medium text-muted-foreground">
            A senha provisória será <strong>tpcefs2026</strong>. O aluno deverá alterá-la no primeiro acesso.
          </p>
        </CardHeader>
        <CardContent className="bg-white pt-1">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numeroCurso">Nº do Curso</Label>
                <Input
                  id="numeroCurso"
                  type="number"
                  value={form.numeroCurso}
                  onChange={(e) => set("numeroCurso", e.target.value)}
                  placeholder="Ex.: 751"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numPM">Nº PM</Label>
                <Input
                  id="numPM"
                  type="number"
                  value={form.numPM}
                  onChange={(e) => set("numPM", e.target.value)}
                  placeholder="Ex.: 1596030"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex.: ALENCAR CAMPOS DA SILVA"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomeFuncional">
                Nome funcional <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="nomeFuncional"
                value={form.nomeFuncional}
                onChange={(e) => set("nomeFuncional", e.target.value)}
                placeholder="Ex.: ALENCAR"
              />
              <p className="text-xs text-muted-foreground">
                Parte do nome completo que aparece em <strong>negrito</strong> no dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="celular">Celular</Label>
              <Input
                id="celular"
                inputMode="tel"
                value={form.celular}
                onChange={(e) => set("celular", formatPhone(e.target.value))}
                placeholder="(31) 9999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GESTOR">Gestor</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Gestores podem incluir e gerenciar demandas e confirmar cumprimento. Admins adicionalmente gerenciam alunos.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Criando..." : "Criar Aluno"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
