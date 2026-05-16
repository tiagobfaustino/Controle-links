"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getPb } from "@/lib/pocketbase";
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
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // prazo from PocketBase is like "2026-05-20 00:00:00.000Z" — extract date part
  function extractDate(prazo?: string): string {
    if (!prazo) return "";
    return prazo.split(" ")[0] ?? prazo.split("T")[0] ?? "";
  }

  const [form, setForm] = useState({
    titulo: initial.titulo ?? "",
    linkForm: initial.linkForm ?? "",
    prazo: extractDate(initial.prazo),
    horaLimite: initial.horaLimite ?? "18:00",
    responsavel: initial.responsavel ?? "",
    celularResp: initial.celularResp ?? "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    // PocketBase date format: "YYYY-MM-DD 00:00:00.000Z"
    const prazoFormatted = form.prazo
      ? `${form.prazo} 00:00:00.000Z`
      : form.prazo;

    const payload = {
      titulo: form.titulo,
      linkForm: form.linkForm,
      prazo: prazoFormatted,
      horaLimite: form.horaLimite,
      responsavel: form.responsavel,
      celularResp: form.celularResp,
    };

    try {
      if (mode === "create") {
        await pb.collection("demandas").create({ ...payload, ativa: true });
        toast.success("Demanda criada!");
      } else {
        await pb.collection("demandas").update(initial.id!, payload);
        toast.success("Demanda atualizada!");
      }
      router.push("/demandas");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Nova Demanda" : "Editar Demanda"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Ex: Formulário de Inscrição"
                required
              />
            </div>

            <div className="space-y-1">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prazo">Prazo</Label>
                <Input
                  id="prazo"
                  type="date"
                  value={form.prazo}
                  onChange={(e) => set("prazo", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
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

            <div className="space-y-1">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={form.responsavel}
                onChange={(e) => set("responsavel", e.target.value)}
                placeholder="Nome do responsável"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="celularResp">Celular do Responsável</Label>
              <Input
                id="celularResp"
                value={form.celularResp}
                onChange={(e) => set("celularResp", e.target.value)}
                placeholder="(31) 99999-9999"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : mode === "create" ? "Criar Demanda" : "Salvar Alterações"}
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
