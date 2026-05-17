import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { useTurma } from "@/contexts/turma";
import { loadAuthFromCookie } from "@/lib/auth-cookie";
import { getDemandaDeadline, isDemandaVencida } from "@/lib/demanda";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ErrorBanner, describeError } from "@/components/error-banner";
import { parseTags, collectAllTags } from "@/lib/tags";
import { buildTurmaFilter, isTurmaSchemaError } from "@/lib/turma-filter";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  MessageCircle,
  ClipboardList,
  Users,
  TrendingUp,
  ExternalLink,
  Search,
  X,
  User as UserIcon,
  MoreVertical,
  CheckCheck,
  CircleSlash,
  Copy,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Usuario {
  id: string;
  name: string;
  nomeFuncional?: string;
  email?: string;
  celular?: string;
  numeroCurso?: number;
  numPM?: number;
  role: string;
  disabled?: boolean;
}

interface Demanda {
  id: string;
  titulo: string;
  linkForm: string;
  prazo: string;
  horaLimite: string;
  responsavel: string;
  celularResp?: string;
  ativa: boolean;
  tags?: string;
}

interface Cumprimento {
  id: string;
  user: string;
  demanda: string;
  dataRegistro: string;
  created?: string;
}

function formatTimestamp(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

interface DashboardData {
  usuarios: Usuario[];
  demandas: Demanda[];
  cumprimentos: Cumprimento[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toText(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function formatPrazo(prazoStr: string): string {
  const raw = toText(prazoStr);
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function formatWhatsApp(celular: unknown): string {
  return toText(celular).replace(/\D/g, "");
}

function buildWhatsAppMessage(
  usuario: Usuario,
  pendingDemandas: Demanda[],
): string | null {
  if (pendingDemandas.length === 0 || !formatWhatsApp(usuario.celular)) {
    return null;
  }
  const nomeContato =
    toText(usuario.nomeFuncional).trim() ||
    toText(usuario.name).split(" ")[0] ||
    "olá";
  const lines = pendingDemandas.map(
    (d) =>
      `• ${d.titulo} (prazo: ${formatPrazo(d.prazo)} às ${d.horaLimite})${
        d.linkForm ? `\n  Link: ${d.linkForm}` : "\n  Sem link externo"
      }`,
  );
  const msg = `Olá ${nomeContato}, você ainda tem as seguintes demandas pendentes:\n\n${lines.join("\n")}\n\nPor favor, acesse o sistema e confirme o cumprimento.`;
  return `https://wa.me/55${formatWhatsApp(usuario.celular)}?text=${encodeURIComponent(msg)}`;
}

function isPrazoAberto(demanda: Demanda): boolean {
  const deadline = getDemandaDeadline(demanda);
  if (!deadline) return false;
  return new Date() <= deadline;
}

function isUsuarioOperacional(usuario: Usuario): boolean {
  return usuario.role !== "ADMIN" && usuario.disabled !== true;
}

function normalizeIdentity(value?: unknown): string {
  return toText(value).trim().toUpperCase();
}

function getResponsavelDisplayName(demanda: Demanda, usuarios: Usuario[]): string {
  const responsavel = normalizeIdentity(demanda.responsavel);
  if (!responsavel) return "";

  const usuario = usuarios.find(
    (u) =>
      responsavel === normalizeIdentity(u.nomeFuncional) ||
      responsavel === normalizeIdentity(u.name),
  );

  return toText(usuario?.nomeFuncional) || toText(demanda.responsavel);
}

type IdentidadeUsuario = {
  name?: string;
  nomeFuncional?: string;
};

function isResponsavelDemanda(
  demanda: Demanda,
  user?: IdentidadeUsuario | null,
): boolean {
  if (!user) return false;
  const responsavel = normalizeIdentity(demanda.responsavel);
  return (
    responsavel !== "" &&
    (responsavel === normalizeIdentity(user.nomeFuncional) ||
      responsavel === normalizeIdentity(user.name))
  );
}

// Bolda no nome completo as palavras presentes em `nomeFuncional`.
// Ex.: name="ALEX MARTINO DA SILVA" + nomeFuncional="ALEX MARTINO"
//   → "**ALEX** **MARTINO** DA SILVA"
function renderNomeNegrito(u: Usuario) {
  const name = toText(u.name) || toText(u.email);
  const funcional = toText(u.nomeFuncional).trim();
  if (!funcional) return <span>{name}</span>;

  const wordsToBold = new Set(
    funcional.toUpperCase().split(/\s+/).filter(Boolean),
  );

  return name.split(/(\s+)/).map((token, i) => {
    if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
    const isBold = wordsToBold.has(token.toUpperCase());
    return isBold ? (
      <strong key={i} className="font-bold">
        {token}
      </strong>
    ) : (
      <span key={i}>{token}</span>
    );
  });
}

function renderNomeResponsivo(u: Usuario) {
  const funcional = toText(u.nomeFuncional).trim();
  const fallback = toText(u.name) || toText(u.email);

  return (
    <>
      <span className="font-bold sm:hidden">{funcional || fallback}</span>
      <span className="hidden sm:inline">{renderNomeNegrito(u)}</span>
    </>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-4 w-24 rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function SkeletonTable() {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-10 w-full rounded bg-muted" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 w-full rounded bg-muted/60" />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

type SortMode = "numeroCurso" | "pendentes" | "name";

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "numeroCurso", label: "Nº curso (padrão)" },
  { value: "pendentes", label: "% pendentes primeiro" },
  { value: "name", label: "Nome A-Z" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedTurmaId } = useTurma();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const myUserId = user?.id ?? null;
  const isLoggedIn = !!user;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const sort: SortMode = ((): SortMode => {
    const raw = searchParams.get("sort");
    return raw === "pendentes" || raw === "name" ? raw : "numeroCurso";
  })();
  const showOnlyPending = searchParams.get("pending") === "1";
  const showOnlyVencidas = searchParams.get("vencidas") === "1";
  const showOnlyMe = searchParams.get("me") === "1" && !!myUserId;
  const query = searchParams.get("q") ?? "";
  const responsaveisRaw = searchParams.get("resp") ?? "";
  const responsaveisFilter = useMemo(
    () =>
      new Set(
        responsaveisRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    [responsaveisRaw],
  );

  const tagsRaw = searchParams.get("tag") ?? "";
  const tagsFilter = useMemo(
    () =>
      new Set(
        tagsRaw
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      ),
    [tagsRaw],
  );

  function updateParam(key: string, value: string | null) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );
  }

  function toggleResponsavel(name: string) {
    const next = new Set(responsaveisFilter);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    updateParam("resp", next.size > 0 ? Array.from(next).join(",") : null);
  }

  function toggleTag(tag: string) {
    const next = new Set(tagsFilter);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    updateParam("tag", next.size > 0 ? Array.from(next).join(",") : null);
  }

  function clearAllFilters() {
    setSearchParams({}, { replace: true });
  }

  const hasActiveFilters =
    showOnlyPending ||
    showOnlyVencidas ||
    showOnlyMe ||
    query !== "" ||
    responsaveisFilter.size > 0 ||
    tagsFilter.size > 0 ||
    sort !== "numeroCurso";

  const fetchData = useCallback(async () => {
    try {
      const pb = loadAuthFromCookie();

      if (!pb.authStore.isValid) {
        const response = await fetch(`${pb.baseURL}/api/public-dashboard`);
        if (!response.ok) throw new Error("Erro ao carregar painel público");
        const publicData = (await response.json()) as DashboardData;
        setData(publicData);
        setError(null);
        return;
      }

      const turmaFilter = buildTurmaFilter(selectedTurmaId);
      const loadPrivateData = (filterByTurma: boolean) => {
        const activeTurmaFilter = filterByTurma ? turmaFilter : "";
        const demandasFilter = ["ativa=true", activeTurmaFilter]
          .filter(Boolean)
          .join(" && ");

        return Promise.all([
          pb.collection("users").getFullList<Usuario>({
            sort: "numeroCurso,name",
            filter: activeTurmaFilter || undefined,
          }),
          pb
            .collection("demandas")
            .getFullList<Demanda>({ filter: demandasFilter, sort: "prazo" }),
          pb.collection("cumprimento").getFullList<Cumprimento>(),
        ]);
      };

      let usuarios: Usuario[];
      let demandas: Demanda[];
      let cumprimentos: Cumprimento[];
      try {
        [usuarios, demandas, cumprimentos] = await loadPrivateData(!!turmaFilter);
      } catch (err) {
        if (!turmaFilter || !isTurmaSchemaError(err)) throw err;
        [usuarios, demandas, cumprimentos] = await loadPrivateData(false);
      }

      const usuariosOperacionais = usuarios.filter(isUsuarioOperacional);
      const usuariosIds = new Set(usuariosOperacionais.map((u) => u.id));
      const demandasIds = new Set(demandas.map((d) => d.id));
      const cumprimentosOperacionais = cumprimentos.filter(
        (c) => usuariosIds.has(c.user) && demandasIds.has(c.demanda),
      );

      setData({
        usuarios: usuariosOperacionais,
        demandas,
        cumprimentos: cumprimentosOperacionais,
      });
      setError(null);
    } catch (err) {
      console.error("dashboard fetch", err);
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
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    const pb = loadAuthFromCookie();

    if (!pb.authStore.isValid) {
      const interval = window.setInterval(fetchData, 30000);
      return () => window.clearInterval(interval);
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    pb.collection("cumprimento")
      .subscribe("*", () => {
        fetchData();
      })
      .then((unsub) => {
        if (cancelled) unsub();
        else unsubscribe = unsub;
      })
      .catch((err) => {
        console.warn("dashboard realtime disabled", err);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [fetchData]);

  const cumprimentoMap = new Map<string, Cumprimento>();
  for (const c of data?.cumprimentos ?? []) {
    cumprimentoMap.set(`${c.user}-${c.demanda}`, c);
  }

  function isCumprido(userId: string, demandaId: string): boolean {
    return cumprimentoMap.has(`${userId}-${demandaId}`);
  }

  function getCumprimento(
    userId: string,
    demandaId: string,
  ): Cumprimento | undefined {
    return cumprimentoMap.get(`${userId}-${demandaId}`);
  }

  async function handleToggle(userId: string, demandaId: string) {
    const key = `${userId}-${demandaId}`;
    if (toggling) return;
    setToggling(key);

    const pb = loadAuthFromCookie();

    const already = isCumprido(userId, demandaId);
    try {
      if (already) {
        const existing = getCumprimento(userId, demandaId);
        if (existing) await pb.collection("cumprimento").delete(existing.id);
      } else {
        await pb.collection("cumprimento").create({
          user: userId,
          demanda: demandaId,
          dataRegistro: new Date().toISOString().split("T")[0],
        });
      }
      await fetchData();
    } finally {
      setToggling("");
    }
  }

  async function handleBulkMark(
    demandaId: string,
    userIds: string[],
  ): Promise<{ ok: number; fail: number }> {
    const pb = loadAuthFromCookie();
    const today = new Date().toISOString().split("T")[0];

    const results = await Promise.allSettled(
      userIds.map((uid) =>
        pb.collection("cumprimento").create({
          user: uid,
          demanda: demandaId,
          dataRegistro: today,
        }),
      ),
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    if (fail > 0) {
      const firstErr = results.find((r) => r.status === "rejected");
      if (firstErr && firstErr.status === "rejected") {
        console.error("bulk mark failures", firstErr.reason);
      }
    }
    await fetchData();
    return { ok, fail };
  }

  async function handleBulkUnmark(
    demandaId: string,
    userIds: string[],
  ): Promise<{ ok: number; fail: number }> {
    const pb = loadAuthFromCookie();

    const ids = userIds
      .map((uid) => getCumprimento(uid, demandaId)?.id)
      .filter((x): x is string => !!x);

    const results = await Promise.allSettled(
      ids.map((cid) => pb.collection("cumprimento").delete(cid)),
    );

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    if (fail > 0) {
      const firstErr = results.find((r) => r.status === "rejected");
      if (firstErr && firstErr.status === "rejected") {
        console.error("bulk unmark failures", firstErr.reason);
      }
    }
    await fetchData();
    return { ok, fail };
  }

  const responsaveisDisponiveis = useMemo(() => {
    if (!data) return [] as string[];
    const set = new Set<string>();
    for (const d of data.demandas) {
      const r = toText(d.responsavel).trim();
      if (r) set.add(r);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const tagsDisponiveis = useMemo(() => {
    if (!data) return [] as string[];
    return collectAllTags(data.demandas);
  }, [data]);

  const filteredData: DashboardData | null = useMemo(() => {
    if (!data) return null;

    // 1) Filtrar colunas (demandas) por vencidas e responsáveis
    let demandasFiltradas = data.demandas;
    if (showOnlyVencidas) {
      demandasFiltradas = demandasFiltradas.filter((d) => isDemandaVencida(d));
    }
    if (responsaveisFilter.size > 0) {
      demandasFiltradas = demandasFiltradas.filter((d) =>
        responsaveisFilter.has(toText(d.responsavel).trim()),
      );
    }
    if (tagsFilter.size > 0) {
      demandasFiltradas = demandasFiltradas.filter((d) => {
        const dtags = parseTags(d.tags);
        return dtags.some((t) => tagsFilter.has(t));
      });
    }
    const demandaIds = new Set(demandasFiltradas.map((d) => d.id));

    // 2) Computar pct por usuário sobre as demandas visíveis
    const cumpridosPorUser = new Map<string, number>();
    for (const c of data.cumprimentos) {
      if (!demandaIds.has(c.demanda)) continue;
      cumpridosPorUser.set(c.user, (cumpridosPorUser.get(c.user) ?? 0) + 1);
    }
    const denom = demandasFiltradas.length;
    const usuariosComMeta = data.usuarios.map((u) => ({
      user: u,
      pct: denom > 0 ? (cumpridosPorUser.get(u.id) ?? 0) / denom : 0,
    }));

    // 3) Filtrar linhas (usuários) por "só eu", busca e "apenas pendentes"
    const normalizedQuery = query.trim().toLowerCase();
    let usuariosFiltrados = usuariosComMeta;
    if (showOnlyMe && myUserId) {
      usuariosFiltrados = usuariosFiltrados.filter(
        (m) => m.user.id === myUserId,
      );
    }
    if (normalizedQuery) {
      usuariosFiltrados = usuariosFiltrados.filter((m) =>
        `${toText(m.user.name)} ${toText(m.user.nomeFuncional)}`
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }
    if (showOnlyPending) {
      usuariosFiltrados = usuariosFiltrados.filter((m) => m.pct < 1);
    }

    // 4) Ordenar
    const sorted = [...usuariosFiltrados].sort((a, b) => {
      if (sort === "pendentes") {
        if (a.pct !== b.pct) return a.pct - b.pct;
        return (a.user.name || "").localeCompare(b.user.name || "");
      }
      if (sort === "name") {
        return (a.user.name || "").localeCompare(b.user.name || "");
      }
      const an = a.user.numeroCurso ?? Number.MAX_SAFE_INTEGER;
      const bn = b.user.numeroCurso ?? Number.MAX_SAFE_INTEGER;
      if (an !== bn) return an - bn;
      return (a.user.name || "").localeCompare(b.user.name || "");
    });

    return {
      usuarios: sorted.map((m) => m.user),
      demandas: demandasFiltradas,
      cumprimentos: data.cumprimentos,
    };
  }, [
    data,
    showOnlyVencidas,
    showOnlyPending,
    showOnlyMe,
    myUserId,
    query,
    responsaveisFilter,
    tagsFilter,
    sort,
  ]);

  // Cards de resumo continuam sobre o universo TOTAL (não filtrado).
  const totalDemandas = data?.demandas.length ?? 0;
  const totalUsuarios = data?.usuarios.length ?? 0;

  const avgCompletion =
    totalDemandas > 0 && totalUsuarios > 0
      ? Math.round(
          ((data?.cumprimentos.length ?? 0) / (totalDemandas * totalUsuarios)) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-accent bg-card px-4 py-3 shadow-sm">
        <p className="tactical-heading">Painel operacional</p>
        <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.06em]">
          Dashboard
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Acompanhamento dos links e outras demandas ativas. Marque as demandas
          como cumpridas para atualizar o status em tempo real.
        </p>
      </div>

      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchData().finally(() => setLoading(false));
          }}
          retrying={loading}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <Card className="border-t-4 border-t-accent">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ClipboardList className="size-4" />
                  Demandas Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{totalDemandas}</div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="size-4" />
                  Média de Cumprimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{avgCompletion}%</div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${avgCompletion}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-accent">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="size-4" />
                  Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black">{totalUsuarios}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {loading ? (
        <SkeletonTable />
      ) : !data || data.demandas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">
              Nenhuma demanda ativa no momento.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie demandas em{" "}
              <a href="/demandas" className="underline hover:text-foreground">
                Demandas
              </a>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <DashboardToolbar
            sort={sort}
            onSortChange={(v) =>
              updateParam("sort", v === "numeroCurso" ? null : v)
            }
            showOnlyPending={showOnlyPending}
            onTogglePending={() =>
              updateParam("pending", showOnlyPending ? null : "1")
            }
            showOnlyVencidas={showOnlyVencidas}
            onToggleVencidas={() =>
              updateParam("vencidas", showOnlyVencidas ? null : "1")
            }
            showOnlyMe={showOnlyMe}
            canFilterMe={!!myUserId}
            onToggleMe={() => updateParam("me", showOnlyMe ? null : "1")}
            query={query}
            onQueryChange={(v) => updateParam("q", v || null)}
            responsaveisDisponiveis={responsaveisDisponiveis}
            responsaveisFilter={responsaveisFilter}
            onToggleResponsavel={toggleResponsavel}
            tagsDisponiveis={tagsDisponiveis}
            tagsFilter={tagsFilter}
            onToggleTag={toggleTag}
            hasActiveFilters={hasActiveFilters}
            onClearAll={clearAllFilters}
            visibleUsuarios={filteredData?.usuarios.length ?? 0}
            totalUsuariosCount={data.usuarios.length}
            visibleDemandas={filteredData?.demandas.length ?? 0}
            totalDemandasCount={data.demandas.length}
          />
          {!filteredData ||
          filteredData.usuarios.length === 0 ||
          filteredData.demandas.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="size-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">
                  Nada para mostrar com os filtros atuais.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mt-3 text-sm font-bold uppercase tracking-[0.06em] text-primary underline hover:text-accent"
                >
                  Limpar filtros
                </button>
              </CardContent>
            </Card>
          ) : (
            <CrossTable
              data={filteredData}
              currentUser={user}
              myUserId={myUserId}
              isLoggedIn={isLoggedIn}
              isAdmin={user?.role === "ADMIN"}
              isCumprido={isCumprido}
              getCumprimento={getCumprimento}
              toggling={toggling}
              onToggle={handleToggle}
              onBulkMark={handleBulkMark}
              onBulkUnmark={handleBulkUnmark}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

interface DashboardToolbarProps {
  sort: SortMode;
  onSortChange: (v: SortMode) => void;
  showOnlyPending: boolean;
  onTogglePending: () => void;
  showOnlyVencidas: boolean;
  onToggleVencidas: () => void;
  showOnlyMe: boolean;
  canFilterMe: boolean;
  onToggleMe: () => void;
  query: string;
  onQueryChange: (v: string) => void;
  responsaveisDisponiveis: string[];
  responsaveisFilter: Set<string>;
  onToggleResponsavel: (name: string) => void;
  tagsDisponiveis: string[];
  tagsFilter: Set<string>;
  onToggleTag: (tag: string) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
  visibleUsuarios: number;
  totalUsuariosCount: number;
  visibleDemandas: number;
  totalDemandasCount: number;
}

function DashboardToolbar({
  sort,
  onSortChange,
  showOnlyPending,
  onTogglePending,
  showOnlyVencidas,
  onToggleVencidas,
  showOnlyMe,
  canFilterMe,
  onToggleMe,
  query,
  onQueryChange,
  responsaveisDisponiveis,
  responsaveisFilter,
  onToggleResponsavel,
  tagsDisponiveis,
  tagsFilter,
  onToggleTag,
  hasActiveFilters,
  onClearAll,
  visibleUsuarios,
  totalUsuariosCount,
  visibleDemandas,
  totalDemandasCount,
}: DashboardToolbarProps) {
  return (
    <div className="space-y-3 rounded-md border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nome..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <Select value={sort} onValueChange={(v) => onSortChange(v as SortMode)}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canFilterMe && (
          <button
            type="button"
            onClick={onToggleMe}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold uppercase tracking-[0.04em] transition-colors",
              showOnlyMe
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted",
            )}
            title="Mostrar somente sua linha"
          >
            <UserIcon className="size-3.5" />
            Só eu
          </button>
        )}

        <button
          type="button"
          onClick={onTogglePending}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold uppercase tracking-[0.04em] transition-colors",
            showOnlyPending
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {showOnlyPending && <CheckCircle2 className="size-3.5" />}
          Apenas pendentes
        </button>

        <button
          type="button"
          onClick={onToggleVencidas}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold uppercase tracking-[0.04em] transition-colors",
            showOnlyVencidas
              ? "border-destructive bg-destructive text-destructive-foreground"
              : "border-border bg-background text-foreground hover:bg-muted",
          )}
        >
          {showOnlyVencidas && <CheckCircle2 className="size-3.5" />}
          Apenas vencidas
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-xs font-bold uppercase tracking-[0.04em] text-muted-foreground hover:text-destructive"
          >
            <X className="size-3.5" />
            Limpar
          </button>
        )}
      </div>

      {responsaveisDisponiveis.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.04em] text-muted-foreground mr-1">
            Responsável:
          </span>
          {responsaveisDisponiveis.map((nome) => {
            const active = responsaveisFilter.has(nome);
            return (
              <button
                key={nome}
                type="button"
                onClick={() => onToggleResponsavel(nome)}
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {nome}
              </button>
            );
          })}
        </div>
      )}

      {tagsDisponiveis.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-[0.04em] text-muted-foreground mr-1">
            Tags:
          </span>
          {tagsDisponiveis.map((tag) => {
            const active = tagsFilter.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  active
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      <div className="text-xs font-medium text-muted-foreground">
        Mostrando {visibleUsuarios}/{totalUsuariosCount} usuários ·{" "}
        {visibleDemandas}/{totalDemandasCount} demandas
      </div>
    </div>
  );
}

// ─── Cross Table ─────────────────────────────────────────────────────────────

interface CrossTableProps {
  data: DashboardData;
  currentUser: IdentidadeUsuario | null;
  myUserId: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isCumprido: (userId: string, demandaId: string) => boolean;
  getCumprimento: (userId: string, demandaId: string) => Cumprimento | undefined;
  toggling: string;
  onToggle: (userId: string, demandaId: string) => void;
  onBulkMark: (
    demandaId: string,
    userIds: string[],
  ) => Promise<{ ok: number; fail: number }>;
  onBulkUnmark: (
    demandaId: string,
    userIds: string[],
  ) => Promise<{ ok: number; fail: number }>;
}

type BulkConfirm = {
  demanda: Demanda;
  action: "mark" | "unmark";
  userIds: string[];
};

function CrossTable({
  data,
  currentUser,
  myUserId,
  isLoggedIn,
  isAdmin,
  isCumprido,
  getCumprimento,
  toggling,
  onToggle,
  onBulkMark,
  onBulkUnmark,
}: CrossTableProps) {
  const { usuarios, demandas } = data;
  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirm | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

  function canManageDemanda(d: Demanda): boolean {
    if (!isLoggedIn) return false;
    if (isAdmin) return true;
    return isResponsavelDemanda(d, currentUser);
  }

  function copiarPendentes(d: Demanda) {
    const pendentes = usuarios.filter((u) => !isCumprido(u.id, d.id));
    if (pendentes.length === 0) {
      toast.success("Nenhum pendente para esta demanda.");
      return;
    }
    const lines = pendentes.map((u) => {
      const nome = u.nomeFuncional || u.name;
      const cel = u.celular ? ` — ${u.celular}` : "";
      const num = u.numeroCurso ? `#${u.numeroCurso} ` : "";
      return `${num}${nome}${cel}`;
    });
    const text = `Pendentes — ${d.titulo}\n\n${lines.join("\n")}`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`${pendentes.length} pendentes copiados`))
      .catch(() => toast.error("Não foi possível copiar"));
  }

  async function executeBulk() {
    if (!bulkConfirm) return;
    setBulkRunning(true);
    try {
      const { demanda, action, userIds } = bulkConfirm;
      const fn = action === "mark" ? onBulkMark : onBulkUnmark;
      const { ok, fail } = await fn(demanda.id, userIds);
      const verbo = action === "mark" ? "marcados" : "desmarcados";
      if (fail === 0) {
        toast.success(`${ok} ${verbo}`);
      } else {
        toast.error(`${ok} ${verbo}, ${fail} falharam (veja o console)`);
      }
      setBulkConfirm(null);
    } finally {
      setBulkRunning(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th
                className="sticky left-0 z-20 w-max bg-primary px-3 py-3 text-left font-black uppercase tracking-[0.06em] text-primary-foreground border-b border-r border-primary-foreground/20 whitespace-nowrap"
                scope="col"
              >
                Usuário
              </th>

              {demandas.map((d) => (
                <th
                  key={d.id}
                  className={cn(
                    "px-3 py-3 text-center font-bold border-b border-primary-foreground/20 min-w-[150px] max-w-[190px]",
                    isDemandaVencida(d)
                      ? "bg-amber-900/70 text-primary-foreground"
                      : "text-primary-foreground",
                  )}
                  scope="col"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className="block max-w-[170px] truncate text-sm font-bold leading-tight"
                      title={d.titulo}
                    >
                      {d.titulo}
                    </span>
                    {isLoggedIn && d.responsavel && (
                      <span className="flex max-w-[170px] items-center gap-1 truncate text-[11px] font-semibold text-primary-foreground/80">
                        Resp.:{" "}
                        {d.celularResp ? (
                          <a
                            href={`https://wa.me/55${formatWhatsApp(d.celularResp)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-w-0 items-center gap-1 text-accent hover:underline"
                            title={`Enviar WhatsApp para ${getResponsavelDisplayName(d, usuarios)}`}
                          >
                            <span className="truncate">{getResponsavelDisplayName(d, usuarios)}</span>
                            <MessageCircle className="size-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="truncate">{getResponsavelDisplayName(d, usuarios)}</span>
                        )}
                      </span>
                    )}
                    <span className="text-xs text-primary-foreground/70 font-normal">
                      {formatPrazo(d.prazo)} às {d.horaLimite}
                    </span>
                    {d.linkForm ? (
                      <a
                        href={d.linkForm}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                        title="Abrir formulário"
                      >
                        Form <ExternalLink className="size-2.5" />
                      </a>
                    ) : (
                      <span className="text-xs font-bold text-primary-foreground/60">
                        Ciência no app
                      </span>
                    )}
                    {canManageDemanda(d) && (
                      <DemandaBulkMenu
                        demanda={d}
                        pendentesIds={usuarios
                          .filter((u) => !isCumprido(u.id, d.id))
                          .map((u) => u.id)}
                        cumpridosIds={usuarios
                          .filter((u) => isCumprido(u.id, d.id))
                          .map((u) => u.id)}
                        onAskMark={() =>
                          setBulkConfirm({
                            demanda: d,
                            action: "mark",
                            userIds: usuarios
                              .filter((u) => !isCumprido(u.id, d.id))
                              .map((u) => u.id),
                          })
                        }
                        onAskUnmark={() =>
                          setBulkConfirm({
                            demanda: d,
                            action: "unmark",
                            userIds: usuarios
                              .filter((u) => isCumprido(u.id, d.id))
                              .map((u) => u.id),
                          })
                        }
                        onCopyPendentes={() => copiarPendentes(d)}
                      />
                    )}
                  </div>
                </th>
              ))}

              <th className="px-3 py-3 text-center font-black uppercase tracking-[0.06em] text-primary-foreground border-b border-l border-primary-foreground/20 min-w-[80px]">
                %
              </th>

              {isLoggedIn && (
                <th className="px-3 py-3 text-center font-black uppercase tracking-[0.06em] text-primary-foreground border-b border-l border-primary-foreground/20 min-w-[50px]">
                  WA
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {usuarios.map((u, rowIdx) => {
              const isOwnRow = u.id === myUserId;
              const totalCumpridos = demandas.filter((d) =>
                isCumprido(u.id, d.id),
              ).length;
              const pct =
                demandas.length > 0
                  ? Math.round((totalCumpridos / demandas.length) * 100)
                  : 0;

              const pendingDemandas = demandas.filter(
                (d) => !isCumprido(u.id, d.id),
              );
              const waLink = isLoggedIn
                ? buildWhatsAppMessage(u, pendingDemandas)
                : null;

              return (
                <tr
                  key={u.id}
                  className={cn(
                    "border-b border-border transition-colors",
                    rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20",
                    isOwnRow && "bg-accent/25 ring-2 ring-inset ring-accent",
                  )}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 backdrop-blur px-3 py-2.5 font-medium text-foreground border-r border-border",
                      rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20",
                      isOwnRow && "bg-accent/30 border-l-4 border-l-accent",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isOwnRow && (
                        <span className="inline-flex rounded-sm border border-orange-900 bg-orange-600 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-[0.06em] text-white shadow-sm">
                          Você
                        </span>
                      )}
                      <span
                        className="block whitespace-nowrap leading-snug"
                        title={u.name || u.email}
                      >
                        {renderNomeResponsivo(u)}
                      </span>
                    </div>
                  </td>

                  {demandas.map((d) => {
                    const cumprido = isCumprido(u.id, d.id);
                    const cellKey = `${u.id}-${d.id}`;
                    const isLoading = toggling === cellKey;
                    const isDemandOwner = isResponsavelDemanda(d, currentUser);
                    const prazoAberto = isPrazoAberto(d);
                    const canInteract =
                      isLoggedIn &&
                      (isDemandOwner || (isOwnRow && (prazoAberto || cumprido)));
                    const prazoEncerrado =
                      isLoggedIn && isOwnRow && !isDemandOwner && !prazoAberto && !cumprido;

                    return (
                      <td
                        key={d.id}
                        className="px-2 py-2 text-center border-border"
                      >
                        {isLoading ? (
                          <span className="inline-flex size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : cumprido ? (
                          (() => {
                            const c = getCumprimento(u.id, d.id);
                            const ts = formatTimestamp(c?.created);
                            const baseTitle = canInteract
                              ? "Clique para remover"
                              : "Cumprido";
                            const title = ts
                              ? `${baseTitle}\nMarcado em ${ts}`
                              : baseTitle;
                            return (
                              <button
                                type="button"
                                disabled={!canInteract}
                                onClick={() => onToggle(u.id, d.id)}
                                className={cn(
                                  "inline-flex items-center justify-center rounded-full transition-colors",
                                  "border px-2 py-1",
                                  canInteract
                                    ? "border-green-700 bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                                    : "border-green-600/50 bg-green-100/70 text-green-700 cursor-default",
                                )}
                                title={title}
                              >
                                <CheckCircle2 className="size-5" />
                              </button>
                            );
                          })()
                        ) : (
                          <button
                            type="button"
                            disabled={!canInteract}
                            onClick={() => onToggle(u.id, d.id)}
                            className={cn(
                              "group inline-flex items-center justify-center rounded-full transition-colors",
                              canInteract
                                ? "hover:bg-secondary cursor-pointer"
                                : "cursor-default opacity-40",
                            )}
                            title={
                              canInteract
                                ? "Marcar como concluída"
                                : "Não cumprido"
                            }
                          >
                            {canInteract ? (
                              <span className="flex items-center gap-1 rounded border border-accent bg-secondary px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-accent hover:text-accent-foreground">
                                OK
                              </span>
                            ) : prazoEncerrado ? (
                              <span className="inline-flex rounded border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] text-destructive">
                                Prazo encerrado
                              </span>
                            ) : (
                              <Circle className="size-5 text-muted-foreground/40 group-hover:text-accent" />
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}

                  <td className="px-3 py-2 border-l border-border">
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          pct === 100
                            ? "text-accent"
                            : pct >= 50
                              ? "text-amber-600"
                              : "text-destructive",
                        )}
                      >
                        {pct}%
                      </span>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct === 100
                              ? "bg-accent"
                              : pct >= 50
                                ? "bg-amber-500"
                                : "bg-red-500",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {isLoggedIn && (
                    <td className="px-2 py-2 text-center border-l border-border">
                      {waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          title={`Enviar WhatsApp para ${u.name || u.email}`}
                        >
                          <MessageCircle className="size-3.5 shrink-0" />
                          <span className="hidden sm:inline">
                            {pendingDemandas.length}
                          </span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground/30 text-xs">
                          —
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-muted/70 border-t-2 border-primary">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-muted px-3 py-4 text-left text-sm font-black uppercase tracking-[0.08em] text-foreground border-r border-border"
              >
                Total
              </th>
              {demandas.map((d) => {
                const count = usuarios.filter((u) =>
                  isCumprido(u.id, d.id),
                ).length;
                const demandaPct =
                  usuarios.length > 0
                    ? Math.round((count / usuarios.length) * 100)
                    : 0;
                return (
                  <td key={d.id} className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm font-black text-foreground">
                        {count}/{usuarios.length}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          demandaPct === 100
                            ? "text-accent"
                            : demandaPct >= 50
                              ? "text-amber-600"
                              : "text-destructive",
                        )}
                      >
                        {demandaPct}%
                      </span>
                    </div>
                  </td>
                );
              })}
              <td className="border-l border-border" />
              {isLoggedIn && <td className="border-l border-border" />}
            </tr>
          </tfoot>
        </table>
      </div>

      <Dialog
        open={!!bulkConfirm}
        onOpenChange={(open) => !open && !bulkRunning && setBulkConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="uppercase tracking-[0.08em]">
              {bulkConfirm?.action === "mark"
                ? "Marcar todos como cumpridos"
                : "Desmarcar todos"}
            </DialogTitle>
          </DialogHeader>
          {bulkConfirm && (
            <p className="text-sm text-muted-foreground">
              {bulkConfirm.action === "mark" ? (
                <>
                  Vamos marcar <strong>{bulkConfirm.userIds.length}</strong>{" "}
                  usuário(s) como cumpridos na demanda{" "}
                  <strong>{bulkConfirm.demanda.titulo}</strong>. Essa ação fica
                  registrada no histórico.
                </>
              ) : (
                <>
                  Vamos remover o cumprimento de{" "}
                  <strong>{bulkConfirm.userIds.length}</strong> usuário(s) na
                  demanda <strong>{bulkConfirm.demanda.titulo}</strong>. Essa
                  ação fica registrada no histórico.
                </>
              )}
            </p>
          )}
          {bulkConfirm && bulkConfirm.userIds.length === 0 ? (
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkConfirm(null)}
                className="flex-1"
              >
                Fechar
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <Button
                variant={
                  bulkConfirm?.action === "unmark" ? "destructive" : "default"
                }
                onClick={executeBulk}
                disabled={bulkRunning}
                className="flex-1"
              >
                {bulkRunning ? "Processando..." : "Confirmar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkConfirm(null)}
                disabled={bulkRunning}
              >
                Cancelar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Bulk Menu por demanda ───────────────────────────────────────────────────

interface DemandaBulkMenuProps {
  demanda: Demanda;
  pendentesIds: string[];
  cumpridosIds: string[];
  onAskMark: () => void;
  onAskUnmark: () => void;
  onCopyPendentes: () => void;
}

function DemandaBulkMenu({
  pendentesIds,
  cumpridosIds,
  onAskMark,
  onAskUnmark,
  onCopyPendentes,
}: DemandaBulkMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            title="Ações em massa para esta demanda"
            aria-label="Ações em massa"
          >
            <MoreVertical className="size-4" />
          </button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={onAskMark}
          disabled={pendentesIds.length === 0}
        >
          <CheckCheck className="size-4" />
          Marcar {pendentesIds.length} pendente(s)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onAskUnmark}
          disabled={cumpridosIds.length === 0}
          variant="destructive"
        >
          <CircleSlash className="size-4" />
          Desmarcar {cumpridosIds.length} cumprido(s)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onCopyPendentes}
          disabled={pendentesIds.length === 0}
        >
          <Copy className="size-4" />
          Copiar lista de pendentes
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
