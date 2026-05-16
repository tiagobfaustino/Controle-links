"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
};

export default function EditarDemandaPage() {
  const params = useParams();
  const id = params?.id as string;
  const [demanda, setDemanda] = useState<Demanda | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    pb.collection("demandas")
      .getOne<Demanda>(id)
      .then(setDemanda)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return <p className="p-8 text-center">Demanda não encontrada.</p>;
  }

  if (!demanda) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return <DemandaForm mode="edit" initial={demanda} />;
}
