import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_ROUTES: Record<string, string> = {
  "/admin": "administrador",
  "/cliente": "cliente",
  "/empleado": "empleado",
};

const PUBLIC_ROUTES = ["/login", "/registro"];

function decodeJwtPayload(token: string) {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(base64);
  return JSON.parse(json);
}

function getDashboard(tipo_usuario: string) {
  const map: Record<string, string> = {
    administrador: "/admin/dashboard",
    empleado: "/empleado/dashboard",
    cliente: "/cliente/dashboard",
  };
  return map[tipo_usuario] || "/login";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (token) {
      try {
        const payload = decodeJwtPayload(token);
        if (payload.exp * 1000 > Date.now()) {
          return NextResponse.redirect(new URL(getDashboard(payload.tipo_usuario), request.url));
        }
      } catch {}
    }
    return NextResponse.next();
  }

  const matchedRoute = Object.keys(PROTECTED_ROUTES).find((r) => pathname.startsWith(r));
  if (matchedRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const payload = decodeJwtPayload(token);
      if (payload.exp * 1000 < Date.now()) {
        const res = NextResponse.redirect(new URL("/login", request.url));
        res.cookies.delete("access_token");
        return res;
      }
      if (payload.tipo_usuario !== PROTECTED_ROUTES[matchedRoute]) {
        return NextResponse.redirect(new URL(getDashboard(payload.tipo_usuario), request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/registro", "/admin/:path*", "/cliente/:path*", "/empleado/:path*"],
};
