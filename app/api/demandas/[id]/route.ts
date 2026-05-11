import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.resolve(process.cwd(), "dev.db"));
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const demanda = db.prepare("SELECT * FROM Demanda WHERE id = ?").get(id);
  db.close();

  if (!demanda) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(demanda);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "GESTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { titulo, linkForm, prazo, horaLimite, responsavel, celularResp, ativa } = body;

  const db = getDb();
  const existing = db.prepare("SELECT * FROM Demanda WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) { db.close(); return NextResponse.json({ error: "Not found" }, { status: 404 }); }

  db.prepare(
    `UPDATE Demanda SET
      titulo = ?, linkForm = ?, prazo = ?, horaLimite = ?,
      responsavel = ?, celularResp = ?, ativa = ?
     WHERE id = ?`
  ).run(
    titulo ?? existing.titulo,
    linkForm ?? existing.linkForm,
    prazo ?? existing.prazo,
    horaLimite ?? existing.horaLimite,
    responsavel ?? existing.responsavel,
    celularResp ?? existing.celularResp,
    ativa !== undefined ? (ativa ? 1 : 0) : existing.ativa,
    id
  );

  const demanda = db.prepare("SELECT * FROM Demanda WHERE id = ?").get(id);
  db.close();
  return NextResponse.json(demanda);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM Cumprimento WHERE demandaId = ?").run(id);
  db.prepare("DELETE FROM Demanda WHERE id = ?").run(id);
  db.close();
  return NextResponse.json({ ok: true });
}
