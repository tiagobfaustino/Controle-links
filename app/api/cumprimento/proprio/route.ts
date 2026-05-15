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
  const user = session?.user as { id?: string } | undefined;

  if (!session || !user?.id) {
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
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    db.prepare(
      `INSERT OR IGNORE INTO Cumprimento (id, usuarioId, demandaId, dataRegistro)
       VALUES (?, ?, ?, datetime('now'))`
    ).run(id, user.id, demandaId);

    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;

  if (!session || !user?.id) {
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
    const demanda = db
      .prepare("SELECT prazo, horaLimite FROM Demanda WHERE id = ?")
      .get(demandaId) as { prazo: string; horaLimite: string } | undefined;

    if (!demanda) {
      return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });
    }

    const prazoDate = new Date(demanda.prazo);
    if (new Date() > prazoDate) {
      return NextResponse.json(
        { error: "O prazo para esta demanda já encerrou." },
        { status: 403 }
      );
    }

    db.prepare(
      "DELETE FROM Cumprimento WHERE usuarioId = ? AND demandaId = ?"
    ).run(user.id, demandaId);

    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}
