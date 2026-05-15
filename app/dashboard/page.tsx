"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface Participante {
  id: number;
  nome: string;
  nomeExibicao: string | null;
  celular: string;
}

interface Demanda {
  id: string;
  titulo: string;
  linkForm: string;
  prazo: string;
  horaLimite: string;
  responsavel: string;
  celularResp: string;
  ativa: number;
  criadaEm: string;
}

interface Cumprimento {
  participanteId: number;
  demandaId: string;
  dataRegistro: string;
}

interface DashboardData {
  participantes: Participante[];
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
  participante: Participante,
  pendingDemandas: Demanda[]
): string {
  if (pendingDemandas.length === 0) return "";
  const lines = pendingDemandas.map(
    (d) => `• ${d.titulo} (prazo: ${formatPrazo(d.prazo)})`
  );
  const msg = `Olá ${participante.nome.split(" ")[0]}, você ainda não enviou os seguintes formulários:\n\n${lines.join("\n")}\n\nPor favor, acesse o sistema e confirme o envio.`;
  return `https://wa.me/55${formatWhatsApp(participante.celular)}?text=${encodeURIComponent(msg)}`;
}

function isPrazoFuturo(prazoStr: string): boolean {
  const d = new Date(prazoStr);
  return d > new Date();
}

function renderNomeNegrito(p: Participante) {
  const src = p.nomeExibicao ?? p.nome;
  return src.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
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
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "";
  const isGestorOrAdmin = role === "ADMIN" || role === "GESTOR";
  const isParticipante = role === "PARTICIPANTE";

  const [data, setData] = useState<DashboardData | null>(null);
  const [myParticipanteId, setMyParticipanteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string>(""); // "participanteId-demandaId"

  // Fetch cross-table data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/cumprimento");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silently fail; table will show empty state
    }
  }, []);

  // Fetch own participanteId (PARTICIPANTE only)
  useEffect(() => {
    if (!isParticipante) return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setMyParticipanteId(d.participanteId ?? null))
      .catch(() => {});
  }, [isParticipante]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  // Build a cumprimento lookup set: "participanteId-demandaId"
  const cumprimentoSet = new Set(
    (data?.cumprimentos ?? []).map((c) => `${c.participanteId}-${c.demandaId}`)
  );

  function isCumprido(participanteId: number, demandaId: string): boolean {
    return cumprimentoSet.has(`${participanteId}-${demandaId}`);
  }

  // ── Toggle for ADMIN/GESTOR ──
  async function handleAdminToggle(participanteId: number, demandaId: string) {
    const key = `${participanteId}-${demandaId}`;
    if (toggling) return;
    setToggling(key);

    const already = isCumprido(participanteId, demandaId);
    try {
      const res = await fetch("/api/cumprimento", {
        method: already ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participanteId, demandaId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setToggling("");
    }
  }

  // ── Toggle for PARTICIPANTE (own row) ──
  async function handleParticipanteToggle(demandaId: string, already: boolean) {
    const key = `${myParticipanteId}-${demandaId}`;
    if (toggling) return;
    setToggling(key);

    try {
      const res = await fetch("/api/cumprimento/proprio", {
        method: already ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandaId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } finally {
      setToggling("");
    }
  }

  // ── Summary stats ──
  const totalDemandas = data?.demandas.length ?? 0;
  const totalParticipantes = data?.participantes.length ?? 0;

  const avgCompletion =
    totalDemandas > 0 && totalParticipantes > 0
      ? Math.round(
          ((data?.cumprimentos.length ?? 0) /
            (totalDemandas * totalParticipantes)) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhamento de cumprimento de formulários
        </p>
      </div>

      {/* Summary cards */}
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
                  Participantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalParticipantes}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Cross table */}
      {loading ? (
        <SkeletonTable />
      ) : !data || data.demandas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">
              Nenhuma demanda ativa no momento.
            </p>
            {isGestorOrAdmin && (
              <p className="text-sm text-muted-foreground mt-1">
                Crie demandas em{" "}
                <a href="/demandas" className="underline hover:text-foreground">
                  Demandas
                </a>
                .
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <CrossTable
          data={data}
          isGestorOrAdmin={isGestorOrAdmin}
          isParticipante={isParticipante}
          myParticipanteId={myParticipanteId}
          isCumprido={isCumprido}
          toggling={toggling}
          onAdminToggle={handleAdminToggle}
          onParticipanteToggle={handleParticipanteToggle}
        />
      )}
    </div>
  );
}

// ─── Cross Table ─────────────────────────────────────────────────────────────

interface CrossTableProps {
  data: DashboardData;
  isGestorOrAdmin: boolean;
  isParticipante: boolean;
  myParticipanteId: number | null;
  isCumprido: (participanteId: number, demandaId: string) => boolean;
  toggling: string;
  onAdminToggle: (participanteId: number, demandaId: string) => void;
  onParticipanteToggle: (demandaId: string, already: boolean) => void;
}

function CrossTable({
  data,
  isGestorOrAdmin,
  isParticipante,
  myParticipanteId,
  isCumprido,
  toggling,
  onAdminToggle,
  onParticipanteToggle,
}: CrossTableProps) {
  const { participantes, demandas } = data;

  return (
    <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {/* Sticky name column header */}
              <th
                className="sticky left-0 z-20 bg-muted/80 backdrop-blur px-3 py-3 text-left font-semibold text-foreground border-b border-r border-border min-w-[280px] whitespace-nowrap"
                scope="col"
              >
                Participante
              </th>

              {/* Demand column headers */}
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

              {/* Progress column */}
              <th className="px-3 py-3 text-center font-medium text-foreground border-b border-l border-border min-w-[80px]">
                %
              </th>

              {/* WhatsApp column — ADMIN/GESTOR only */}
              {isGestorOrAdmin && (
                <th className="px-3 py-3 text-center font-medium text-foreground border-b border-l border-border min-w-[50px]">
                  WA
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {participantes.map((p, rowIdx) => {
              const isOwnRow = isParticipante && p.id === myParticipanteId;
              const totalCumpridos = demandas.filter((d) =>
                isCumprido(p.id, d.id)
              ).length;
              const pct =
                demandas.length > 0
                  ? Math.round((totalCumpridos / demandas.length) * 100)
                  : 0;

              const pendingDemandas = demandas.filter(
                (d) => !isCumprido(p.id, d.id)
              );
              const waLink = buildWhatsAppMessage(p, pendingDemandas);

              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-border transition-colors",
                    rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20",
                    isOwnRow && "bg-blue-50 dark:bg-blue-950/30"
                  )}
                >
                  {/* Sticky name cell */}
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
                      <span className="whitespace-nowrap font-normal" title={p.nome}>
                        {renderNomeNegrito(p)}
                      </span>
                    </div>
                  </td>

                  {/* Demand cells */}
                  {demandas.map((d) => {
                    const cumprido = isCumprido(p.id, d.id);
                    const cellKey = `${p.id}-${d.id}`;
                    const isLoading = toggling === cellKey;
                    const canInteract =
                      isGestorOrAdmin || (isOwnRow && isPrazoFuturo(d.prazo));

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
                            onClick={() =>
                              isGestorOrAdmin
                                ? onAdminToggle(p.id, d.id)
                                : onParticipanteToggle(d.id, true)
                            }
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
                            onClick={() =>
                              isGestorOrAdmin
                                ? onAdminToggle(p.id, d.id)
                                : onParticipanteToggle(d.id, false)
                            }
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

                  {/* Progress cell */}
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

                  {/* WhatsApp cell — ADMIN/GESTOR only */}
                  {isGestorOrAdmin && (
                    <td className="px-2 py-2 text-center border-l border-border">
                      {pendingDemandas.length > 0 && waLink ? (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                          title={`Enviar WhatsApp para ${p.nome}`}
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
                  )}
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer row */}
          <tfoot>
            <tr className="bg-muted/60 border-t-2 border-border">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-muted/80 backdrop-blur px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground border-r border-border"
              >
                Total
              </th>
              {demandas.map((d) => {
                const count = participantes.filter((p) =>
                  isCumprido(p.id, d.id)
                ).length;
                const demandaPct =
                  participantes.length > 0
                    ? Math.round((count / participantes.length) * 100)
                    : 0;
                return (
                  <td
                    key={d.id}
                    className="px-2 py-2 text-center"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-semibold">
                        {count}/{participantes.length}
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
              {isGestorOrAdmin && <td className="border-l border-border" />}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
