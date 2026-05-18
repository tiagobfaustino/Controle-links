import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTurma } from "@/contexts/turma";
import { getPb } from "@/lib/pocketbase";
import { getDemandaDatePart, isDemandaVencida } from "@/lib/demanda";
import { parseTags } from "@/lib/tags";
import { buildTurmaFilter, isTurmaSchemaError } from "@/lib/turma-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorBanner, describeError } from "@/components/error-banner";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

type Demanda = {
  id: string;
  titulo: string;
  prazo: string;
  horaLimite: string;
  responsavel: string;
  ativa: boolean;
  tags?: string;
};

type Cumprimento = {
  id: string;
  user: string;
  demanda: string;
};

type UsuarioLite = {
  id: string;
  role: string;
  disabled?: boolean;
};

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function ymKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function parseYM(value: string | null, fallback: { y: number; m: number }) {
  if (!value) return fallback;
  const match = /^(\d{4})-(\d{1,2})$/.exec(value);
  if (!match) return fallback;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  if (m < 0 || m > 11) return fallback;
  return { y, m };
}

function demandaDate(d: Demanda): { y: number; m: number; day: number } | null {
  const datePart = getDemandaDatePart(d.prazo);
  if (!datePart) return null;
  const [y, m, day] = datePart.split("-").map(Number);
  if (!y || !m || !day) return null;
  return { y, m: m - 1, day };
}

