import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { getPb } from "@/lib/pocketbase";
import {
  formatDemandaDate,
  getDemandaDeadline,
  isDemandaVencida,
} from "@/lib/demanda";
import { parseTags } from "@/lib/tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBanner, describeError } from "@/components/error-banner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Power, ClipboardList, Trash2, FileText, History, CalendarDays } from "lucide-react";

type Demanda = {
  id: string;
  titulo: string;
  linkForm: string;
  prazo: string;
  horaLimite: string;
  responsavel: string;
  celularResp: string;
  ativa: boolean;
  tags?: string;
  observacao?: string;
};

type Usuario = {
  id: string;
  name: string;
  nomeFuncional?: string;
  celular?: string;
  numeroCurso?: number;
  role?: string;
  disabled?: boolean;
};

type Cumprimento = {
  id: string;
  user: string;
  demanda: string;
  dataRegistro?: string;
};

type JsPdfDocument = import("jspdf").jsPDF & {
  lastAutoTable?: { finalY: number };
};

function formatDate(iso: string) {
  return formatDemandaDate(iso);
}

function normalizeIdentity(value?: string): string {
  return (value || "").trim().toUpperCase();
}

function formatDateTime(date = new Date()) {
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function sanitizeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getResponsavelDisplayName(d: Demanda, usuarios: Usuario[]): string {
  const responsavel = normalizeIdentity(d.responsavel);
  if (!responsavel) return "";

  const usuario = usuarios.find(
    (u) =>
      responsavel === normalizeIdentity(u.nomeFuncional) ||
      responsavel === normalizeIdentity(u.name),
  );

  return usuario?.nomeFuncional || d.responsavel;
}

type CardUrgencia = "inativa" | "vencida" | "laranja" | "amarela" | "ok";

function exactHoursUntilDeadline(d: Demanda): number | null {
  const deadline = getDemandaDeadline(d);
  if (!deadline) return null;
  return (deadline.getTime() - Date.now()) / (1000 * 60 * 60);
}

function getCardUrgencia(d: Demanda): CardUrgencia {
  if (!d.ativa) return "inativa";
  if (isDemandaVencida(d)) return "vencida";
  const h = exactHoursUntilDeadline(d);
  if (h !== null && h < 12) return "laranja";
  if (h !== null && h <= 24) return "amarela";
  return "ok";
}

export default function DemandasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Demanda | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState("");

  function canManageDemanda(d: Demanda): boolean {
    if (!user) return false;
    if (user.role === "ADMIN") return true;

    const responsavel = normalizeIdentity(d.responsavel);
    return (
      responsavel !== "" &&
      (responsavel === normalizeIdentity(user.nomeFuncional) ||
        responsavel === normalizeIdentity(user.name))
    );
  }

  const fetchAll = useCallback(async () => {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      const [d, u] = await Promise.all([
        pb.collection("demandas").getFullList<Demanda>({
          sort: "-prazo",
          requestKey: null,
        }),
        pb.collection("users").getFullList<Usuario>({
          sort: "numeroCurso,name",
          requestKey: null,
        }),
      ]);
      setDemandas(d);
      setUsuarios(u);
      setError(null);
    } catch (err) {
      console.error("demandas fetch", err);
      const { message, isAuthError } = describeError(err);
      if (isAuthError) {
        navigate("/login");
        return;
      }
      setError(message);
    }
  }, [navigate]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  async function toggleAtiva(d: Demanda) {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      await pb.collection("demandas").update(d.id, { ativa: !d.ativa });
      setDemandas((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, ativa: !d.ativa } : x))
      );
      if (d.ativa) {
        toast.error("Demanda desativada");
      } else {
        toast.success("Demanda ativada");
      }
    } catch (err) {
      console.error("toggle demanda", err);
      const { message } = describeError(err);
      toast.error(`Erro ao alterar status: ${message}`);
    }
  }

  async function deleteDemanda(d: Demanda) {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);
    setDeleting(true);

    try {
      // Cumprimentos e log são apagados por cascade (migrations 700/800).
      await pb.collection("demandas").delete(d.id);

      setDemandas((prev) => prev.filter((x) => x.id !== d.id));
      setDeleteTarget(null);
      toast.error("Demanda excluída");
    } catch (err) {
      console.error("delete demanda", err);
      const { message } = describeError(err);
      toast.error(`Erro ao excluir demanda: ${message}`);
    } finally {
      setDeleting(false);
    }
  }

  async function generatePdf(d: Demanda) {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);
    setReporting(d.id);

    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const cumprimentos = await pb.collection("cumprimento").getFullList<Cumprimento>({
        filter: `demanda = "${d.id}"`,
        requestKey: null,
      });

      const operacionais = usuarios.filter(
        (u) => u.role !== "ADMIN" && u.disabled !== true,
      );
      const cumpridosIds = new Set(cumprimentos.map((c) => c.user));
      const cumpridos = operacionais.filter((u) => cumpridosIds.has(u.id));
      const pendentes = operacionais.filter((u) => !cumpridosIds.has(u.id));
      const total = operacionais.length;
      const percentual = total > 0 ? Math.round((cumpridos.length / total) * 100) : 0;
      const percentualPendente = total > 0 ? 100 - percentual : 0;
      const responsavel = getResponsavelDisplayName(d, usuarios);
      const status = !d.ativa ? "Inativa" : isDemandaVencida(d) ? "Vencida" : "Ativa";

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 14;

      doc.setTextColor(55, 52, 53);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Relatorio de Demanda", margin, 16);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Emitido em: ${formatDateTime()}`, margin, 24);

      autoTable(doc, {
        startY: 30,
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [160, 143, 99], textColor: [23, 22, 21] },
        body: [
          ["Titulo", d.titulo],
          ["Link", d.linkForm || "Sem link externo"],
          ["Responsavel", responsavel || d.responsavel],
          ["Prazo", `${formatDate(d.prazo)} as ${d.horaLimite}`],
          ["Status", status],
          ["Total de usuarios", String(total)],
          ["Cumpridos", `${cumpridos.length} (${percentual}%)`],
          ["Pendentes", `${pendentes.length} (${percentualPendente}%)`],
        ],
      });

      const afterSummaryY = (doc as JsPdfDocument).lastAutoTable?.finalY ?? 70;

      autoTable(doc, {
        startY: afterSummaryY + 8,
        theme: "striped",
        head: [["Pendentes", "Nome funcional", "Telefone"]],
        body:
          pendentes.length > 0
            ? pendentes.map((u) => [
                u.numeroCurso ? String(u.numeroCurso) : "-",
                u.nomeFuncional || u.name,
                u.celular || "-",
              ])
            : [["-", "Nenhum usuario pendente", "-"]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [171, 35, 40], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 92 },
          2: { cellWidth: 52 },
        },
      });

      const afterPendingY = (doc as JsPdfDocument).lastAutoTable?.finalY ?? afterSummaryY + 40;

      autoTable(doc, {
        startY: afterPendingY + 8,
        theme: "striped",
        head: [["Cumpridos", "Nome funcional"]],
        body:
          cumpridos.length > 0
            ? cumpridos.map((u) => [
                u.numeroCurso ? String(u.numeroCurso) : "-",
                u.nomeFuncional || u.name,
              ])
            : [["-", "Nenhum usuario cumpriu ainda"]],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 144 },
        },
      });

      let chartY = ((doc as JsPdfDocument).lastAutoTable?.finalY ?? afterPendingY + 40) + 12;
      if (chartY > 245) {
        doc.addPage();
        chartY = 18;
      }

      const barX = margin;
      const barWidth = 150;
      const barHeight = 10;
      const cumpridosWidth = total > 0 ? (barWidth * cumpridos.length) / total : 0;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(55, 52, 53);
      doc.text("Grafico de cumprimento", barX, chartY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Cumpridos: ${cumpridos.length} (${percentual}%)`, barX, chartY + 8);
      doc.text(`Pendentes: ${pendentes.length} (${percentualPendente}%)`, barX + 80, chartY + 8);

      doc.setDrawColor(180, 170, 130);
      doc.setFillColor(171, 35, 40);
      doc.rect(barX, chartY + 14, barWidth, barHeight, "FD");
      doc.setFillColor(46, 125, 50);
      if (cumpridosWidth > 0) {
        doc.rect(barX, chartY + 14, cumpridosWidth, barHeight, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      if (cumpridosWidth >= 18) {
        doc.text(`${percentual}%`, barX + cumpridosWidth / 2, chartY + 21, {
          align: "center",
        });
      }
      if (barWidth - cumpridosWidth >= 18) {
        doc.text(`${percentualPendente}%`, barX + cumpridosWidth + (barWidth - cumpridosWidth) / 2, chartY + 21, {
          align: "center",
        });
      }

      doc.save(`relatorio-${sanitizeFilename(d.titulo || "demanda")}.pdf`);
      toast.success("Relatório gerado");
    } catch {
      toast.error("Erro ao gerar relatório");
    } finally {
      setReporting("");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4 border-l-4 border-accent bg-card px-4 py-3 shadow-sm">
        <div>
          <p className="tactical-heading">Controle de missão</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.06em]">Demandas</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/demandas/calendario">
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendário
            </Link>
          </Button>
          <Button asChild>
            <Link to="/demandas/nova">
              <Plus className="h-4 w-4 mr-2" />
              Nova Demanda
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchAll().finally(() => setLoading(false));
          }}
          retrying={loading}
        />
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : error ? null : demandas.length === 0 ? (
        <div className="military-panel flex flex-col items-center justify-center rounded-md py-16 text-center">
          <ClipboardList className="mb-4 size-12 text-muted-foreground/50" />
          <p className="font-bold text-muted-foreground">
            Nenhuma demanda cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {demandas.map((d) => (
            <DemandaCard
              key={d.id}
              demanda={d}
              usuarios={usuarios}
              canManage={canManageDemanda(d)}
              onToggle={toggleAtiva}
              onDelete={() => setDeleteTarget(d)}
              onReport={() => generatePdf(d)}
              reporting={reporting === d.id}
            />
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="uppercase tracking-[0.08em]">
              Excluir demanda
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A demanda <strong>{deleteTarget?.titulo}</strong> será excluída junto com
            as confirmações já registradas. Essa ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteDemanda(deleteTarget)}
              disabled={deleting}
              className="flex-1"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DemandaCard({
  demanda: d,
  usuarios,
  canManage,
  onToggle,
  onDelete,
  onReport,
  reporting,
}: {
  demanda: Demanda;
  usuarios: Usuario[];
  canManage: boolean;
  onToggle: (d: Demanda) => void;
  onDelete: () => void;
  onReport: () => void;
  reporting: boolean;
}) {
  const urgencia = getCardUrgencia(d);
  const badgeClass =
    urgencia === "laranja"
      ? "bg-orange-600 text-white hover:bg-orange-600"
      : urgencia === "amarela"
        ? "bg-yellow-400 text-foreground hover:bg-yellow-400"
        : urgencia === "ok"
          ? "bg-green-700 text-white hover:bg-green-700"
          : undefined;
  const statusLabel =
    urgencia === "inativa"
      ? "Inativa"
      : urgencia === "vencida"
        ? "Vencida"
        : "Ativa";

  return (
    <Card
      className={
        urgencia === "inativa"
          ? "border-l-4 border-l-destructive bg-red-50/80"
          : urgencia === "vencida"
            ? "border-l-4 border-l-destructive bg-red-50/80"
            : urgencia === "laranja"
              ? "border-l-4 border-l-orange-600 bg-orange-50/80"
              : urgencia === "amarela"
                ? "border-l-4 border-l-yellow-500 bg-yellow-50/80"
            : "border-l-4 border-l-green-700 bg-green-50/80"
      }
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base uppercase tracking-[0.04em]">
                {d.titulo}
              </CardTitle>
              <Badge
                variant={urgencia === "inativa" ? "secondary" : urgencia === "vencida" ? "destructive" : "default"}
                className={badgeClass}
              >
                {statusLabel}
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              Prazo: {formatDate(d.prazo)} às {d.horaLimite} — Resp.:{" "}
              {getResponsavelDisplayName(d, usuarios)}
            </p>
            {d.observacao?.trim() && (
              <div className="mt-2 rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                  Observação
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {d.observacao.trim()}
                </p>
              </div>
            )}
            {parseTags(d.tags).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {parseTags(d.tags).map((t) => (
                  <span
                    key={t}
                    className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            {d.linkForm ? (
              <a
                href={d.linkForm}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-sm font-medium text-primary hover:text-accent hover:underline break-all"
              >
                {d.linkForm}
              </a>
            ) : (
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Sem link externo - confirmação feita apenas no app.
              </p>
            )}
          </div>
          {canManage && (
            <div className="flex gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                asChild
                title="Ver logs de cumprimento"
                className="gap-1.5 border-primary/30 text-primary hover:bg-secondary"
              >
                <Link to={`/demandas/${d.id}/historico`}>
                  <History className="h-4 w-4" />
                  Logs
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onReport}
                title="Gerar relatório PDF"
                disabled={reporting}
                className="border border-primary/30 text-primary hover:bg-secondary"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to={`/demandas/${d.id}`}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggle(d)}
                title={d.ativa ? "Desativar" : "Ativar"}
                className={
                  d.ativa
                    ? "border border-green-700/40 text-green-800 hover:bg-green-100 hover:text-green-900"
                    : "border border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                }
              >
                <Power className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                title="Excluir"
                className="border border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
