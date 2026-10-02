import { useCallback, useEffect, useRef, useState } from "react";
import { getRegistrosOperarioPage, type RegistroHistorialApi } from "@/services/api/registrosApi";
import type { RegistroTypeValue } from "@/components/RegistroTypeFilter";

const EMPTY_COUNTS = { todos: 0, pendiente: 0, rechazado: 0 };

export function useRegistrosOperario(enabled: boolean, search: string, estado: "todos" | "pendiente" | "rechazado", tipoRegistro: RegistroTypeValue) {
  const [items, setItems] = useState<RegistroHistorialApi[]>([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);
  const busy = useRef(false);

  const reload = useCallback(async () => {
    if (!enabled) return;
    const request = ++version.current;
    busy.current = true;
    setLoading(true);
    setLoadingMore(false);
    setNextCursor(null);
    setError("");
    try {
      const page = await getRegistrosOperarioPage({ search, estado, tipoRegistro, limit: 30 });
      if (version.current !== request) return;
      setItems(page.items);
      setCounts(page.counts);
      setTotal(page.total);
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (version.current === request) setError(err instanceof Error ? err.message : "No se pudieron cargar los registros");
    } finally {
      if (version.current === request) { busy.current = false; setLoading(false); }
    }
  }, [enabled, search, estado, tipoRegistro]);

  useEffect(() => {
    version.current += 1;
    busy.current = true;
    const resetTimer = setTimeout(() => {
      setItems([]);
      setCounts(EMPTY_COUNTS);
      setTotal(0);
      setNextCursor(null);
      setLoading(enabled);
      setLoadingMore(false);
    }, 0);
    const timer = setTimeout(() => { void reload(); }, 300);
    return () => { clearTimeout(resetTimer); clearTimeout(timer); version.current += 1; };
  }, [enabled, reload]);

  const loadMore = useCallback(async () => {
    if (!enabled || !nextCursor || busy.current) return;
    const request = version.current;
    busy.current = true;
    setLoadingMore(true);
    setError("");
    try {
      const page = await getRegistrosOperarioPage({ search, estado, tipoRegistro, limit: 30, cursor: nextCursor });
      if (version.current !== request) return;
      setItems((current) => [...new Map([...current, ...page.items].map((item) => [item.id, item])).values()]);
      setCounts(page.counts);
      setTotal(page.total);
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (version.current === request) setError(err instanceof Error ? err.message : "No se pudieron cargar más registros");
    } finally {
      if (version.current === request) { busy.current = false; setLoadingMore(false); }
    }
  }, [enabled, nextCursor, search, estado, tipoRegistro]);

  return { items, counts, total, nextCursor, loading, loadingMore, error, reload, loadMore };
}
