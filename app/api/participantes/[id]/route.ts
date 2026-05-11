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
  const { nome, celular } = await req.json();

  const db = getDb();
  db.prepare("UPDATE Participante SET nome = COALESCE(?, nome), celular = COALESCE(?, celular) WHERE id = ?").run(
    nome ?? null,
    celular ?? null,
    Number(id)
  );
  const p = db.prepare("SELECT * FROM Participante WHERE id = ?").get(Number(id));
  db.close();
  return NextResponse.json(p);
}