export default function CalendarioDemandasPage() {
  const { selectedTurmaId } = useTurma();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const today = new Date();
  const initial = parseYM(searchParams.get("ym"), {
    y: today.getFullYear(),
    m: today.getMonth(),
  });

  const [year, setYear] = useState(initial.y);
  const [month, setMonth] = useState(initial.m);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [cumprimentos, setCumprimentos] = useState<Cumprimento[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  function setMonthYear(y: number, m: number) {
    setYear(y);
    setMonth(m);
    setSearchParams({ ym: ymKey(y, m) }, { replace: true });
  }

  function nextMonth() {
    if (month === 11) setMonthYear(year + 1, 0);
    else setMonthYear(year, month + 1);
  }

  function prevMonth() {
    if (month === 0) setMonthYear(year - 1, 11);
    else setMonthYear(year, month - 1);
  }

  function goToday() {
    setMonthYear(today.getFullYear(), today.getMonth());
  }

  const fetchAll = useCallback(async () => {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      const turmaFilter = buildTurmaFilter(selectedTurmaId);
      const loadData = (filterByTurma: boolean) => {
        const activeTurmaFilter = filterByTurma ? turmaFilter : "";

        return Promise.all([
          pb.collection("demandas").getFullList<Demanda>({
            sort: "prazo",
            filter: activeTurmaFilter || undefined,
            requestKey: null,
          }),
          pb.collection("cumprimento").getFullList<Cumprimento>({
            requestKey: null,
          }),
          pb.collection("users").getFullList<UsuarioLite>({
            fields: "id,role,disabled",
            filter: activeTurmaFilter || undefined,
            requestKey: null,
          }),
        ]);
      };

      let d: Demanda[];
      let c: Cumprimento[];
      let u: UsuarioLite[];
      try {
        [d, c, u] = await loadData(!!turmaFilter);
      } catch (err) {
        if (!turmaFilter || !isTurmaSchemaError(err)) throw err;
        [d, c, u] = await loadData(false);
      }
      setDemandas(d);
      setCumprimentos(c);
      setUsuarios(u);
      setError(null);
    } catch (err) {
      console.error("calendario fetch", err);
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

  const totalOperacionais = useMemo(
    () =>
      usuarios.filter((u) => u.role !== "ADMIN" && u.disabled !== true).length,
    [usuarios],
  );

  const cumpridosPorDemanda = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cumprimentos) {
      m.set(c.demanda, (m.get(c.demanda) ?? 0) + 1);
    }
    return m;
  }, [cumprimentos]);

  const demandasPorDia = useMemo(() => {
    const map = new Map<string, Demanda[]>();
    for (const d of demandas) {
      const dt = demandaDate(d);
      if (!dt) continue;
      if (dt.y !== year || dt.m !== month) continue;
      const key = String(dt.day);
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    }
    return map;
  }, [demandas, year, month]);

  const grid = useMemo(() => {
    // Calendário começando no domingo
    const first = new Date(year, month, 1);
    const offset = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
    while (cells.length % 7 !== 0) cells.push({ day: null });
    return cells;
  }, [year, month]);

  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  const selectedDemandas = selected ? (demandasPorDia.get(selected) ?? []) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-accent bg-card px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="tactical-heading">Planejamento</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.06em]">
            Calendário
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Visualização mensal das demandas pelo dia do prazo.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/demandas">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} title="Mês anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="text-base font-black uppercase tracking-[0.06em] min-w-[200px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth} title="Próximo mês">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday}>
          <CalendarDays className="size-4" />
          Hoje
        </Button>
      </div>

      {loading ? (
        <div className="h-96 bg-muted animate-pulse rounded-md" />
      ) : error ? null : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="grid grid-cols-7 border-b bg-primary text-primary-foreground">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="px-2 py-2 text-center text-xs font-black uppercase tracking-[0.08em]"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((cell, i) => {
              if (cell.day === null) {
                return (
                  <div
                    key={i}
                    className="min-h-[100px] border-r border-b border-border bg-muted/20"
                  />
                );
              }
              const dayKey = String(cell.day);
              const dayDemandas = demandasPorDia.get(dayKey) ?? [];
              const isTodayCell = isToday(cell.day);
              const isSelected = selected === dayKey;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setSelected(dayKey === selected ? null : dayKey)
                  }
                  className={cn(
                    "flex min-h-[100px] flex-col items-stretch gap-1 border-r border-b border-border px-1.5 py-1.5 text-left transition-colors hover:bg-muted/40",
                    isTodayCell && "bg-accent/10",
                    isSelected && "ring-2 ring-inset ring-primary",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold",
                      isTodayCell
                        ? "inline-flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        : "text-foreground",
                    )}
                  >
                    {cell.day}
                  </span>
                  {dayDemandas.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                      {dayDemandas.slice(0, 3).map((d) => {
                        const vencida = isDemandaVencida(d);
                        const cumpridos = cumpridosPorDemanda.get(d.id) ?? 0;
                        const pct =
                          totalOperacionais > 0
                            ? Math.round((cumpridos / totalOperacionais) * 100)
                            : 0;
                        return (
                          <span
                            key={d.id}
                            className={cn(
                              "block truncate rounded px-1 py-0.5 text-[10px] font-bold",
                              !d.ativa
                                ? "bg-muted text-muted-foreground"
                                : vencida
                                  ? "bg-destructive/15 text-destructive"
                                  : pct === 100
                                    ? "bg-green-100 text-green-800"
                                    : pct >= 50
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-primary/10 text-primary",
                            )}
                            title={`${d.titulo} — ${cumpridos}/${totalOperacionais} (${pct}%)`}
                          >
                            {d.titulo}
                          </span>
                        );
                      })}
                      {dayDemandas.length > 3 && (
                        <span className="text-[10px] font-bold text-muted-foreground">
                          +{dayDemandas.length - 3} mais
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && selectedDemandas.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-black uppercase tracking-[0.06em] text-muted-foreground">
              Dia {selected}/{String(month + 1).padStart(2, "0")} ·{" "}
              {selectedDemandas.length} demanda(s)
            </h3>
            <ul className="space-y-2">
              {selectedDemandas.map((d) => {
                const cumpridos = cumpridosPorDemanda.get(d.id) ?? 0;
                const pct =
                  totalOperacionais > 0
                    ? Math.round((cumpridos / totalOperacionais) * 100)
                    : 0;
                const tags = parseTags(d.tags);
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/demandas/${d.id}`}
                        className="block truncate text-sm font-bold uppercase tracking-[0.04em] text-primary hover:text-accent"
                      >
                        {d.titulo}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {d.horaLimite} · Resp.: {d.responsavel || "—"}
                      </p>
                      {tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-muted px-1.5 py-0 text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={cn(
                          "text-sm font-black",
                          pct === 100
                            ? "text-accent"
                            : pct >= 50
                              ? "text-amber-600"
                              : "text-destructive",
                        )}
                      >
                        {pct}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {cumpridos}/{totalOperacionais}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
