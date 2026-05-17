export function buildTurmaFilter(selectedTurmaId: string | null): string {
  if (!selectedTurmaId) return "";
  return `(turma = "${selectedTurmaId}" || turma = null || turma = "")`;
}

export function isTurmaSchemaError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { status?: number; message?: string; data?: unknown };
  if (e.status !== 400) return false;

  const details = `${e.message ?? ""} ${JSON.stringify(e.data ?? "")}`;
  return details.toLowerCase().includes("turma");
}
