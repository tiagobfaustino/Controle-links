import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Force password change on first login
    if (token?.firstLogin && pathname !== "/alterar-senha") {
      return NextResponse.redirect(new URL("/alterar-senha", req.url));
    }

    // Role-based access
    const role = token?.role;

    const gestorOnlyPaths = ["/demandas"];
    const adminOnlyPaths = ["/usuarios"];

    const isAdminOnly = adminOnlyPaths.some((p) => pathname.startsWith(p));
    const isGestorOrAdmin = gestorOnlyPaths.some((p) => pathname.startsWith(p));

    if (isAdminOnly && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (isGestorOrAdmin && role === "PARTICIPANTE") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/demandas/:path*",
    "/usuarios/:path*",
    "/alterar-senha",
  ],
};
