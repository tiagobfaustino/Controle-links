import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

function getDb() {
  return new Database(path.resolve(process.cwd(), "dev.db"));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const usuarios = db
    .prepare(
      `SELECT u.id, u.email, u.nome, u.role, u.firstLogin, u.ativo, u.criadoEm,
              p.nome as participanteNome
       FROM Usuario u
       LEFT JOIN Participante p ON p.id = u.participanteId
       ORDER BY u.criadoEm DESC`
    )
    .all();
  db.close();
  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { nome, email, role, participanteId } = await req.json();
  if (!nome || !email || !role) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM Usuario WHERE email = ?").get(email);
  if (existing) {
    db.close();
    return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
  }

  const senhaHash = bcrypt.hashSync("tpcefs2026", 12);
  const cuid = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

  db.prepare(
    `INSERT INTO Usuario (id, email, senhaHash, nome, role, firstLogin, ativo, participanteId, criadoEm)
     VALUES (?, ?, ?, ?, ?, 1, 1, ?, datetime('now'))`
  ).run(cuid, email, senhaHash, nome, role, participanteId ?? null);

  const u = db.prepare("SELECT id, email, nome, role, firstLogin, ativo, criadoEm FROM Usuario WHERE id = ?").get(cuid);
  db.close();
  return NextResponse.json(u, { status: 201 });
}
