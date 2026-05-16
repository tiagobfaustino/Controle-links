"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getPb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Power } from "lucide-react";

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

function formatDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

export default function DemandasPage() {
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    pb.collection("demandas")
      .getFullList<Demanda>({ sort: "-created" })
      .then((d) => {
        setDemandas(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function toggleAtiva(d: Demanda) {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      await pb.collection("demandas").update(d.id, { ativa: !d.ativa });
      setDemandas((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, ativa: !d.ativa } : x))
      );
      toast.success(d.ativa ? "Demanda desativada" : "Demanda ativada");
    } catch {
      toast.error("Erro ao alterar status da demanda");
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Demandas</h1>
        <Button asChild>
          <Link href="/demandas/nova">
            <Plus className="h-4 w-4 mr-2" />
            Nova Demanda
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : demandas.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">
          Nenhuma demanda cadastrada ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {demandas.map((d) => (
            <Card key={d.id} className={d.ativa ? "" : "opacity-60"}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{d.titulo}</CardTitle>
                      <Badge variant={d.ativa ? "default" : "secondary"}>
                        {d.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Prazo: {formatDate(d.prazo)} às {d.horaLimite} — Resp.: {d.responsavel}
                    </p>
                    <a
                      href={d.linkForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {d.linkForm}
                    </a>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/demandas/${d.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleAtiva(d)}
                      title={d.ativa ? "Desativar" : "Ativar"}
                    >
                      <Power className={`h-4 w-4 ${d.ativa ? "text-green-600" : "text-gray-400"}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
