import React, { createContext, useContext, useState, ReactNode } from "react";

type MovimientoTipo = "registro" | "edicion" | "borrado" | "cotizacion" | "reporte";

export type Movimiento = {
  id: string;
  tipo: MovimientoTipo;
  titulo: string;
  detalle: string;
  usuario: string;
  fecha: string;
};

interface HistorialContextValue {
  movimientos: Movimiento[];
  agregarMovimiento: (data: Omit<Movimiento, "id" | "fecha"> & { fecha?: string }) => void;
}

const HistorialContext = createContext<HistorialContextValue | undefined>(undefined);

const MOVIMIENTOS_INICIALES: Movimiento[] = [
  {
    id: "m-1",
    tipo: "reporte",
    titulo: "Reporte semanal",
    detalle: "Estado general enviado a SACYR",
    usuario: "jefe.obra@beck.cl",
    fecha: "05-12-2025",
  },
  {
    id: "m-2",
    tipo: "cotizacion",
    titulo: "Nueva cotizacion cargada",
    detalle: "COT-2025-022 aceptada por cliente",
    usuario: "maria@beck.cl",
    fecha: "04-12-2025",
  },
  {
    id: "m-3",
    tipo: "registro",
    titulo: "Registro inicial",
    detalle: "Edificio Corporativo A | Piso 5 | instalado",
    usuario: "carlos@beck.cl",
    fecha: "03-12-2025",
  },
];

interface Props {
  children: ReactNode;
}

export const HistorialProvider: React.FC<Props> = ({ children }) => {
  const [movimientos, setMovimientos] = useState<Movimiento[]>(MOVIMIENTOS_INICIALES);

  const agregarMovimiento: HistorialContextValue["agregarMovimiento"] = (data) => {
    const fecha = data.fecha ?? new Date().toLocaleDateString("es-CL");
    const nuevo: Movimiento = {
      ...data,
      fecha,
      id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
    };
    setMovimientos((prev) => [nuevo, ...prev]);
  };

  return (
    <HistorialContext.Provider value={{ movimientos, agregarMovimiento }}>
      {children}
    </HistorialContext.Provider>
  );
};

export const useHistorial = (): HistorialContextValue => {
  const ctx = useContext(HistorialContext);
  if (!ctx) {
    throw new Error("useHistorial debe usarse dentro de HistorialProvider");
  }
  return ctx;
};
