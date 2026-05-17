import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { getPb } from "@/lib/pocketbase";
import { getDemandaDeadline, isDemandaVencida } from "@/lib/demanda";
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
  pendingDemandas: Demanda[],
): string | null {
  if (pendingDemandas.length === 0 || !usuario.celular) return null;
  const nomeContato =
    (usuario.nomeFuncional || "").trim() ||
    (usuario.name || "").split(" ")[0] ||
    "olá";
  const lines = pendingDemandas.map(
    (d) => `• ${d.titulo} (prazo: ${formatPrazo(d.prazo)} às ${d.horaLimite})`,
  );
  const msg = `Olá ${nomeContato}, você ainda não enviou os seguintes formulários:\n\n${lines.join("\n")}\n\nPor favor, acesse o sistema e confirme o envio.`;
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

function normalizeIdentity(value?: string): string {
  return (value || "").trim().toUpperCase();
}

function getResponsavelDisplayName(demanda: Demanda, usuarios: Usuario[]): string {
  const responsavel = normalizeIdentity(demanda.responsavel);
  if (!responsavel) return "";

  const usuario = usuarios.find(
    (u) =>
      responsavel === normalizeIdentity(u.nomeFuncional) ||
      responsavel === normalizeIdentity(u.name),
  );

  return usuario?.nomeFuncional || demanda.responsavel;
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
  const name = (u.name || u.email || "").toString();
  const funcional = (u.nomeFuncional || "").trim();
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
  const funcional = (u.nomeFuncional || "").trim();
  const fallback = u.name || u.email || "";

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

export default function DashboardPage() {
  const { user } = useAuth();
  const myUserId = user?.id ?? null;
  const isLoggedIn = !!user;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const pb = getPb();
      pb.authStore.loadFromCookie(document.cookie);

      if (!pb.authStore.isValid) {
        const response = await fetch(`${pb.baseURL}/api/public-dashboard`);
        if (!response.ok) throw new Error("Erro ao carregar painel público");
        const publicData = (await response.json()) as DashboardData;
        setData(publicData);
        return;
      }

      const [usuarios, demandas, cumprimentos] = await Promise.all([
        pb.collection("users").getFullList<Usuario>({
          sort: "numeroCurso,name",
        }),
        pb
          .collection("demandas")
          .getFullList<Demanda>({ filter: "ativa=true", sort: "prazo" }),
        pb.collection("cumprimento").getFullList<Cumprimento>(),
      ]);

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

    if (!pb.authStore.isValid) {
      const interval = window.setInterval(fetchData, 30000);
      return () => window.clearInterval(interval);
    }

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

  function getCumprimentoId(
    userId: string,
    demandaId: string,
  ): string | undefined {
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
        <CrossTable
          data={data}
          currentUser={user}
          myUserId={myUserId}
          isLoggedIn={isLoggedIn}
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
  currentUser: IdentidadeUsuario | null;
  myUserId: string | null;
  isLoggedIn: boolean;
  isCumprido: (userId: string, demandaId: string) => boolean;
  toggling: string;
  onToggle: (userId: string, demandaId: string) => void;
}

function CrossTable({
  data,
  currentUser,
  myUserId,
  isLoggedIn,
  isCumprido,
  toggling,
  onToggle,
}: CrossTableProps) {
  const { usuarios, demandas } = data;

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
                    <a
                      href={d.linkForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                      title="Abrir formulário"
                    >
                      Form <ExternalLink className="size-2.5" />
                    </a>
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
                            title={
                              canInteract ? "Clique para remover" : "Cumprido"
                            }
                          >
                            <CheckCircle2 className="size-5" />
                          </button>
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
    </div>
  );
}
