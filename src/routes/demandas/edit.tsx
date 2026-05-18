import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { getPb } from "@/lib/pocketbase";
import { DemandaForm } from "@/components/demanda-form";

type Demanda = {
  id: string;
  titulo: string;
  linkForm: string;
  prazo: string;
  horaLimite: string;
  responsavel: string;
  celularResp: string;
  ativa: boolean;
  observacao?: string;
};

function normalizeIdentity(value?: string): string {
  return (value || "").trim().toUpperCase();
}

export default function EditarDemandaPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const [demanda, setDemanda] = useState<Demanda | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    setNotFound(false);
    setDemanda(null);

    pb.collection("demandas")
      .getOne<Demanda>(id, { requestKey: null })
      .then((record) => {
        setDemanda(record);
        setNotFound(false);
      })
      .catch((err: unknown) => {
        const status =
          typeof err === "object" && err !== null && "status" in err
            ? (err as { status?: number }).status
            : undefined;

        if (status === 0) return;
        setNotFound(true);
      });
  }, [id]);

  if (!demanda) {
    if (notFound) {
      return <p className="p-8 text-center">Demanda não encontrada.</p>;
    }

    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-64 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  const responsavel = normalizeIdentity(demanda.responsavel);
  const canManage =
    user?.role === "ADMIN" ||
    (responsavel !== "" &&
      (responsavel === normalizeIdentity(user?.nomeFuncional) ||
        responsavel === normalizeIdentity(user?.name)));

  if (!canManage) {
    return (
      <p className="p-8 text-center">
        Você só pode editar demandas cadastradas por você.
      </p>
    );
  }

  return <DemandaForm mode="edit" initial={demanda} />;
}
