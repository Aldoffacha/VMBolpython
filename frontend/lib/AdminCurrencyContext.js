"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AdminCurrencyContext = createContext(null);

const API = "http://localhost:8000";
function getToken() {
  return document.cookie.split("; ").find(r => r.startsWith("access_token="))?.split("=")[1];
}

export function AdminCurrencyProvider({ children }) {
  const [moneda, setMoneda] = useState("USD");
  const [tipoCambio, setTipoCambio] = useState(9.17);

  const fetchConfig = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API}/admin/configuracion`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setMoneda(json.config.moneda || "USD");
      setTipoCambio(json.config.tipo_cambio || 9.17);
    } catch (e) {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

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

  return (
    <AdminCurrencyContext.Provider value={{ moneda, tipoCambio, formatPrice, refetch: fetchConfig }}>
      {children}
    </AdminCurrencyContext.Provider>
  );
}

export function useAdminCurrency() {
  const ctx = useContext(AdminCurrencyContext);
  if (!ctx) {
    return {
      moneda: "USD",
      tipoCambio: 9.17,
      formatPrice: (p) => `$${(parseFloat(p) || 0).toFixed(2)}`,
      refetch: () => {},
    };
  }
  return ctx;
}
