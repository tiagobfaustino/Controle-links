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
    const usuarios = db
      .prepare(
        `SELECT id, nome, nomeExibicao, celular, numCurso
         FROM Usuario
         WHERE ativo = 1
         ORDER BY COALESCE(numCurso, 9999), nome`
      )
      .all() as {
        id: string;
        nome: string;
        nomeExibicao: string | null;
        celular: string | null;
        numCurso: number | null;
      }[];

    const demandas = db
      .prepare("SELECT * FROM Demanda WHERE ativa = 1 ORDER BY prazo")
      .all() as {
        id: string;
        titulo: string;
        linkForm: string;
        prazo: string;
        horaLimite: string;
        responsavelId: string;
        ativa: number;
        criadaEm: string;
      }[];

    const cumprimentos = db
      .prepare(
        "SELECT c.usuarioId, c.demandaId, c.dataRegistro FROM Cumprimento c"
      )
      .all() as {
        usuarioId: string;
        demandaId: string;
        dataRegistro: string;
      }[];

    return NextResponse.json({ usuarios, demandas, cumprimentos });
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

  let body: { usuarioId?: string; demandaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { usuarioId, demandaId } = body;
  if (!usuarioId || !demandaId) {
    return NextResponse.json(
      { error: "usuarioId e demandaId são obrigatórios." },
      { status: 400 }
    );
  }

  const db = getDb();
  try {
    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    db.prepare(
      `INSERT OR IGNORE INTO Cumprimento (id, usuarioId, demandaId, dataRegistro)
       VALUES (?, ?, ?, datetime('now'))`
    ).run(id, usuarioId, demandaId);

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

  let body: { usuarioId?: string; demandaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const { usuarioId, demandaId } = body;
  if (!usuarioId || !demandaId) {
    return NextResponse.json(
      { error: "usuarioId e demandaId são obrigatórios." },
      { status: 400 }
    );
  }

  const db = getDb();
  try {
    db.prepare(
      "DELETE FROM Cumprimento WHERE usuarioId = ? AND demandaId = ?"
    ).run(usuarioId, demandaId);

    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}
