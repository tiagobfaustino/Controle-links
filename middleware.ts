import { NextRequest, NextResponse } from "next/server";

const PROTECTED = [
  "/dashboard",
  "/demandas",
  "/participantes",
  "/usuarios",
  "/alterar-senha",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // PocketBase stores auth in cookie named "pb_auth"
  const cookie = req.cookies.get("pb_auth")?.value;
  if (!cookie) return NextResponse.redirect(new URL("/login", req.url));

  try {
    // pb_auth cookie value is a JSON string: { token, model }
    const parsed = JSON.parse(decodeURIComponent(cookie));
    const token: string = parsed?.token ?? "";
    if (!token) return NextResponse.redirect(new URL("/login", req.url));

    // Decode JWT payload (no verification needed for redirect logic)
    const parts = token.split(".");
    if (parts.length < 2) return NextResponse.redirect(new URL("/login", req.url));

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    const expired = payload.exp && Date.now() / 1000 > payload.exp;
    if (expired) return NextResponse.redirect(new URL("/login", req.url));
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/demandas/:path*",
    "/participantes/:path*",
    "/usuarios/:path*",
    "/alterar-senha",
  ],
};
