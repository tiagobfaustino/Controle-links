import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { novaSenha?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { novaSenha } = body;

  if (!novaSenha || typeof novaSenha !== "string" || novaSenha.length < 8) {
    return NextResponse.json(
      { error: "A senha deve ter pelo menos 8 caracteres." },
      { status: 400 }
    );
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const senhaHash = await bcrypt.hash(novaSenha, 12);

  const db = new Database(path.resolve(process.cwd(), "dev.db"));
  try {
    db.prepare(
      "UPDATE Usuario SET senhaHash = ?, firstLogin = 0 WHERE id = ?"
    ).run(senhaHash, userId);
  } finally {
    db.close();
  }

  return NextResponse.json({ ok: true });
}
