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
  const demandas = db.prepare("SELECT * FROM Demanda ORDER BY prazo ASC").all();
  db.close();
  return NextResponse.json(demandas);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "GESTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { titulo, linkForm, prazo, horaLimite, responsavel, celularResp } = body;

  if (!titulo || !linkForm || !prazo || !horaLimite || !responsavel || !celularResp) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const db = getDb();
  const cuid = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  db.prepare(
    `INSERT INTO Demanda (id, titulo, linkForm, prazo, horaLimite, responsavel, celularResp, ativa, criadaEm)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
  ).run(cuid, titulo, linkForm, prazo, horaLimite, responsavel, celularResp);

  const demanda = db.prepare("SELECT * FROM Demanda WHERE id = ?").get(cuid);
  db.close();
  return NextResponse.json(demanda, { status: 201 });
}
