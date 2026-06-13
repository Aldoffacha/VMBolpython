"use client";
import { ClienteMonedaProvider } from "@/lib/ClienteMonedaContext";

export default function ClienteLayout({ children }) {
  return <ClienteMonedaProvider>{children}</ClienteMonedaProvider>;
}
