import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.resolve(process.cwd(), "dev.db"));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  try {
    const demandas = db
      .prepare(
        `SELECT d.*, u.nome AS responsavelNome, u.celular AS responsavelCelular
         FROM Demanda d
         JOIN Usuario u ON u.id = d.responsavelId
         ORDER BY d.prazo ASC`
      )
      .all();
    return NextResponse.json(demandas);
  } finally {
    db.close();
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "GESTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { titulo, linkForm, prazo, horaLimite, responsavelId } = body;

  if (!titulo || !linkForm || !prazo || !horaLimite || !responsavelId) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const db = getDb();
  try {
    const resp = db.prepare("SELECT id FROM Usuario WHERE id = ?").get(responsavelId);
    if (!resp) {
      return NextResponse.json({ error: "Responsável inválido" }, { status: 400 });
    }

    const cuid = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    db.prepare(
      `INSERT INTO Demanda (id, titulo, linkForm, prazo, horaLimite, responsavelId, ativa, criadaEm)
       VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`
    ).run(cuid, titulo, linkForm, prazo, horaLimite, responsavelId);

    const demanda = db
      .prepare(
        `SELECT d.*, u.nome AS responsavelNome, u.celular AS responsavelCelular
         FROM Demanda d JOIN Usuario u ON u.id = d.responsavelId
         WHERE d.id = ?`
      )
      .get(cuid);
    return NextResponse.json(demanda, { status: 201 });
  } finally {
    db.close();
  }
}
