import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";

function getDb() {
  return new Database(path.resolve(process.cwd(), "dev.db"));
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as never as { role: "ADMIN" | "GESTOR" | "PARTICIPANTE" }).role;
        token.firstLogin = (user as never as { firstLogin: boolean }).firstLogin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as never as { id: string }).id = token.id as string;
        (session.user as never as { role: string }).role = token.role as string;
        (session.user as never as { firstLogin: boolean }).firstLogin = token.firstLogin as boolean;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = getDb();
        const user = db
          .prepare("SELECT * FROM Usuario WHERE email = ? AND ativo = 1")
          .get(credentials.email) as
          | {
              id: string;
              email: string;
              senhaHash: string;
              nome: string;
              role: string;
              firstLogin: number;
              ativo: number;
            }
          | undefined;
        db.close();

        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.senhaHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.nome,
          role: user.role,
          firstLogin: user.firstLogin === 1,
        };
      },
    }),
  ],
};
