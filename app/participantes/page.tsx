"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

type Participante = {
  id: number;
  nome: string;
  celular: string;
  usuarioEmail?: string;
  usuarioAtivo?: number;
};

export default function ParticipantesPage() {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Participante | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCelular, setEditCelular] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/participantes")
      .then((r) => r.json())
      .then((d) => { setParticipantes(d); setLoading(false); });
  }, []);

  function openEdit(p: Participante) {
    setEditing(p);
    setEditNome(p.nome);
    setEditCelular(p.celular);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch(`/api/participantes/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: editNome, celular: editCelular }),
    });
    setSaving(false);
    if (res.ok) {
      setParticipantes((prev) =>
        prev.map((p) =>
          p.id === editing.id ? { ...p, nome: editNome, celular: editCelular } : p
        )
      );
      setEditing(null);
      toast.success("Participante atualizado");
    } else {
      toast.error("Erro ao salvar");
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Participantes</h1>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-16">Nº</th>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Celular</th>
                <th className="px-4 py-3 text-left font-medium">Usuário</th>
                <th className="px-4 py-3 text-right font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {participantes.map((p) => (
                <tr key={p.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-muted-foreground">{p.id}</td>
                  <td className="px-4 py-3 font-medium">{p.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.celular}</td>
                  <td className="px-4 py-3">
                    {p.usuarioEmail ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs truncate max-w-[160px]">{p.usuarioEmail}</span>
                        <Badge variant={p.usuarioAtivo ? "default" : "secondary"} className="text-xs">
                          {p.usuarioAtivo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem acesso</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Dialog open={editing?.id === p.id} onOpenChange={(o) => !o && setEditing(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Participante #{p.id}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="space-y-1">
                            <Label>Nome</Label>
                            <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label>Celular</Label>
                            <Input value={editCelular} onChange={(e) => setEditCelular(e.target.value)} />
                          </div>
                          <Button onClick={saveEdit} disabled={saving} className="w-full">
                            {saving ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
