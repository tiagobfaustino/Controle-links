import { DemandaForm } from "@/components/demanda-form";

async function getDemanda(id: string) {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/demandas/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function EditarDemandaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demanda = await getDemanda(id);
  if (!demanda) return <p className="p-8 text-center">Demanda não encontrada.</p>;
  return <DemandaForm mode="edit" initial={demanda} />;
}
