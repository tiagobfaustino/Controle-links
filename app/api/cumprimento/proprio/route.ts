import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.resolve(process.cwd(), "dev.db"));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!session || user?.role !== "PARTICIPANTE") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  let body: { demandaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { demandaId } = body;
  if (!demandaId) {
    return NextResponse.json({ error: "demandaId é obrigatório." }, { status: 400 });
  }

  const db = getDb();
  try {
    const usuarioRow = db
      .prepare("SELECT participanteId FROM Usuario WHERE id = ?")
      .get(user!.id) as { participanteId: number | null } | undefined;

    if (!usuarioRow?.participanteId) {
      return NextResponse.json(
        { error: "Usuário não vinculado a um participante." },
        { status: 400 }
      );
    }

    const participanteId = usuarioRow.participanteId;

    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    db.prepare(
      `INSERT OR IGNORE INTO Cumprimento (id, participanteId, demandaId, dataRegistro)
       VALUES (?, ?, ?, datetime('now'))`
    ).run(id, participanteId, demandaId);

    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!session || user?.role !== "PARTICIPANTE") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  let body: { demandaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { demandaId } = body;
  if (!demandaId) {
    return NextResponse.json({ error: "demandaId é obrigatório." }, { status: 400 });
  }

  const db = getDb();
  try {
    const usuarioRow = db
      .prepare("SELECT participanteId FROM Usuario WHERE id = ?")
      .get(user!.id) as { participanteId: number | null } | undefined;

    if (!usuarioRow?.participanteId) {
      return NextResponse.json(
        { error: "Usuário não vinculado a um participante." },
        { status: 400 }
      );
    }

    const participanteId = usuarioRow.participanteId;

    // Only allow deletion if the demanda deadline has not passed
    const demanda = db
      .prepare("SELECT prazo, horaLimite FROM Demanda WHERE id = ?")
      .get(demandaId) as { prazo: string; horaLimite: string } | undefined;

    if (!demanda) {
      return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });
    }

    // Parse deadline: prazo is stored as ISO string from SQLite
    const prazoDate = new Date(demanda.prazo);
    const now = new Date();

    if (now > prazoDate) {
      return NextResponse.json(
        { error: "O prazo para esta demanda já encerrou." },
        { status: 403 }
      );
    }

    db.prepare(
      "DELETE FROM Cumprimento WHERE participanteId = ? AND demandaId = ?"
    ).run(participanteId, demandaId);

    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}
