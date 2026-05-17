import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth";
import { useTurma } from "@/contexts/turma";
import { loadAuthFromCookie } from "@/lib/auth-cookie";
import { notify } from "@/lib/notifications";

type DemandaRecord = {
  id: string;
  titulo: string;
  ativa: boolean;
  turma?: string;
};

type CumprimentoRecord = {
  id: string;
  user: string;
  demanda: string;
};

// Escuta a subscription realtime do PocketBase e dispara notificações
// in-app para o usuário logado. Sai gracioso quando não há sessão.
export function NotificationsWatcher() {
  const { user } = useAuth();
  const { selectedTurmaId } = useTurma();
  const userIdRef = useRef<string | null>(null);
  const turmaIdRef = useRef<string | null>(null);

  // Mantém refs atualizadas para callbacks que não querem reagir a re-renders
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);
  useEffect(() => {
    turmaIdRef.current = selectedTurmaId;
  }, [selectedTurmaId]);

  useEffect(() => {
    if (!user) return;
    const pb = loadAuthFromCookie();
    if (!pb.authStore.isValid) return;

    // Cache de demandas conhecidas para enriquecer cumprimento events
    const demandasCache = new Map<string, DemandaRecord>();
    pb.collection("demandas")
      .getFullList<DemandaRecord>({ filter: "ativa=true", requestKey: null })
      .then((list) => {
        for (const d of list) demandasCache.set(d.id, d);
      })
      .catch(() => {
        // best-effort
      });

    const onDemanda = (e: { action: string; record: DemandaRecord }) => {
      if (e.action !== "create") {
        if (e.action === "update" || e.action === "delete") {
          if (e.action === "delete") demandasCache.delete(e.record.id);
          else demandasCache.set(e.record.id, e.record);
        }
        return;
      }
      if (!e.record.ativa) return;
      // Filtra por turma se ambos definidos
      const myTurma = turmaIdRef.current;
      if (myTurma && e.record.turma && e.record.turma !== myTurma) return;

      demandasCache.set(e.record.id, e.record);
      notify({
        title: "Nova demanda",
        body: e.record.titulo,
        tag: `demanda-${e.record.id}`,
        url: "/minhas-pendencias",
      });
    };

    const onCumprimento = (e: {
      action: string;
      record: CumprimentoRecord;
    }) => {
      if (e.action !== "create") return;
      const myId = userIdRef.current;
      if (!myId || e.record.user !== myId) return;
      const d = demandasCache.get(e.record.demanda);
      notify({
        title: "Cumprimento registrado",
        body: d?.titulo
          ? `Seu cumprimento de "${d.titulo}" foi registrado.`
          : "Seu cumprimento foi registrado.",
        tag: `cumprimento-${e.record.id}`,
        url: "/dashboard",
      });
    };

    let cancelled = false;
    let unsubscribeDemandas: (() => void) | undefined;
    let unsubscribeCumprimento: (() => void) | undefined;

    pb.collection("demandas")
      .subscribe("*", onDemanda)
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else unsubscribeDemandas = unsubscribe;
      })
      .catch((err) => {
        console.warn("demandas notifications realtime disabled", err);
      });

    pb.collection("cumprimento")
      .subscribe("*", onCumprimento)
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else unsubscribeCumprimento = unsubscribe;
      })
      .catch((err) => {
        console.warn("cumprimento notifications realtime disabled", err);
      });

    return () => {
      cancelled = true;
      unsubscribeDemandas?.();
      unsubscribeCumprimento?.();
    };
  }, [user?.id]);

  return null;
}
