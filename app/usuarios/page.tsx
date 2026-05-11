"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Power, KeyRound } from "lucide-react";

type Usuario = {
  id: string;
  email: string;
  nome: string;
  role: string;
  firstLogin: number;
  ativo: number;
  criadoEm: string;
  participanteNome?: string;
};

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  GESTOR: "Gestor",
  PARTICIPANTE: "Participante",
};

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  GESTOR: "secondary",
  PARTICIPANTE: "outline",
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<Usuario | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((d) => { setUsuarios(d); setLoading(false); });
  }, []);

  async function toggleAtivo(u: Usuario) {
    const res = await fetch(`/api/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !u.ativo }),
    });
    if (res.ok) {
      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, ativo: u.ativo ? 0 : 1 } : x))
      );
      toast.success(u.ativo ? "Usuário desativado" : "Usuário ativado");
    }
  }

  async function confirmReset() {
    if (!resetTarget) return;
    setResetting(true);
    const res = await fetch(`/api/usuarios/${resetTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetSenha: true }),
    });
    setResetting(false);
    if (res.ok) {
      setUsuarios((prev) =>
        prev.map((x) => (x.id === resetTarget.id ? { ...x, firstLogin: 1 } : x))
      );
      toast.success(`Senha de ${resetTarget.nome} redefinida para tpcefs2026`);
      setResetTarget(null);
    } else {
      toast.error("Erro ao redefinir senha");
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Button asChild>
          <Link href="/usuarios/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Perfil</th>
                <th className="px-4 py-3 text-left font-medium">Participante</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium w-24"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {u.nome}
                    {u.firstLogin ? (
                      <span className="ml-2 text-xs text-amber-600">(1º acesso)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={roleVariant[u.role] ?? "outline"}>{roleLabel[u.role] ?? u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.participanteNome ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.ativo ? "default" : "secondary"}>
                      {u.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setResetTarget(u)}
                      title="Redefinir senha"
                    >
                      <KeyRound className="h-4 w-4 text-amber-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleAtivo(u)}
                      title={u.ativo ? "Desativar" : "Ativar"}
                    >
                      <Power className={`h-4 w-4 ${u.ativo ? "text-green-600" : "text-gray-400"}`} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm reset dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A senha de <strong>{resetTarget?.nome}</strong> será redefinida para{" "}
            <strong className="font-mono">tpcefs2026</strong>. O usuário será obrigado a
            escolher uma nova senha no próximo acesso.
          </p>
          <div className="flex gap-3 pt-2">
            <Button onClick={confirmReset} disabled={resetting} className="flex-1">
              {resetting ? "Redefinindo..." : "Confirmar"}
            </Button>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
