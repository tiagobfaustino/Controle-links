import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Database from "better-sqlite3";
import path from "path";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;

  const db = new Database(path.resolve(process.cwd(), "dev.db"));
  try {
    const row = db
      .prepare("SELECT participanteId FROM Usuario WHERE id = ?")
      .get(userId) as { participanteId: number | null } | undefined;

    return NextResponse.json({ participanteId: row?.participanteId ?? null });
  } finally {
    db.close();
  }
}
