import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { getPb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Power, KeyRound, Pencil } from "lucide-react";

type Usuario = {
  id: string;
  email: string;
  name: string;
  nomeFuncional?: string;
  role: string;
  firstLogin: boolean;
  disabled: boolean;
  celular?: string;
  numeroCurso?: number;
  numPM?: number;
  created: string;
};

const roleLabel: Record<string, string> = {
  ADMIN: "Admin",
  GESTOR: "Gestor",
};

const roleVariant: Record<string, "default" | "secondary"> = {
  ADMIN: "default",
  GESTOR: "secondary",
};

const blankEdit = {
  name: "",
  nomeFuncional: "",
  email: "",
  role: "GESTOR",
  celular: "",
  numeroCurso: "",
  numPM: "",
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<Usuario | null>(null);
  const [resetting, setResetting] = useState(false);
  const [editTarget, setEditTarget] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState(blankEdit);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    pb.collection("users")
      .getFullList<Usuario>({ sort: "numeroCurso,name" })
      .then((d) => {
        setUsuarios(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function openEdit(u: Usuario) {
    setEditTarget(u);
    setEditForm({
      name: u.name ?? "",
      nomeFuncional: u.nomeFuncional ?? "",
      email: u.email,
      role: u.role,
      celular: u.celular ?? "",
      numeroCurso: u.numeroCurso ? String(u.numeroCurso) : "",
      numPM: u.numPM ? String(u.numPM) : "",
    });
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSavingEdit(true);

    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    const payload: Record<string, unknown> = {
      name: editForm.name,
      nomeFuncional: editForm.nomeFuncional || null,
      email: editForm.email,
      role: editForm.role,
      celular: editForm.celular || null,
      numeroCurso: editForm.numeroCurso ? Number(editForm.numeroCurso) : null,
      numPM: editForm.numPM ? Number(editForm.numPM) : null,
    };

    try {
      const updated = await pb.collection("users").update<Usuario>(editTarget.id, payload);
      setUsuarios((prev) => prev.map((u) => (u.id === editTarget.id ? { ...u, ...updated } : u)));
      toast.success("Usuário atualizado");
      setEditTarget(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleAtivo(u: Usuario) {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      await pb.collection("users").update(u.id, { disabled: !u.disabled });
      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, disabled: !u.disabled } : x))
      );
      toast.success(u.disabled ? "Usuário ativado" : "Usuário desativado");
    } catch {
      toast.error("Erro ao alterar status do usuário");
    }
  }

  async function confirmReset() {
    if (!resetTarget) return;
    setResetting(true);

    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      await pb.collection("users").update(resetTarget.id, {
        password: "tpcefs2026",
        passwordConfirm: "tpcefs2026",
        firstLogin: true,
      });
      setUsuarios((prev) =>
        prev.map((x) =>
          x.id === resetTarget.id ? { ...x, firstLogin: true } : x
        )
      );
      toast.success(`Senha de ${resetTarget.name} redefinida para tpcefs2026`);
      setResetTarget(null);
    } catch {
      toast.error("Erro ao redefinir senha");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <Button asChild>
          <Link to="/usuarios/novo">
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
                <th className="px-4 py-3 text-left font-medium w-16">Nº Curso</th>
                <th className="px-4 py-3 text-left font-medium w-20">Nº PM</th>
                <th className="px-4 py-3 text-left font-medium">Nome completo</th>
                <th className="px-4 py-3 text-left font-medium">Funcional</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Celular</th>
                <th className="px-4 py-3 text-left font-medium">Perfil</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    {u.numeroCurso ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted-foreground text-xs">
                    {u.numPM ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {u.name || "—"}
                    {u.firstLogin ? (
                      <span className="ml-2 text-xs text-amber-600">(1º acesso)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.nomeFuncional || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.celular || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={roleVariant[u.role] ?? "secondary"}>
                      {roleLabel[u.role] ?? u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={!u.disabled ? "default" : "secondary"}>
                      {!u.disabled ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(u)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
                        title={!u.disabled ? "Desativar" : "Ativar"}
                      >
                        <Power
                          className={`h-4 w-4 ${!u.disabled ? "text-green-600" : "text-gray-400"}`}
                        />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nº do Curso</Label>
                <Input
                  type="number"
                  value={editForm.numeroCurso}
                  onChange={(e) => setEditForm((f) => ({ ...f, numeroCurso: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Nº PM</Label>
                <Input
                  type="number"
                  value={editForm.numPM}
                  onChange={(e) => setEditForm((f) => ({ ...f, numPM: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Nome completo</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>
                Nome funcional <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                value={editForm.nomeFuncional}
                onChange={(e) => setEditForm((f) => ({ ...f, nomeFuncional: e.target.value }))}
                placeholder="Ex.: ALENCAR"
              />
              <p className="text-xs text-muted-foreground">
                Parte do nome completo que aparece em <strong>negrito</strong> no dashboard.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Celular</Label>
              <Input
                value={editForm.celular}
                onChange={(e) => setEditForm((f) => ({ ...f, celular: e.target.value }))}
                placeholder="(31) 99999-9999"
              />
            </div>
            <div className="space-y-1">
              <Label>Perfil</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GESTOR">Gestor</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={saveEdit} disabled={savingEdit} className="flex-1">
                {savingEdit ? "Salvando..." : "Salvar"}
              </Button>
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A senha de <strong>{resetTarget?.name}</strong> será redefinida para{" "}
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
