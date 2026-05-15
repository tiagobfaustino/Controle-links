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
  try {
    const usuarios = db
      .prepare(
        `SELECT id, email, nome, nomeExibicao, celular, numCurso,
                role, firstLogin, ativo, criadoEm
         FROM Usuario
         ORDER BY COALESCE(numCurso, 99999), criadoEm DESC`
      )
      .all();
    return NextResponse.json(usuarios);
  } finally {
    db.close();
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { nome, nomeExibicao, celular, numCurso, email, role } = await req.json();
  if (!nome || !email || !role) {
    return NextResponse.json({ error: "Nome, email e perfil são obrigatórios" }, { status: 400 });
  }

  const db = getDb();
  try {
    const dupEmail = db.prepare("SELECT id FROM Usuario WHERE email = ?").get(email);
    if (dupEmail) {
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
    }
    if (numCurso != null) {
      const dupNum = db.prepare("SELECT id FROM Usuario WHERE numCurso = ?").get(Number(numCurso));
      if (dupNum) {
        return NextResponse.json({ error: "Nº Curso já cadastrado" }, { status: 409 });
      }
    }

    const senhaHash = bcrypt.hashSync("tpcefs2026", 12);
    const cuid = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

    db.prepare(
      `INSERT INTO Usuario (id, email, senhaHash, nome, nomeExibicao, celular, numCurso, role, firstLogin, ativo, criadoEm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'))`
    ).run(
      cuid,
      email,
      senhaHash,
      nome,
      nomeExibicao ?? null,
      celular ?? null,
      numCurso != null ? Number(numCurso) : null,
      role
    );

    const u = db
      .prepare(
        "SELECT id, email, nome, nomeExibicao, celular, numCurso, role, firstLogin, ativo, criadoEm FROM Usuario WHERE id = ?"
      )
      .get(cuid);
    return NextResponse.json(u, { status: 201 });
  } finally {
    db.close();
  }
}
