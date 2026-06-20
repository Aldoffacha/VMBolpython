"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ClienteMonedaContext = createContext(null);

const API = "http://localhost:8000";
const STORAGE_KEY = "cliente_moneda";

function getStoredMoneda() {
  if (typeof window === "undefined") return "USD";
  return localStorage.getItem(STORAGE_KEY) || "USD";
}

function setStoredMoneda(m) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, m);
}

export function ClienteMonedaProvider({ children }) {
  const [moneda, setMoneda] = useState("USD");
  const [tipoCambio, setTipoCambio] = useState(9.17);
  const [temaCliente, setTemaCliente] = useState("azul");

  useEffect(() => {
    setMoneda(getStoredMoneda());
    const token = document.cookie
      .split(";")
      .find((c) => c.trim().startsWith("access_token="))
      ?.split("=")[1];
    if (!token) return;
    fetch(`${API}/cliente/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.tipo_cambio) setTipoCambio(d.tipo_cambio);
        if (d?.tema_cliente) setTemaCliente(d.tema_cliente);
      })
      .catch(() => {});
  }, []);

  const toggleMoneda = useCallback(() => {
    setMoneda((prev) => {
      const next = prev === "USD" ? "BOB" : "USD";
      setStoredMoneda(next);
      return next;
    });
  }, []);

  const formatPrice = useCallback(
    (priceUSD) => {
      const num = parseFloat(priceUSD) || 0;
      if (moneda === "BOB") {
        const enBs = (num * tipoCambio).toFixed(2);
        return `Bs ${Number(enBs).toLocaleString("en", { minimumFractionDigits: 2 })}`;
      }
      return `$${num.toLocaleString("en", { minimumFractionDigits: 2 })}`;
    },
    [moneda, tipoCambio]
  );

  const formatPriceUSD = useCallback((priceUSD) => {
    const num = parseFloat(priceUSD) || 0;
    return `$${num.toLocaleString("en", { minimumFractionDigits: 2 })}`;
  }, []);

  const formatPriceBOB = useCallback(
    (priceUSD) => {
      const num = parseFloat(priceUSD) || 0;
      const enBs = (num * tipoCambio).toFixed(2);
      return `Bs ${Number(enBs).toLocaleString("en", { minimumFractionDigits: 2 })}`;
    },
    [tipoCambio]
  );

  return (
    <ClienteMonedaContext.Provider
      value={{
        moneda,
        tipoCambio,
        temaCliente,
        formatPrice,
        formatPriceUSD,
        formatPriceBOB,
        toggleMoneda,
        refetch: () => {},
      }}
    >
      {children}
    </ClienteMonedaContext.Provider>
  );
}

export function useClienteMoneda() {
  const ctx = useContext(ClienteMonedaContext);
  if (!ctx) {
    return {
      moneda: "USD",
      tipoCambio: 9.17,
      temaCliente: "azul",
      formatPrice: (p) => `$${(parseFloat(p) || 0).toFixed(2)}`,
      formatPriceUSD: (p) => `$${(parseFloat(p) || 0).toFixed(2)}`,
      formatPriceBOB: (p) => `Bs ${((parseFloat(p) || 0) * 9.17).toFixed(2)}`,
      toggleMoneda: () => {},
      refetch: () => {},
    };
  }
  return ctx;
}
