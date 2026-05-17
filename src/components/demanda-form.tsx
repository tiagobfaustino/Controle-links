import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { getPb } from "@/lib/pocketbase";
import { formatPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DemandaFormProps = {
  initial?: {
    id?: string;
    titulo?: string;
    linkForm?: string;
    prazo?: string;
    horaLimite?: string;
    responsavel?: string;
    celularResp?: string;
  };
  mode: "create" | "edit";
};

export function DemandaForm({ initial = {}, mode }: DemandaFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  function extractDate(prazo?: string): string {
    if (!prazo) return "";
    return prazo.split(" ")[0] ?? prazo.split("T")[0] ?? "";
  }

  function formatInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function setPrazoRapido(daysFromToday: number) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromToday);
    set("prazo", formatInputDate(date));
  }

  const [form, setForm] = useState({
    titulo: initial.titulo ?? "",
    linkForm: initial.linkForm ?? "",
    prazo: extractDate(initial.prazo),
    horaLimite: initial.horaLimite ?? "18:00",
  });

  const userDisplayName = user?.nomeFuncional || user?.name || "";
  const responsavel = mode === "edit" && initial.responsavel
    ? initial.responsavel
    : userDisplayName;
  const celularResp = formatPhone(
    mode === "edit" && initial.celularResp ? initial.celularResp : user?.celular ?? "",
  );

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    const prazoFormatted = form.prazo
      ? `${form.prazo} 00:00:00.000Z`
      : form.prazo;

    const payload = {
      titulo: form.titulo,
      linkForm: form.linkForm,
      prazo: prazoFormatted,
      horaLimite: form.horaLimite,
      responsavel,
      celularResp,
    };

    try {
      if (mode === "create") {
        await pb.collection("demandas").create({ ...payload, ativa: true });
        toast.success("Demanda criada!");
      } else {
        await pb.collection("demandas").update(initial.id!, payload);
        toast.success("Demanda atualizada!");
      }
      navigate("/demandas");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-2 border-primary/70">
        <CardHeader className="border-b border-primary/40 bg-accent text-accent-foreground">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary/75">Registro operacional</p>
          <CardTitle className="uppercase tracking-[0.08em] text-primary">
            {mode === "create" ? "Nova Demanda" : "Editar Demanda"}
          </CardTitle>
        </CardHeader>
        <CardContent className="bg-white pt-1">
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Ex: Formulário de Inscrição"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkForm">Link do Formulário</Label>
              <Input
                id="linkForm"
                type="url"
                value={form.linkForm}
                onChange={(e) => set("linkForm", e.target.value)}
                placeholder="https://forms.gle/..."
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="prazo">Prazo</Label>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setPrazoRapido(0)}
                    >
                      Hoje
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => setPrazoRapido(1)}
                    >
                      Amanhã
                    </Button>
                  </div>
                </div>
                <Input
                  id="prazo"
                  type="date"
                  value={form.prazo}
                  onChange={(e) => set("prazo", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaLimite">Hora-limite</Label>
                <Input
                  id="horaLimite"
                  type="time"
                  value={form.horaLimite}
                  onChange={(e) => set("horaLimite", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsável pelo link</Label>
              <div className="grid grid-cols-1 gap-3 rounded-md border border-input bg-muted/30 p-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Nome
                  </p>
                  <p className="mt-1 min-h-6 text-[15px] font-semibold text-foreground">
                    {responsavel || "Usuário autenticado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Telefone
                  </p>
                  <p className="mt-1 min-h-6 text-[15px] font-semibold text-foreground">
                    {celularResp || "Não informado"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : mode === "create" ? "Criar Demanda" : "Salvar Alterações"}
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
