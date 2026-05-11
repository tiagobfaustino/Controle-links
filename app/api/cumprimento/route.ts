import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.resolve(process.cwd(), "dev.db"));
}

export async function GET() {
  const db = getDb();
  try {
    const participantes = db
      .prepare("SELECT p.id, p.nome, p.celular FROM Participante p ORDER BY p.nome")
      .all() as { id: number; nome: string; celular: string }[];

    const demandas = db
      .prepare("SELECT * FROM Demanda WHERE ativa = 1 ORDER BY prazo")
      .all() as {
        id: string;
        titulo: string;
        linkForm: string;
        prazo: string;
        horaLimite: string;
        responsavel: string;
        celularResp: string;
        ativa: number;
        criadaEm: string;
      }[];

    const cumprimentos = db
      .prepare(
        "SELECT c.participanteId, c.demandaId, c.dataRegistro FROM Cumprimento c"
      )
      .all() as {
        participanteId: number;
        demandaId: string;
        dataRegistro: string;
      }[];

    return NextResponse.json({ participantes, demandas, cumprimentos });
  } finally {
    db.close();
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || (role !== "ADMIN" && role !== "GESTOR")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  let body: { participanteId?: number; demandaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { participanteId, demandaId } = body;
  if (!participanteId || !demandaId) {
    return NextResponse.json(
      { error: "participanteId e demandaId são obrigatórios." },
      { status: 400 }
    );
  }

  const db = getDb();
  try {
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
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session || (role !== "ADMIN" && role !== "GESTOR")) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  }

  let body: { participanteId?: number; demandaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { participanteId, demandaId } = body;
  if (!participanteId || !demandaId) {
    return NextResponse.json(
      { error: "participanteId e demandaId são obrigatórios." },
      { status: 400 }
    );
  }

  const db = getDb();
  try {
    db.prepare(
      "DELETE FROM Cumprimento WHERE participanteId = ? AND demandaId = ?"
    ).run(participanteId, demandaId);

    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}
