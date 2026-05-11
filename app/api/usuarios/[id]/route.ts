import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
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
  if (body.ativo !== undefined) {
    db.prepare("UPDATE Usuario SET ativo = ? WHERE id = ?").run(body.ativo ? 1 : 0, id);
  }
  if (body.nome !== undefined) {
    db.prepare("UPDATE Usuario SET nome = ? WHERE id = ?").run(body.nome, id);
  }
  if (body.role !== undefined) {
    db.prepare("UPDATE Usuario SET role = ? WHERE id = ?").run(body.role, id);
  }

  const u = db
    .prepare("SELECT id, email, nome, role, firstLogin, ativo, criadoEm FROM Usuario WHERE id = ?")
    .get(id);
  db.close();
  return NextResponse.json(u);
}
