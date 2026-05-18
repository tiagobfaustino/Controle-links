import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { useTurma } from "@/contexts/turma";
import { getPb } from "@/lib/pocketbase";
import {
  formatDemandaShortDate,
  getDemandaDeadline,
  isDemandaVencida,
} from "@/lib/demanda";
import { parseTags } from "@/lib/tags";
import { buildTurmaFilter, isTurmaSchemaError } from "@/lib/turma-filter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorBanner, describeError } from "@/components/error-banner";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ExternalLink,
  ClipboardCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";

type Demanda = {
  id: string;
  titulo: string;
  linkForm: string;
  prazo: string;
  horaLimite: string;
  responsavel: string;
  ativa: boolean;
  tags?: string;
  observacao?: string;
};

type Cumprimento = {
  id: string;
  user: string;
  demanda: string;
};

function formatPrazo(prazoStr: string): string {
  return formatDemandaShortDate(prazoStr);
}

function hoursUntilDeadline(d: Demanda): number | null {
  const dl = getDemandaDeadline(d);
  if (!dl) return null;
  return Math.max(0, Math.ceil((dl.getTime() - Date.now()) / (1000 * 60 * 60)));
}

function exactHoursUntilDeadline(d: Demanda): number | null {
  const dl = getDemandaDeadline(d);
  if (!dl) return null;
  return (dl.getTime() - Date.now()) / (1000 * 60 * 60);
}

type Urgencia = "vencida" | "laranja" | "amarela" | "ok";

function getUrgencia(d: Demanda): Urgencia {
  if (isDemandaVencida(d)) return "vencida";
  const h = exactHoursUntilDeadline(d);
  if (h !== null && h < 12) return "laranja";
  if (h !== null && h <= 24) return "amarela";
  return "ok";
}

export default function MinhasPendenciasPage() {
  const { user } = useAuth();
  const { selectedTurmaId } = useTurma();
  const navigate = useNavigate();
  const myUserId = user?.id;

  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [cumprimentos, setCumprimentos] = useState<Cumprimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string>("");

  const fetchAll = useCallback(async () => {
    if (!myUserId) return;
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      const turmaFilter = buildTurmaFilter(selectedTurmaId);
      const loadData = (filterByTurma: boolean) => {
        const activeTurmaFilter = filterByTurma ? turmaFilter : "";
        const demandasFilter = ["ativa=true", activeTurmaFilter]
          .filter(Boolean)
          .join(" && ");

        return Promise.all([
          pb.collection("demandas").getFullList<Demanda>({
            filter: demandasFilter,
            sort: "prazo",
            requestKey: null,
          }),
          pb.collection("cumprimento").getFullList<Cumprimento>({
            filter: `user = "${myUserId}"`,
            requestKey: null,
          }),
        ]);
      };

      let d: Demanda[];
      let c: Cumprimento[];
      try {
        [d, c] = await loadData(!!turmaFilter);
      } catch (err) {
        if (!turmaFilter || !isTurmaSchemaError(err)) throw err;
        [d, c] = await loadData(false);
      }
      setDemandas(d);
      setCumprimentos(c);
      setError(null);
    } catch (err) {
      console.error("minhas-pendencias fetch", err);
      const { message, isAuthError } = describeError(err);
      if (isAuthError) {
        navigate("/login");
        return;
      }
      setError(message);
    }
  }, [myUserId, navigate, selectedTurmaId]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const cumpridosSet = useMemo(
    () => new Set(cumprimentos.map((c) => c.demanda)),
    [cumprimentos],
  );

  const pendentes = useMemo(() => {
    return demandas
      .filter((d) => !cumpridosSet.has(d.id))
      .map((d) => ({ d, urgencia: getUrgencia(d) }))
      .sort((a, b) => {
        const order = { vencida: 0, laranja: 1, amarela: 2, ok: 3 } as const;
        if (order[a.urgencia] !== order[b.urgencia]) {
          return order[a.urgencia] - order[b.urgencia];
        }
        return new Date(a.d.prazo).getTime() - new Date(b.d.prazo).getTime();
      });
  }, [demandas, cumpridosSet]);

  async function marcarCumprida(d: Demanda) {
    if (!myUserId) return;
    setMarking(d.id);
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      await pb.collection("cumprimento").create({
        user: myUserId,
        demanda: d.id,
        dataRegistro: new Date().toISOString().split("T")[0],
      });
      toast.success(`"${d.titulo}" marcada como cumprida`);
      await fetchAll();
    } catch (err) {
      console.error("marcar cumprida", err);
      const { message } = describeError(err);
      toast.error(`Erro ao marcar: ${message}`);
    } finally {
      setMarking("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="border-l-4 border-accent bg-card px-4 py-3 shadow-sm">
        <p className="tactical-heading">Foco individual</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.06em]">
          Minhas Pendências
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Demandas ativas que você ainda não cumpriu, ordenadas por urgência.
        </p>
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
            <div key={i} className="h-32 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : error ? null : pendentes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardCheck className="size-12 text-accent mb-4" />
            <p className="font-bold text-foreground">Tudo em dia!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Você cumpriu todas as demandas ativas.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/dashboard">Voltar ao dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendentes.map(({ d, urgencia }) => (
            <PendenciaCard
              key={d.id}
              demanda={d}
              urgencia={urgencia}
              marking={marking === d.id}
              onMarcar={() => marcarCumprida(d)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendenciaCard({
  demanda: d,
  urgencia,
  marking,
  onMarcar,
}: {
  demanda: Demanda;
  urgencia: Urgencia;
  marking: boolean;
  onMarcar: () => void;
}) {
  const h = hoursUntilDeadline(d);
  const tags = parseTags(d.tags);

  const borderClass =
    urgencia === "vencida"
      ? "border-l-destructive bg-red-50/50"
      : urgencia === "laranja"
        ? "border-l-orange-600 bg-orange-50/60"
        : urgencia === "amarela"
        ? "border-l-yellow-500 bg-yellow-50/60"
        : "border-l-green-600 bg-green-50/30";

  return (
    <Card className={cn("border-l-4", borderClass)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold uppercase tracking-[0.04em] leading-tight">
              {d.titulo}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Resp.: <strong>{d.responsavel || "—"}</strong>
            </p>
          </div>
          {urgencia === "vencida" ? (
            <Badge variant="destructive" className="shrink-0">
              <AlertTriangle className="size-3" />
              Vencida
            </Badge>
          ) : urgencia === "laranja" ? (
            <Badge className="shrink-0 bg-orange-600 text-white hover:bg-orange-600">
              <Clock className="size-3" />
              {h}h restantes
            </Badge>
          ) : urgencia === "amarela" ? (
            <Badge className="shrink-0 bg-yellow-400 text-foreground hover:bg-yellow-400">
              <Clock className="size-3" />
              {h}h restantes
            </Badge>
          ) : h !== null ? (
            <Badge variant="secondary" className="shrink-0">
              <Clock className="size-3" />
              {h >= 24 ? `${Math.round(h / 24)} dia(s)` : `${h}h`}
            </Badge>
          ) : null}
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Prazo: {formatPrazo(d.prazo)} às {d.horaLimite}
        </div>

        {d.observacao?.trim() && (
          <div className="rounded-md border border-border bg-background px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
              Observação
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {d.observacao.trim()}
            </p>
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {d.linkForm && (
            <Button asChild variant="outline" className="flex-1">
              <a href={d.linkForm} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                Abrir formulário
              </a>
            </Button>
          )}
          <Button
            type="button"
            onClick={onMarcar}
            disabled={marking}
            className="flex-1"
          >
            {marking ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Marcando...
              </span>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Já cumpri
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
