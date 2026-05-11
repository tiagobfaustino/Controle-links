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
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const participantes = db
    .prepare(
      `SELECT p.*, u.email as usuarioEmail, u.ativo as usuarioAtivo
       FROM Participante p
       LEFT JOIN Usuario u ON u.participanteId = p.id
       ORDER BY p.id`
    )
    .all();
  db.close();
  return NextResponse.json(participantes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, nome, celular } = await req.json();
  if (!id || !nome || !celular) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO Participante (id, nome, celular) VALUES (?, ?, ?)").run(
    id,
    nome,
    celular
  );
  const p = db.prepare("SELECT * FROM Participante WHERE id = ?").get(id);
  db.close();
  return NextResponse.json(p, { status: 201 });
}
