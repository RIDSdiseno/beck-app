import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { getResumenOperario, type ResumenOperarioApi } from "@/services/api/registrosApi";
import type { TipoRegistro } from "@/utils/tipoRegistro";

const TIPOS_REGISTRO: TipoRegistro[] = ["sello_cortafuego", "junta_lineal_espuma", "tabiqueria"];

type ResumenesPorTipo = Record<TipoRegistro, ResumenOperarioApi>;

// Igual que el inicio del supervisor: se cargan los tres tipos de una vez y la
// pestaña seleccionada solo elige cuál mostrar, sin volver a consultar el backend.
export function useResumenOperario(enabled: boolean, tipoRegistro: TipoRegistro) {
  const generation = useRef(0);
  const [resumenes, setResumenes] = useState<ResumenesPorTipo | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;
    const ticket = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const datos = await Promise.all(
        TIPOS_REGISTRO.map((tipo) => getResumenOperario({ tipoRegistro: tipo }, forceRefresh)),
      );
      if (ticket === generation.current) {
        setResumenes(Object.fromEntries(TIPOS_REGISTRO.map((tipo, i) => [tipo, datos[i]])) as ResumenesPorTipo);
      }
    } catch (err) {
      // Se conservan los últimos datos válidos para no vaciar la pantalla por un error de red.
      if (ticket === generation.current) setError(err instanceof Error ? err.message : "No se pudo cargar el resumen");
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }, [enabled]);

  useFocusEffect(useCallback(() => {
    void load();
    return () => { generation.current += 1; };
  }, [load]));

  return {
    summary: enabled ? resumenes?.[tipoRegistro] ?? null : null,
    loading, error, refresh: load,
  };
}
