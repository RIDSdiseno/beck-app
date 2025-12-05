// context/RegistrosContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";
import type { Registro } from "../types/beck";
import { useHistorial } from "./HistorialContext";

interface RegistrosContextValue {
  registros: Registro[];
  agregarRegistro: (data: Omit<Registro, "id">) => void;
  actualizarRegistro: (id: number, data: Partial<Omit<Registro, "id">>) => void;
  eliminarRegistro: (id: number) => void;
}

const RegistrosContext = createContext<RegistrosContextValue | undefined>(undefined);

// Datos iniciales (mock)
const REGISTROS_INICIALES: Registro[] = [
  {
    id: 1,
    tipo: "sello",
    obra: "Edificio Corporativo A",
    piso: "Piso 5",
    equipo: "Ducto climatización",
    estado: "instalado",
    usuario: "carlos@beck.cl",
    fotoUrl: "https://picsum.photos/200/120?1",
  },
  {
    id: 2,
    tipo: "junta",
    obra: "Edificio B",
    piso: "Subterráneo 2",
    equipo: "Pasamuros eléctrico",
    estado: "pendiente",
    usuario: "maria@beck.cl",
    fotoUrl: "https://picsum.photos/200/120?2",
  },
];

interface Props {
  children: ReactNode;
}

export const RegistrosProvider: React.FC<Props> = ({ children }) => {
  const [registros, setRegistros] = useState<Registro[]>(REGISTROS_INICIALES);
  const { agregarMovimiento } = useHistorial();

  const agregarRegistro = (data: Omit<Registro, "id">) => {
    setRegistros((prev) => {
      const maxId = prev.reduce((max, r) => (r.id > max ? r.id : max), 0);
      const nuevo: Registro = { ...data, id: maxId + 1 };
      return [nuevo, ...prev];
    });
    agregarMovimiento({
      tipo: "registro",
      titulo: "Nuevo registro",
      detalle: `${data.obra} | ${data.piso} | ${data.estado}`,
      usuario: data.usuario,
    });
  };

  const actualizarRegistro = (id: number, data: Partial<Omit<Registro, "id">>) => {
    setRegistros((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
  };

  const eliminarRegistro = (id: number) => {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <RegistrosContext.Provider
      value={{ registros, agregarRegistro, actualizarRegistro, eliminarRegistro }}
    >
      {children}
    </RegistrosContext.Provider>
  );
};

export const useRegistros = (): RegistrosContextValue => {
  const ctx = useContext(RegistrosContext);
  if (!ctx) {
    throw new Error("useRegistros debe usarse dentro de RegistrosProvider");
  }
  return ctx;
};