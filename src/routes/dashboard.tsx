import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { getPb } from "@/lib/pocketbase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  MessageCircle,
  ClipboardList,
  Users,
  TrendingUp,
  ExternalLink,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Usuario {
  id: string;
  name: string;
  nomeFuncional?: string;
  email: string;
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
  celularResp: string;
  ativa: boolean;
}

interface Cumprimento {
  id: string;
  user: string;
  demanda: string;
  dataRegistro: string;
}

interface DashboardData {
  usuarios: Usuario[];
  demandas: Demanda[];
  cumprimentos: Cumprimento[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrazo(prazoStr: string): string {
  const d = new Date(prazoStr);
  if (isNaN(d.getTime())) return prazoStr;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function formatWhatsApp(celular: string): string {
  return celular.replace(/\D/g, "");
}

function buildWhatsAppMessage(
  usuario: Usuario,
  pendingDemandas: Demanda[]
): string | null {
  if (pendingDemandas.length === 0 || !usuario.celular) return null;
  const primeiroNome = (usuario.name || "").split(" ")[0] || "olá";
  const lines = pendingDemandas.map(
    (d) => `• ${d.titulo} (prazo: ${formatPrazo(d.prazo)})`
  );
  const msg = `Olá ${primeiroNome}, você ainda não enviou os seguintes formulários:\n\n${lines.join("\n")}\n\nPor favor, acesse o sistema e confirme o envio.`;
  return `https://wa.me/55${formatWhatsApp(usuario.celular)}?text=${encodeURIComponent(msg)}`;
}

function isPrazoFuturo(prazoStr: string): boolean {
  const d = new Date(prazoStr);
  return d > new Date();
}

// Bolda no nome completo as palavras presentes em `nomeFuncional`.
// Ex.: name="ALEX MARTINO DA SILVA" + nomeFuncional="ALEX MARTINO"
//   → "**ALEX** **MARTINO** DA SILVA"
function renderNomeNegrito(u: Usuario) {
  const name = (u.name || u.email || "").toString();
  const funcional = (u.nomeFuncional || "").trim();
  if (!funcional) return <span>{name}</span>;

  const wordsToBold = new Set(
    funcional.toUpperCase().split(/\s+/).filter(Boolean)
  );

  return name.split(/(\s+)/).map((token, i) => {
    if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
    const isBold = wordsToBold.has(token.toUpperCase());
    return isBold ? (
      <strong key={i} className="font-bold">{token}</strong>
    ) : (
      <span key={i}>{token}</span>
    );
  });
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

export default function DashboardPage() {
  const { user } = useAuth();
  const myUserId = user?.id ?? null;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const pb = getPb();
      pb.authStore.loadFromCookie(document.cookie);

      const [usuarios, demandas, cumprimentos] = await Promise.all([
        pb.collection("users").getFullList<Usuario>({
          sort: "numeroCurso,name",
          filter: "disabled = false || disabled = null",
        }),
        pb.collection("demandas").getFullList<Demanda>({ filter: "ativa=true", sort: "prazo" }),
        pb.collection("cumprimento").getFullList<Cumprimento>(),
      ]);

      setData({ usuarios, demandas, cumprimentos });
    } catch {
      // silently fail; table will show empty state
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  useEffect(() => {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    pb.collection("cumprimento").subscribe("*", () => {
      fetchData();
    });

    return () => {
      pb.collection("cumprimento").unsubscribe("*");
    };
  }, [fetchData]);

  const cumprimentoMap = new Map<string, string>();
  for (const c of data?.cumprimentos ?? []) {
    cumprimentoMap.set(`${c.user}-${c.demanda}`, c.id);
  }

  function isCumprido(userId: string, demandaId: string): boolean {
    return cumprimentoMap.has(`${userId}-${demandaId}`);
  }

  function getCumprimentoId(userId: string, demandaId: string): string | undefined {
    return cumprimentoMap.get(`${userId}-${demandaId}`);
  }

  async function handleToggle(userId: string, demandaId: string) {
    const key = `${userId}-${demandaId}`;
    if (toggling) return;
    setToggling(key);

    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    const already = isCumprido(userId, demandaId);
    try {
      if (already) {
        const cid = getCumprimentoId(userId, demandaId);
        if (cid) await pb.collection("cumprimento").delete(cid);
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

  const totalDemandas = data?.demandas.length ?? 0;
  const totalUsuarios = data?.usuarios.length ?? 0;

  const avgCompletion =
    totalDemandas > 0 && totalUsuarios > 0
      ? Math.round(
          ((data?.cumprimentos.length ?? 0) /
            (totalDemandas * totalUsuarios)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhamento de cumprimento de formulários
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ClipboardList className="size-4" />
                  Demandas Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalDemandas}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TrendingUp className="size-4" />
                  Média de Cumprimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{avgCompletion}%</div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${avgCompletion}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Users className="size-4" />
                  Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalUsuarios}</div>
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
        <CrossTable
          data={data}
          myUserId={myUserId}
          isCumprido={isCumprido}
          toggling={toggling}
          onToggle={handleToggle}
        />
      )}
    </div>
  );
}

// ─── Cross Table ─────────────────────────────────────────────────────────────

interface CrossTableProps {
  data: DashboardData;
  myUserId: string | null;
  isCumprido: (userId: string, demandaId: string) => boolean;
  toggling: string;
  onToggle: (userId: string, demandaId: string) => void;
}

function CrossTable({
  data,
  myUserId,
  isCumprido,
  toggling,
  onToggle,
}: CrossTableProps) {
  const { usuarios, demandas } = data;

  return (
    <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th
                className="sticky left-0 z-20 bg-muted/80 backdrop-blur px-3 py-3 text-left font-semibold text-foreground border-b border-r border-border min-w-[260px] whitespace-nowrap"
                scope="col"
              >
                Usuário
              </th>

              {demandas.map((d) => (
                <th
                  key={d.id}
                  className="px-2 py-3 text-center font-medium text-foreground border-b border-border min-w-[90px] max-w-[110px]"
                  scope="col"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span
                      className="block max-w-[90px] truncate text-xs font-semibold leading-tight"
                      title={d.titulo}
                    >
                      {d.titulo}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {formatPrazo(d.prazo)}
                    </span>
                    <a
                      href={d.linkForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                      title="Abrir formulário"
                    >
                      Form <ExternalLink className="size-2.5" />
                    </a>
                  </div>
                </th>
              ))}

              <th className="px-3 py-3 text-center font-medium text-foreground border-b border-l border-border min-w-[80px]">
                %
              </th>

              <th className="px-3 py-3 text-center font-medium text-foreground border-b border-l border-border min-w-[50px]">
                WA
              </th>
            </tr>
          </thead>

          <tbody>
            {usuarios.map((u, rowIdx) => {
              const isOwnRow = u.id === myUserId;
              const totalCumpridos = demandas.filter((d) =>
                isCumprido(u.id, d.id)
              ).length;
              const pct =
                demandas.length > 0
                  ? Math.round((totalCumpridos / demandas.length) * 100)
                  : 0;

              const pendingDemandas = demandas.filter(
                (d) => !isCumprido(u.id, d.id)
              );
              const waLink = buildWhatsAppMessage(u, pendingDemandas);

              return (
                <tr
                  key={u.id}
                  className={cn(
                    "border-b border-border transition-colors",
                    rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20",
                    isOwnRow && "bg-blue-50 dark:bg-blue-950/30"
                  )}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 backdrop-blur px-3 py-2.5 font-medium text-foreground border-r border-border",
                      rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20",
                      isOwnRow && "bg-blue-50 dark:bg-blue-950/30"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isOwnRow && (
                        <span className="inline-flex size-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                      <span className="truncate max-w-[200px]" title={u.name || u.email}>
                        {renderNomeNegrito(u)}
                      </span>
                    </div>
                  </td>

                  {demandas.map((d) => {
                    const cumprido = isCumprido(u.id, d.id);
                    const cellKey = `${u.id}-${d.id}`;
                    const isLoading = toggling === cellKey;
                    const canInteract = isOwnRow ? isPrazoFuturo(d.prazo) || cumprido : true;

                    return (
                      <td
                        key={d.id}
                        className="px-2 py-2 text-center border-border"
                      >
                        {isLoading ? (
                          <span className="inline-flex size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        ) : cumprido ? (
                          <button
                            type="button"
                            disabled={!canInteract}
                            onClick={() => onToggle(u.id, d.id)}
                            className={cn(
                              "inline-flex items-center justify-center rounded-full transition-colors",
                              canInteract
                                ? "hover:bg-destructive/10 cursor-pointer"
                                : "cursor-default"
                            )}
                            title={canInteract ? "Clique para remover" : "Cumprido"}
                          >
                            <CheckCircle2 className="size-5 text-green-600" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canInteract}
                            onClick={() => onToggle(u.id, d.id)}
                            className={cn(
                              "group inline-flex items-center justify-center rounded-full transition-colors",
                              canInteract
                                ? "hover:bg-green-50 dark:hover:bg-green-950/30 cursor-pointer"
                                : "cursor-default opacity-40"
                            )}
                            title={
                              canInteract
                                ? isOwnRow
                                  ? "Confirmar envio"
                                  : "Clique para marcar"
                                : "Não cumprido"
                            }
                          >
                            {isOwnRow && canInteract ? (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-primary border border-primary/40 rounded px-1.5 py-0.5 hover:bg-primary/10">
                                Confirmar
                              </span>
                            ) : (
                              <Circle className="size-5 text-muted-foreground/40 group-hover:text-green-500" />
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
                            ? "text-green-600"
                            : pct >= 50
                            ? "text-amber-600"
                            : "text-destructive"
                        )}
                      >
                        {pct}%
                      </span>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            pct === 100
                              ? "bg-green-500"
                              : pct >= 50
                              ? "bg-amber-500"
                              : "bg-red-500"
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="px-2 py-2 text-center border-l border-border">
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                        title={`Enviar WhatsApp para ${u.name || u.email}`}
                      >
                        <MessageCircle className="size-3.5 shrink-0" />
                        <span className="hidden sm:inline">
                          {pendingDemandas.length}
                        </span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-muted/60 border-t-2 border-border">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-muted/80 backdrop-blur px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground border-r border-border"
              >
                Total
              </th>
              {demandas.map((d) => {
                const count = usuarios.filter((u) =>
                  isCumprido(u.id, d.id)
                ).length;
                const demandaPct =
                  usuarios.length > 0
                    ? Math.round((count / usuarios.length) * 100)
                    : 0;
                return (
                  <td
                    key={d.id}
                    className="px-2 py-2 text-center"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-semibold">
                        {count}/{usuarios.length}
                      </span>
                      <span
                        className={cn(
                          "text-[10px]",
                          demandaPct === 100
                            ? "text-green-600"
                            : demandaPct >= 50
                            ? "text-amber-600"
                            : "text-destructive"
                        )}
                      >
                        {demandaPct}%
                      </span>
                    </div>
                  </td>
                );
              })}
              <td className="border-l border-border" />
              <td className="border-l border-border" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
