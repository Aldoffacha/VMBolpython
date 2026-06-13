"use client";

const STORAGE_KEY = "cliente_moneda";

export function getClienteMoneda() {
  if (typeof window === "undefined") return "USD";
  return localStorage.getItem(STORAGE_KEY) || "USD";
}

export function setClienteMoneda(moneda) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, moneda);
}

export function formatPriceCliente(precioUSD, moneda, tipoCambio) {
  const num = parseFloat(precioUSD) || 0;
  if (moneda === "BOB") {
    const enBs = (num * (tipoCambio || 9.17)).toFixed(2);
    return `Bs ${Number(enBs).toLocaleString("en", { minimumFractionDigits: 2 })}`;
  }
  return `$${num.toLocaleString("en", { minimumFractionDigits: 2 })}`;
}
