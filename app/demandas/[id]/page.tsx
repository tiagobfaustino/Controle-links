import Database from "better-sqlite3";
import path from "path";
import { DemandaForm } from "@/components/demanda-form";

function getDemanda(id: string) {
  const db = new Database(path.resolve(process.cwd(), "dev.db"));
  try {
    return db.prepare("SELECT * FROM Demanda WHERE id = ?").get(id) ?? null;
  } finally {
    db.close();
  }
}

export default async function EditarDemandaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demanda = getDemanda(id);
  if (!demanda) return <p className="p-8 text-center">Demanda não encontrada.</p>;
  return <DemandaForm mode="edit" initial={demanda as Parameters<typeof DemandaForm>[0]["initial"]} />;
}
