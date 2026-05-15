import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

function getDb() {
  return new Database(path.resolve(process.cwd(), "dev.db"));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const db = getDb();
  try {
    if (body.email !== undefined) {
      const dup = db
        .prepare("SELECT id FROM Usuario WHERE email = ? AND id <> ?")
        .get(body.email, id);
      if (dup) {
        return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
      }
      db.prepare("UPDATE Usuario SET email = ? WHERE id = ?").run(body.email, id);
    }
    if (body.numCurso !== undefined) {
      const n = body.numCurso === null || body.numCurso === "" ? null : Number(body.numCurso);
      if (n != null) {
        const dup = db
          .prepare("SELECT id FROM Usuario WHERE numCurso = ? AND id <> ?")
          .get(n, id);
        if (dup) {
          return NextResponse.json({ error: "Nº Curso já cadastrado" }, { status: 409 });
        }
      }
      db.prepare("UPDATE Usuario SET numCurso = ? WHERE id = ?").run(n, id);
    }
    if (body.ativo !== undefined) {
      db.prepare("UPDATE Usuario SET ativo = ? WHERE id = ?").run(body.ativo ? 1 : 0, id);
    }
    if (body.nome !== undefined) {
      db.prepare("UPDATE Usuario SET nome = ? WHERE id = ?").run(body.nome, id);
    }
    if (body.nomeExibicao !== undefined) {
      db.prepare("UPDATE Usuario SET nomeExibicao = ? WHERE id = ?").run(body.nomeExibicao ?? null, id);
    }
    if (body.celular !== undefined) {
      db.prepare("UPDATE Usuario SET celular = ? WHERE id = ?").run(body.celular ?? null, id);
    }
    if (body.role !== undefined) {
      db.prepare("UPDATE Usuario SET role = ? WHERE id = ?").run(body.role, id);
    }
    if (body.resetSenha === true) {
      const senhaHash = bcrypt.hashSync("tpcefs2026", 12);
      db.prepare("UPDATE Usuario SET senhaHash = ?, firstLogin = 1 WHERE id = ?").run(senhaHash, id);
    }

    const u = db
      .prepare(
        `SELECT id, email, nome, nomeExibicao, celular, numCurso, role, firstLogin, ativo, criadoEm
         FROM Usuario WHERE id = ?`
      )
      .get(id);
    return NextResponse.json(u);
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
  if (id === session.user.id) {
    return NextResponse.json({ error: "Você não pode excluir seu próprio usuário." }, { status: 400 });
  }

  const db = getDb();
  try {
    const isResp = db
      .prepare("SELECT 1 FROM Demanda WHERE responsavelId = ? LIMIT 1")
      .get(id);
    if (isResp) {
      return NextResponse.json(
        { error: "Usuário é responsável por alguma demanda — atribua outro responsável antes." },
        { status: 409 }
      );
    }
    db.prepare("DELETE FROM Cumprimento WHERE usuarioId = ?").run(id);
    db.prepare("DELETE FROM Usuario WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } finally {
    db.close();
  }
}
