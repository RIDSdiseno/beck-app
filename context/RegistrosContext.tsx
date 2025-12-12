// context/RegistrosContext.tsx
import React, {
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Registro } from "../types/beck";
import { useHistorial } from "./HistorialContext";

interface RegistrosContextValue {
  registros: Registro[];
  agregarRegistro: (data: Omit<Registro, "id">) => void;
  actualizarRegistro: (id: number, data: Partial<Omit<Registro, "id">>) => void;
  eliminarRegistro: (id: number) => void;

  getRegistroById: (id: number) => Registro | undefined;
  setRegistros: React.Dispatch<React.SetStateAction<Registro[]>>;
}

const RegistrosContext = createContext<RegistrosContextValue | undefined>(undefined);

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
    cantidadSellos: 8,
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

const safeUser = (u?: string) => (u && u.trim().length ? u : "sistema@beck.cl");

export const RegistrosProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [registros, setRegistros] = useState<Registro[]>(REGISTROS_INICIALES);
  const { agregarMovimiento } = useHistorial();

  const idRef = useRef<number>(
    REGISTROS_INICIALES.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1
  );

  const getRegistroById = (id: number) => registros.find((r) => r.id === id);

  const agregarRegistro = (data: Omit<Registro, "id">) => {
    const nuevo: Registro = { ...data, id: idRef.current++ };

    // Si el tipo es junta, aseguramos que no quede cantidadSellos
    if (nuevo.tipo === "junta") {
      delete (nuevo as any).cantidadSellos;
    }

    setRegistros((prev) => [nuevo, ...prev]);

    agregarMovimiento({
      tipo: "registro",
      titulo: "Nuevo registro",
      detalle: `${data.obra} | ${data.piso} | ${data.equipo} | ${data.estado}${
        data.tipo === "sello" && typeof data.cantidadSellos === "number"
          ? ` | cantidad: ${data.cantidadSellos}`
          : ""
      }`,
      usuario: safeUser(data.usuario),
    });
  };

  const actualizarRegistro = (id: number, data: Partial<Omit<Registro, "id">>) => {
    const antes = getRegistroById(id);
    if (!antes) return;

    setRegistros((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        const next: Registro = { ...r, ...data };

        // Si cambia a junta, limpiamos cantidadSellos
        if (next.tipo === "junta") {
          delete (next as any).cantidadSellos;
        }

        return next;
      })
    );

    const cambios: string[] = [];

    if (data.estado && data.estado !== antes.estado)
      cambios.push(`estado: ${antes.estado} → ${data.estado}`);

    if (data.obra && data.obra !== antes.obra)
      cambios.push(`obra: ${antes.obra} → ${data.obra}`);

    if (data.piso && data.piso !== antes.piso)
      cambios.push(`piso: ${antes.piso} → ${data.piso}`);

    if (data.equipo && data.equipo !== antes.equipo)
      cambios.push(`equipo: ${antes.equipo} → ${data.equipo}`);

    if (data.tipo && data.tipo !== antes.tipo)
      cambios.push(`tipo: ${antes.tipo} → ${data.tipo}`);

    if (
      typeof data.cantidadSellos === "number" &&
      data.cantidadSellos !== antes.cantidadSellos
    ) {
      cambios.push(`cantidad: ${antes.cantidadSellos ?? 0} → ${data.cantidadSellos}`);
    }

    const fotoAntes = antes.fotoLocalUri ?? antes.fotoUrl ?? "";
    const fotoDespues = data.fotoLocalUri ?? data.fotoUrl ?? fotoAntes;
    if (fotoDespues && fotoDespues !== fotoAntes) cambios.push("foto: actualizada");

    agregarMovimiento({
      tipo: "edicion",
      titulo: "Registro actualizado",
      detalle: cambios.length ? `ID ${id} | ${cambios.join(" | ")}` : `ID ${id} actualizado`,
      usuario: safeUser(data.usuario ?? antes.usuario),
    });
  };

  const eliminarRegistro = (id: number) => {
    const existente = getRegistroById(id);
    if (!existente) return;

    setRegistros((prev) => prev.filter((r) => r.id !== id));

    agregarMovimiento({
      tipo: "borrado",
      titulo: "Registro eliminado",
      detalle: `ID ${id} | ${existente.obra} | ${existente.piso} | ${existente.equipo}`,
      usuario: safeUser(existente.usuario),
    });
  };

  const value = useMemo<RegistrosContextValue>(
    () => ({
      registros,
      agregarRegistro,
      actualizarRegistro,
      eliminarRegistro,
      getRegistroById,
      setRegistros,
    }),
    [registros]
  );

  return <RegistrosContext.Provider value={value}>{children}</RegistrosContext.Provider>;
};

export const useRegistros = (): RegistrosContextValue => {
  const ctx = useContext(RegistrosContext);
  if (!ctx) throw new Error("useRegistros debe usarse dentro de RegistrosProvider");
  return ctx;
};
