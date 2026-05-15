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
  try {
    const demanda = db
      .prepare(
        `SELECT d.*, u.nome AS responsavelNome, u.celular AS responsavelCelular
         FROM Demanda d JOIN Usuario u ON u.id = d.responsavelId
         WHERE d.id = ?`
      )
      .get(id);
    if (!demanda) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(demanda);
  } finally {
    db.close();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "GESTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const db = getDb();
  try {
    const existing = db.prepare("SELECT * FROM Demanda WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.responsavelId !== undefined) {
      const resp = db.prepare("SELECT id FROM Usuario WHERE id = ?").get(body.responsavelId);
      if (!resp) {
        return NextResponse.json({ error: "Responsável inválido" }, { status: 400 });
      }
    }

    db.prepare(
      `UPDATE Demanda SET
        titulo        = COALESCE(?, titulo),
        linkForm      = COALESCE(?, linkForm),
        prazo         = COALESCE(?, prazo),
        horaLimite    = COALESCE(?, horaLimite),
        responsavelId = COALESCE(?, responsavelId),
        ativa         = COALESCE(?, ativa)
       WHERE id = ?`
    ).run(
      body.titulo ?? null,
      body.linkForm ?? null,
      body.prazo ?? null,
      body.horaLimite ?? null,
      body.responsavelId ?? null,
      body.ativa === undefined ? null : (body.ativa ? 1 : 0),
      id
    );

    const demanda = db
      .prepare(
        `SELECT d.*, u.nome AS responsavelNome, u.celular AS responsavelCelular
         FROM Demanda d JOIN Usuario u ON u.id = d.responsavelId
         WHERE d.id = ?`
      )
      .get(id);
    return NextResponse.json(demanda);
  } finally {
    db.close();
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = getDb();
  try {
    db.prepare("DELETE FROM Cumprimento WHERE demandaId = ?").run(id);
    db.prepare("DELETE FROM Demanda WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}
