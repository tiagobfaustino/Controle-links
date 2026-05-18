import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getPb } from "@/lib/pocketbase";
import { formatPhone } from "@/lib/phone";
import { toUpperPtBr } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorBanner, describeError } from "@/components/error-banner";
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
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<Usuario | null>(null);
  const [resetting, setResetting] = useState(false);
  const [editTarget, setEditTarget] = useState<Usuario | null>(null);
  const [editForm, setEditForm] = useState(blankEdit);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    const pb = getPb();
    pb.authStore.loadFromCookie(document.cookie);

    try {
      const d = await pb
        .collection("users")
        .getFullList<Usuario>({ sort: "numeroCurso,name" });
      setUsuarios(d);
      setError(null);
    } catch (err) {
      console.error("usuarios fetch", err);
      const { message, isAuthError } = describeError(err);
      if (isAuthError) {
        navigate("/login");
        return;
      }
      setError(message);
    }
  }, [navigate]);

  useEffect(() => {
    setLoading(true);
    fetchUsuarios().finally(() => setLoading(false));
  }, [fetchUsuarios]);

  function openEdit(u: Usuario) {
    setEditTarget(u);
    setEditForm({
      name: toUpperPtBr(u.name ?? ""),
      nomeFuncional: toUpperPtBr(u.nomeFuncional ?? ""),
      email: u.email,
      role: u.role,
      celular: formatPhone(u.celular ?? ""),
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
      name: toUpperPtBr(editForm.name.trim()),
      nomeFuncional: editForm.nomeFuncional
        ? toUpperPtBr(editForm.nomeFuncional.trim())
        : null,
      email: editForm.email,
      role: editForm.role,
      celular: editForm.celular || null,
      numeroCurso: editForm.numeroCurso ? Number(editForm.numeroCurso) : null,
      numPM: editForm.numPM ? Number(editForm.numPM) : null,
    };

    try {
      const updated = await pb.collection("users").update<Usuario>(editTarget.id, payload);
      setUsuarios((prev) => prev.map((u) => (u.id === editTarget.id ? { ...u, ...updated } : u)));
      toast.success("Aluno atualizado");
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
      toast.success(u.disabled ? "Aluno ativado" : "Aluno desativado");
    } catch {
      toast.error("Erro ao alterar status do aluno");
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4 border-l-4 border-accent bg-card px-4 py-3 shadow-sm">
        <div>
          <p className="tactical-heading">Efetivo autorizado</p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-[0.06em]">Alunos</h1>
        </div>
        <Button asChild>
          <Link to="/usuarios/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Aluno
          </Link>
        </Button>
      </div>

      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => {
            setLoading(true);
            fetchUsuarios().finally(() => setLoading(false));
          }}
          retrying={loading}
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : error ? null : (
        <div className="overflow-x-auto rounded-md border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.08em] w-16">Nº Curso</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.08em] w-20">Nº PM</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.08em]">Nome completo</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.08em]">Funcional</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.08em]">Email</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.08em]">Celular</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.08em]">Perfil</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.08em]">Status</th>
                <th className="px-4 py-3 text-right font-medium w-32"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b hover:bg-muted/45">
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
                        <KeyRound className="h-4 w-4 text-accent" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleAtivo(u)}
                        title={!u.disabled ? "Desativar" : "Ativar"}
                      >
                        <Power
                          className={`h-4 w-4 ${!u.disabled ? "text-accent" : "text-muted-foreground"}`}
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
            <DialogTitle className="uppercase tracking-[0.08em]">Editar Aluno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nº do Curso</Label>
                <Input
                  type="number"
                  value={editForm.numeroCurso}
                  onChange={(e) => setEditForm((f) => ({ ...f, numeroCurso: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nº PM</Label>
                <Input
                  type="number"
                  value={editForm.numPM}
                  onChange={(e) => setEditForm((f) => ({ ...f, numPM: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    name: toUpperPtBr(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>
                Nome funcional <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                value={editForm.nomeFuncional}
                onChange={(e) =>
                  setEditForm((f) => ({
                    ...f,
                    nomeFuncional: toUpperPtBr(e.target.value),
                  }))
                }
                placeholder="Ex.: ALENCAR"
              />
              <p className="text-xs text-muted-foreground">
                Parte do nome completo que aparece em <strong>negrito</strong> no dashboard.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Celular</Label>
              <Input
                inputMode="tel"
                value={editForm.celular}
                onChange={(e) => setEditForm((f) => ({ ...f, celular: formatPhone(e.target.value) }))}
                placeholder="(31) 9999-9999"
              />
            </div>
            <div className="space-y-2">
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
            <DialogTitle className="uppercase tracking-[0.08em]">Redefinir senha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A senha de <strong>{resetTarget?.name}</strong> será redefinida para{" "}
            <strong className="font-mono">tpcefs2026</strong>. O aluno será obrigado a
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
