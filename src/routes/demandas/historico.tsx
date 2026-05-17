import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { getPb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorBanner, describeError } from "@/components/error-banner";
import { ArrowLeft, CheckCircle2, XCircle, History } from "lucide-react";

type LogEntry = {
  id: string;
  action: "create" | "delete";
  demanda: string;
  targetUser: string;
  actor: string;
  created?: string;
};

type UserLite = {
  id: string;
  name: string;
  nomeFuncional?: string;
  email: string;
};

type Demanda = {
  id: string;
  titulo: string;
  responsavel?: string;
};

function normalizeIdentity(value?: string): string {
  return (value || "").trim().toUpperCase();
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function displayName(u?: UserLite): string {
  if (!u) return "—";
  return u.nomeFuncional || u.name || u.email;
}

export default function HistoricoDemandaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [demanda, setDemanda] = useState<Demanda | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [users, setUsers] = useState<Map<string, UserLite>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logsUnavailable, setLogsUnavailable] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      const [d, usuariosList] = await Promise.all([
        pb.collection("demandas").getOne<Demanda>(id, { requestKey: null }),
        pb.collection("users").getFullList<UserLite>({ requestKey: null }),
      ]);

      const userMap = new Map<string, UserLite>();
      for (const u of usuariosList) userMap.set(u.id, u);

      const canView =
        user?.role === "ADMIN" ||
        normalizeIdentity(d.responsavel) === normalizeIdentity(user?.nomeFuncional) ||
        normalizeIdentity(d.responsavel) === normalizeIdentity(user?.name);

      if (!canView) {
        setError("Você não tem permissão para ver os logs desta demanda.");
        setDemanda(d);
        setEntries([]);
        setUsers(userMap);
        return;
      }

      let log: LogEntry[] = [];
      try {
        const allLogs = await pb.collection("cumprimento_log").getFullList<LogEntry>({
          requestKey: null,
        });
        log = allLogs
          .filter((entry) => entry.demanda === id)
          .sort(
            (a, b) =>
              new Date(b.created ?? 0).getTime() -
              new Date(a.created ?? 0).getTime(),
          );
        setLogsUnavailable(null);
      } catch (logErr) {
        console.error("historico logs fetch", logErr);
        const { message } = describeError(logErr);
        setLogsUnavailable(
          `Não foi possível carregar os logs. Verifique se a migration cumprimento_log foi aplicada no PocketBase. Detalhe: ${message}`,
        );
      }

      setDemanda(d);
      setEntries(log);
      setUsers(userMap);
      setError(null);
    } catch (err) {
      console.error("historico fetch", err);
      const { message, isAuthError } = describeError(err);
      if (isAuthError) {
        navigate("/login");
        return;
      }
      setError(message);
    }
  }, [id, navigate, user?.name, user?.nomeFuncional, user?.role]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4 border-l-4 border-accent bg-card px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <p className="tactical-heading">Auditoria</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.06em] truncate">
            Histórico {demanda ? `— ${demanda.titulo}` : ""}
          </h1>
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

      {logsUnavailable && !error && (
        <ErrorBanner
          message={logsUnavailable}
          onRetry={() => {
            setLoading(true);
            fetchAll().finally(() => setLoading(false));
          }}
          retrying={loading}
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : error || logsUnavailable ? null : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <History className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">
              Nenhuma marcação registrada para esta demanda ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b border-border bg-muted/30">
            <CardTitle className="text-sm font-black uppercase tracking-[0.08em] text-muted-foreground">
              {entries.length}{" "}
              {entries.length === 1 ? "evento" : "eventos"} registrados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-black uppercase tracking-[0.06em] w-32">
                    Quando
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-black uppercase tracking-[0.06em] w-24">
                    Ação
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-black uppercase tracking-[0.06em]">
                    Usuário marcado
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-black uppercase tracking-[0.06em]">
                    Por
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const target = users.get(entry.targetUser);
                  const actor = users.get(entry.actor);
                  const isCreate = entry.action === "create";
                  return (
                    <tr key={entry.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {formatDateTime(entry.created)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isCreate ? "default" : "secondary"}>
                          {isCreate ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              Marcou
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="size-3" />
                              Desmarcou
                            </span>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {displayName(target)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {displayName(actor)}
                        {actor && target && actor.id === target.id && (
                          <span className="ml-2 text-xs italic">
                            (próprio)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
