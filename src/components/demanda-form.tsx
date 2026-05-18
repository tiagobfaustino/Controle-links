import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { useTurma } from "@/contexts/turma";
import { getPb } from "@/lib/pocketbase";
import { getDemandaDatePart } from "@/lib/demanda";
import { formatPhone } from "@/lib/phone";
import { parseTags, serializeTags, collectAllTags } from "@/lib/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

type DemandaFormProps = {
  initial?: {
    id?: string;
    titulo?: string;
    linkForm?: string;
    prazo?: string;
    horaLimite?: string;
    responsavel?: string;
    celularResp?: string;
    tags?: string;
    observacao?: string;
  };
  mode: "create" | "edit";
};

function RequiredMark() {
  return (
    <span className="ml-1 text-destructive" aria-label="obrigatório">
      *
    </span>
  );
}

function describeSaveError(err: unknown): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "data" in err &&
    typeof (err as { data?: unknown }).data === "object" &&
    (err as { data?: unknown }).data !== null
  ) {
    const data = (err as { data: { data?: Record<string, { message?: string }> } }).data;
    const fieldErrors = Object.entries(data.data ?? {})
      .map(([field, value]) => `${field}: ${value.message ?? "valor inválido"}`)
      .join("; ");

    if (fieldErrors) return fieldErrors;
  }

  return err instanceof Error ? err.message : "Erro ao salvar";
}

export function DemandaForm({ initial = {}, mode }: DemandaFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedTurmaId } = useTurma();
  const [loading, setLoading] = useState(false);

  function extractDate(prazo?: string): string {
    if (!prazo) return "";
    return getDemandaDatePart(prazo);
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
    observacao: initial.observacao ?? "",
  });

  const [tags, setTags] = useState<string[]>(parseTags(initial.tags));
  const [tagDraft, setTagDraft] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  useEffect(() => {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);
    pb.collection("demandas")
      .getFullList<{ tags?: string }>({
        fields: "tags",
        requestKey: null,
      })
      .then((list) => setSuggestedTags(collectAllTags(list)))
      .catch(() => {
        // best-effort: tag autocomplete não bloqueia o formulário
      });
  }, []);

  function addTag(raw: string) {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return;
    setTags((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setTagDraft("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagDraft);
    } else if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  }

  const availableSuggestions = suggestedTags
    .filter((s) => !tags.includes(s))
    .filter((s) => !tagDraft || s.startsWith(tagDraft.toLowerCase()))
    .slice(0, 6);

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
      titulo: form.titulo.trim(),
      linkForm: form.linkForm.trim(),
      prazo: prazoFormatted,
      horaLimite: form.horaLimite,
      responsavel,
      celularResp,
      tags: serializeTags(tags),
      observacao: form.observacao.trim(),
    };

    try {
      if (mode === "create") {
        await pb.collection("demandas").create({
          ...payload,
          ativa: true,
          ...(selectedTurmaId ? { turma: selectedTurmaId } : {}),
        });
        toast.success("Demanda criada!");
      } else {
        await pb.collection("demandas").update(initial.id!, payload);
        toast.success("Demanda atualizada!");
      }
      navigate("/demandas");
    } catch (err: unknown) {
      toast.error(describeSaveError(err));
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
            <p className="text-xs font-medium text-muted-foreground">
              Campos marcados com <span className="font-bold text-destructive">*</span>{" "}
              são obrigatórios.
            </p>

            <div className="space-y-2">
              <Label htmlFor="titulo">
                Título
                <RequiredMark />
              </Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={(e) => set("titulo", e.target.value)}
                placeholder="Ex: Formulário de Inscrição"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkForm">
                Link do Formulário{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                id="linkForm"
                type="url"
                value={form.linkForm}
                onChange={(e) => set("linkForm", e.target.value)}
                placeholder="https://forms.gle/..."
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="prazo">
                    Prazo
                    <RequiredMark />
                  </Label>
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
                <Label htmlFor="horaLimite">
                  Hora-limite
                  <RequiredMark />
                </Label>
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
              <Label htmlFor="tags">
                Tags{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (opcional — Enter ou vírgula para adicionar)
                </span>
              </Label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:opacity-70"
                      aria-label={`Remover tag ${t}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="tags"
                  type="text"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={onTagKeyDown}
                  onBlur={() => tagDraft && addTag(tagDraft)}
                  placeholder={tags.length === 0 ? "Ex: form, prova, reuniao" : ""}
                  className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              {availableSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-xs font-medium text-muted-foreground mr-1">
                    Sugestões:
                  </span>
                  {availableSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addTag(s)}
                      className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacao">
                Observação{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <textarea
                id="observacao"
                value={form.observacao}
                onChange={(e) => set("observacao", e.target.value)}
                placeholder="Instruções para o cumprimento da demanda"
                rows={4}
                className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Responsável pelo link</Label>
              <div className="grid grid-cols-1 gap-3 rounded-md border border-input bg-muted/30 p-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Nome
                  </p>
                  <p className="mt-1 min-h-6 text-[15px] font-semibold text-foreground">
                    {responsavel || "Aluno autenticado"}
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
