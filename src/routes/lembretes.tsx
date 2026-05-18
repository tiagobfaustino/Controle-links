import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { useTurma } from "@/contexts/turma";
import { getPb } from "@/lib/pocketbase";
import { getDemandaDeadline, isDemandaVencida } from "@/lib/demanda";
import { buildTurmaFilter, isTurmaSchemaError } from "@/lib/turma-filter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBanner, describeError } from "@/components/error-banner";
import { cn } from "@/lib/utils";
import { MessageCircle, ClipboardList, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";

type Usuario = {
  id: string;
  name: string;
  nomeFuncional?: string;
  email?: string;
  celular?: string;
  numeroCurso?: number;
  role: string;
  disabled?: boolean;
};

type Demanda = {
  id: string;
  titulo: string;
  linkForm: string;
  prazo: string;
  horaLimite: string;
  responsavel: string;
  ativa: boolean;
  observacao?: string;
};

type Cumprimento = {
  id: string;
  user: string;
  demanda: string;
};

function normalizeIdentity(value?: string): string {
  return (value || "").trim().toUpperCase();
}

function formatWhatsApp(celular: string): string {
  return celular.replace(/\D/g, "");
}

function formatPrazo(prazoStr: string): string {
  const d = new Date(prazoStr);
  if (isNaN(d.getTime())) return prazoStr;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function isUsuarioOperacional(u: Usuario): boolean {
  return u.role !== "ADMIN" && u.disabled !== true;
}

function isResponsavel(d: Demanda, user: { name: string; nomeFuncional: string }): boolean {
  const r = normalizeIdentity(d.responsavel);
  if (!r) return false;
  return r === normalizeIdentity(user.nomeFuncional) || r === normalizeIdentity(user.name);
}

function hoursUntilDeadline(d: Demanda): number | null {
  const dl = getDemandaDeadline(d);
  if (!dl) return null;
  return Math.round((dl.getTime() - Date.now()) / (1000 * 60 * 60));
}

function buildPendingMessage(
  pendente: Usuario,
  demanda: Demanda,
): string {
  const nome =
    (pendente.nomeFuncional || "").trim() ||
    (pendente.name || "").split(" ")[0] ||
    "olá";
  const instrucao = demanda.linkForm
    ? `Link: ${demanda.linkForm}\n\nPor favor confirme o envio.`
    : "Esta demanda não possui link externo. Por favor, acesse o app e confirme ciência/cumprimento.";
  const observacao = demanda.observacao?.trim()
    ? `\n\nObservação: ${demanda.observacao.trim()}`
    : "";

  return `Olá ${nome}, lembrete: você ainda tem a demanda "${demanda.titulo}" pendente.\n\nPrazo: ${formatPrazo(demanda.prazo)} às ${demanda.horaLimite}${observacao}\n${instrucao}`;
}

function buildWaLink(pendente: Usuario, demanda: Demanda): string | null {
  if (!pendente.celular) return null;
  const msg = buildPendingMessage(pendente, demanda);
  return `https://wa.me/55${formatWhatsApp(pendente.celular)}?text=${encodeURIComponent(msg)}`;
}

type DemandaComPendentes = {
  demanda: Demanda;
  pendentes: Usuario[];
  total: number;
  horasAteVencimento: number | null;
};

export default function LembretesPage() {
  const { user } = useAuth();
  const { selectedTurmaId } = useTurma();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN";

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [cumprimentos, setCumprimentos] = useState<Cumprimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"mine" | "all">(isAdmin ? "all" : "mine");

  const fetchAll = useCallback(async () => {
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
          pb.collection("users").getFullList<Usuario>({
            sort: "numeroCurso,name",
            filter: activeTurmaFilter || undefined,
            requestKey: null,
          }),
          pb.collection("demandas").getFullList<Demanda>({
            filter: demandasFilter,
            sort: "prazo",
            requestKey: null,
          }),
          pb.collection("cumprimento").getFullList<Cumprimento>({
            requestKey: null,
          }),
        ]);
      };

      let u: Usuario[];
      let d: Demanda[];
      let c: Cumprimento[];
      try {
        [u, d, c] = await loadData(!!turmaFilter);
      } catch (err) {
        if (!turmaFilter || !isTurmaSchemaError(err)) throw err;
        [u, d, c] = await loadData(false);
      }
      setUsuarios(u);
      setDemandas(d);
      setCumprimentos(c);
      setError(null);
    } catch (err) {
      console.error("lembretes fetch", err);
      const { message, isAuthError } = describeError(err);
      if (isAuthError) {
        navigate("/login");
        return;
      }
      setError(message);
    }
  }, [navigate, selectedTurmaId]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const items: DemandaComPendentes[] = useMemo(() => {
    const operacionais = usuarios.filter(isUsuarioOperacional);
    const cumpridosByDemanda = new Map<string, Set<string>>();
    for (const c of cumprimentos) {
      if (!cumpridosByDemanda.has(c.demanda)) {
        cumpridosByDemanda.set(c.demanda, new Set());
      }
      cumpridosByDemanda.get(c.demanda)!.add(c.user);
    }

    const filteredDemandas =
      filter === "mine" && user
        ? demandas.filter((d) =>
            isResponsavel(d, {
              name: user.name,
              nomeFuncional: user.nomeFuncional,
            }),
          )
        : demandas;

    return filteredDemandas
      .map((d) => {
        const cumpridos = cumpridosByDemanda.get(d.id) ?? new Set<string>();
        const pendentes = operacionais.filter((u) => !cumpridos.has(u.id));
        return {
          demanda: d,
          pendentes,
          total: operacionais.length,
          horasAteVencimento: hoursUntilDeadline(d),
        };
      })
      .filter((x) => x.pendentes.length > 0)
      .sort((a, b) => {
        const ha = a.horasAteVencimento ?? Infinity;
        const hb = b.horasAteVencimento ?? Infinity;
        return ha - hb;
      });
  }, [demandas, usuarios, cumprimentos, filter, user]);

  async function copyAllLinks(item: DemandaComPendentes) {
    const lines = item.pendentes.map((p) => {
      const link = buildWaLink(p, item.demanda);
      const nome = p.nomeFuncional || p.name;
      return link ? `${nome}: ${link}` : `${nome}: (sem celular)`;
    });
    const text = `Pendentes — ${item.demanda.titulo}\n\n${lines.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${item.pendentes.length} links copiados`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  const totalPendentes = items.reduce((acc, x) => acc + x.pendentes.length, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="border-l-4 border-accent bg-card px-4 py-3 shadow-sm">
        <p className="tactical-heading">Cobrança operacional</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.06em]">
          Lembretes
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Demandas ativas com pendentes, ordenadas pelo prazo mais próximo. Cada
          link abre o WhatsApp com mensagem pré-formatada.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "mine" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("mine")}
          >
            Minhas demandas
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todas
          </Button>
        </div>
        <div className="ml-auto text-sm font-bold text-muted-foreground">
          {items.length} demanda{items.length === 1 ? "" : "s"} ·{" "}
          {totalPendentes} pendente{totalPendentes === 1 ? "" : "s"}
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
            <div key={i} className="h-32 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : error ? null : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="size-12 text-accent mb-4" />
            <p className="text-muted-foreground font-medium">
              Sem pendentes{filter === "mine" ? " nas suas demandas" : ""}.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === "mine" && !isAdmin
                ? "Verifique a aba 'Todas' para ver pendentes de outros responsáveis."
                : "Tudo em dia."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <DemandaLembreteCard
              key={item.demanda.id}
              item={item}
              onCopyAll={() => copyAllLinks(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DemandaLembreteCard({
  item,
  onCopyAll,
}: {
  item: DemandaComPendentes;
  onCopyAll: () => void;
}) {
  const { demanda, pendentes, total, horasAteVencimento } = item;
  const vencida = isDemandaVencida(demanda);
  const urgente =
    !vencida &&
    horasAteVencimento !== null &&
    horasAteVencimento >= 0 &&
    horasAteVencimento <= 24;

  const borderClass = vencida
    ? "border-l-destructive"
    : urgente
      ? "border-l-amber-600"
      : "border-l-primary";

  const cumpridos = total - pendentes.length;
  const pct = total > 0 ? Math.round((cumpridos / total) * 100) : 0;

  return (
    <Card className={cn("border-l-4", borderClass)}>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base uppercase tracking-[0.04em]">
              {demanda.titulo}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Prazo: {formatPrazo(demanda.prazo)} às {demanda.horaLimite} ·{" "}
              Resp.: <strong>{demanda.responsavel}</strong>
            </p>
            {demanda.observacao?.trim() && (
              <div className="mt-2 rounded-md border border-border bg-background px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-muted-foreground">
                  Observação
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {demanda.observacao.trim()}
                </p>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {vencida ? (
                <Badge variant="destructive">Vencida</Badge>
              ) : urgente ? (
                <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                  Vence em {horasAteVencimento}h
                </Badge>
              ) : horasAteVencimento !== null ? (
                <Badge variant="secondary">
                  {horasAteVencimento >= 24
                    ? `Vence em ${Math.round(horasAteVencimento / 24)} dia(s)`
                    : `Vence em ${horasAteVencimento}h`}
                </Badge>
              ) : null}
              <Badge variant="outline">
                {cumpridos}/{total} cumpriram ({pct}%)
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyAll}
            title="Copiar todos os links para o clipboard"
          >
            <Copy className="size-3.5" />
            Copiar todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {pendentes.map((p) => {
            const link = buildWaLink(p, demanda);
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ClipboardList className="size-4 text-muted-foreground/60 shrink-0" />
                  <span className="font-medium truncate">
                    {p.nomeFuncional || p.name}
                  </span>
                  {p.numeroCurso && (
                    <span className="text-xs font-mono text-muted-foreground">
                      #{p.numeroCurso}
                    </span>
                  )}
                </div>
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800 transition-colors hover:bg-green-200"
                  >
                    <MessageCircle className="size-3.5" />
                    WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    sem celular
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
