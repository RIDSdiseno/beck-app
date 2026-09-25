import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BrandHeader } from "@/components/BrandHeader";
import { BeckSearchInput } from "@/components/BeckSearchInput";
import { SelectSheet } from "@/components/SelectSheet";
import { BodegaButton, BodegaModal } from "@/components/BodegaBeckUI";
import { getSession } from "@/services/auth/session";
import { consultarInventarioAdmin, puedeConsultarInventarioAdmin, type ObraInventarioAdmin, type AsignacionAdmin, type ResumenInventarioAdmin, type PaginaInventarioAdmin, type TrazabilidadAdmin } from "@/services/api/inventarioAdminApi";
import { estadoAsignacionAdmin, tipoArticuloAdmin } from "@/utils/inventarioAdmin";
import { formatTime24WithPeriod } from "@/utils/dateTime";

const fecha = (value: string) => `${new Date(value).toLocaleDateString("es-CL")} · ${formatTime24WithPeriod(value)}`;
const vistas = [
  { value: "asignados", label: "Asignaciones activas" },
  { value: "supervisores", label: "En poder de supervisores" },
  { value: "operarios", label: "En poder de operarios" },
  { value: "devueltos", label: "Devueltos a bodega" },
  { value: "consumidos", label: "Consumidos" },
  { value: "todos", label: "Todos los estados" },
];
const Tarjeta = memo(function Tarjeta({ item, onPress }: { item: AsignacionAdmin; onPress: (item: AsignacionAdmin) => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver trazabilidad de ${item.nombre}`} onPress={() => onPress(item)} style={({ pressed }) => [s.card, pressed && { opacity: 0.8 }]}>
    <View style={s.row}>
      <View style={s.icon}><MaterialCommunityIcons name={item.tipo === "epp" ? "hard-hat" : item.tipo === "herramienta" ? "tools" : "package-variant-closed"} size={22} color="#0f172a" /></View>
      <View style={s.grow}><Text style={s.overline}>{tipoArticuloAdmin(item.tipo)} · {item.sku || "Sin SKU"}</Text><Text style={s.name}>{item.nombre}</Text></View>
      <Text style={s.quantity}>{item.cantidad}<Text style={s.meta}> ud.</Text></Text>
    </View>
    <Text style={s.state}>{estadoAsignacionAdmin(item)}</Text>
    <View style={s.route}>
      <Text style={s.meta}>Entrega inicial: <Text style={s.strong}>{item.entregadoPor.nombre}</Text></Text>
      <Text style={s.meta}>Supervisor: <Text style={s.strong}>{item.supervisor.nombre}</Text></Text>
      <Text style={s.meta}>{item.estado === "asignado" ? "Operario" : "Operario asociado"}: <Text style={s.strong}>{item.operario?.nombre || "Sin asignación a operario"}</Text></Text>
    </View>
    <View style={s.row}><Text style={[s.meta, s.grow]}>{fecha(item.fecha)}</Text><Text style={s.link}>Ver recorrido ›</Text></View>
  </Pressable>;
});

function Detalle({ item, obra, onClose }: { item: AsignacionAdmin; obra: ObraInventarioAdmin; onClose: () => void }) {
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const [data, setData] = useState<TrazabilidadAdmin | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const changePage = (value: number) => { setLoading(true); setError(""); setData(null); setPage(value); };
  const retryTrace = () => { setLoading(true); setError(""); setData(null); setRetry(n => n + 1); };
  useEffect(() => {
    const controller = new AbortController();
    void consultarInventarioAdmin<TrazabilidadAdmin>(`/asignaciones/${item.id}/trazabilidad?obraId=${obra.id}&page=${page}`, controller.signal)
      .then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "No se pudo cargar el recorrido."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [item.id, obra.id, page, retry]);
  return <BodegaModal open title="Detalle y trazabilidad" brand="BECK · ADMINISTRACIÓN" onClose={onClose}>
    <View style={s.detail}>
      <Text style={s.overline}>{obra.nombre} · {obra.codigo}</Text>
      <Text style={s.title}>{item.nombre}</Text>
      <Text style={s.state}>{estadoAsignacionAdmin(item)}</Text>
      <Text style={s.meta}>{tipoArticuloAdmin(item.tipo)} · {item.cantidad} unidades · SKU {item.sku || "Sin SKU"}</Text>
      {!!item.detalle && <Text style={s.meta}>{item.detalle}</Text>}
      <Text style={s.meta}>Entregado inicialmente por: <Text style={s.strong}>{item.entregadoPor.nombre}</Text></Text>
      <Text style={s.meta}>Supervisor responsable: <Text style={s.strong}>{item.supervisor.nombre}</Text></Text>
      <Text style={s.meta}>Operario asociado: <Text style={s.strong}>{item.operario?.nombre || "Sin asignación"}</Text></Text>
      <Text style={s.meta}>Fecha de registro del lote: {fecha(item.fecha)}</Text>
      {!!item.entregadoOperarioAt && <Text style={s.meta}>Entrega al operario: {fecha(item.entregadoOperarioAt)}</Text>}
      {!!item.recepcionConfirmadaAt && <Text style={s.meta}>Recepción confirmada: {fecha(item.recepcionConfirmadaAt)}</Text>}
      {!!item.devueltoAt && <Text style={s.meta}>Devuelto a bodega: {fecha(item.devueltoAt)}</Text>}
      {!!item.subSkus.length && <Text style={s.meta}>Códigos unitarios: {item.subSkus.join(", ")}</Text>}
      {!!item.observacion && <Text style={s.meta}>Observación: {item.observacion}</Text>}
      {!!item.devolucionMotivo && <Text style={s.meta}>Motivo de devolución: {item.devolucionMotivo}</Text>}
      {!!item.ultimoConsumo && <Text style={s.state}>Último aviso de consumo: {item.ultimoConsumo.cantidad} unidades · {item.ultimoConsumo.estado}{item.ultimoConsumo.observacion ? `\n${item.ultimoConsumo.observacion}` : ""}{item.ultimoConsumo.motivo_rechazo ? `\nMotivo: ${item.ultimoConsumo.motivo_rechazo}` : ""}</Text>}
    </View>
    <Text style={s.name}>Recorrido en esta obra</Text>
    <Text style={s.meta}>Del movimiento más reciente al más antiguo. Las cantidades de los eventos no se suman al stock actual.</Text>
    {loading && <ActivityIndicator color="#f97316" />}
    {!!error && <><Text style={s.error}>{error}</Text><BodegaButton title="Reintentar" onPress={retryTrace} /></>}
    {data?.items.map(event => <View key={event.id} style={s.event}>
      <Text style={s.name}>{event.detalle || event.accion.replaceAll("_", " ")}</Text>
      <Text style={s.meta}>{event.actor} · {event.cantidad} unidades</Text>
      <Text style={s.meta}>Supervisor: {event.supervisor}{event.operario ? `\nOperario: ${event.operario}` : ""}</Text>
      <Text style={s.meta}>{fecha(event.fecha)}</Text>
    </View>)}
    {!loading && !error && !data?.items.length && <Text style={s.meta}>No hay eventos registrados para este lote en esta obra. La entrega inicial y los responsables disponibles se muestran arriba.</Text>}
    <View style={s.row}><View style={s.grow}><BodegaButton secondary title="Anterior" disabled={page === 1 || loading} onPress={() => changePage(page - 1)} /></View><Text style={s.meta}>{page}</Text><View style={s.grow}><BodegaButton secondary title="Siguiente" disabled={!data?.hasMore || loading} onPress={() => changePage(page + 1)} /></View></View>
  </BodegaModal>;
}

export default function InventarioAdministracion() {
  const [allowed, setAllowed] = useState(false), [initialLoading, setInitialLoading] = useState(true);
  const [obras, setObras] = useState<ObraInventarioAdmin[]>([]), [obraId, setObraId] = useState<string | null>(null);
  const [vista, setVista] = useState("asignados"), [search, setSearch] = useState(""), [query, setQuery] = useState("");
  const [items, setItems] = useState<AsignacionAdmin[]>([]), [resumen, setResumen] = useState<ResumenInventarioAdmin | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null), [loading, setLoading] = useState(false), [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(""), [initialError, setInitialError] = useState(""), [retry, setRetry] = useState(0);
  const [failedCursor, setFailedCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<AsignacionAdmin | null>(null);
  const sequence = useRef(0), busy = useRef(false), controller = useRef<AbortController | null>(null);
  const resetList = useCallback((willLoad = false) => {
    controller.current?.abort(); sequence.current += 1; busy.current = false;
    setItems([]); setResumen(null); setNextCursor(null); setSelected(null); setError(""); setLoading(willLoad); setLoadingMore(false);
  }, []);
  const retryInitial = () => { setInitialLoading(true); setInitialError(""); setRetry(n => n + 1); };
  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      try {
        const session = await getSession();
        if (!puedeConsultarInventarioAdmin(session.user)) throw new Error("Acceso exclusivo del administrador de BECK.");
        const data = await consultarInventarioAdmin<ObraInventarioAdmin[]>("/obras", abort.signal);
        if (!abort.signal.aborted) { setAllowed(true); setObras(data); }
      } catch (e) { if (!abort.signal.aborted) { resetList(); setAllowed(false); setInitialError(e instanceof Error ? e.message : "No se pudieron cargar las obras."); } }
      finally { if (!abort.signal.aborted) setInitialLoading(false); }
    })();
    return () => abort.abort();
  }, [retry, resetList]);
  useEffect(() => { const timer = setTimeout(() => { if (query !== search.trim()) { resetList(allowed && !!obraId); setQuery(search.trim()); } }, 350); return () => clearTimeout(timer); }, [search, query, resetList, allowed, obraId]);
  const load = useCallback((cursor: string | null = null) => {
    if (!allowed || !obraId || (cursor && busy.current)) return;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const run = ++sequence.current; busy.current = true;
    const params = new URLSearchParams({ obraId, vista, q: query, ...(cursor ? { cursor } : {}) });
    return consultarInventarioAdmin<PaginaInventarioAdmin>(`/asignaciones?${params}`, abort.signal).then(data => {
      if (run !== sequence.current || abort.signal.aborted) return;
      setItems(current => [...new Map((cursor ? [...current, ...data.items] : data.items).map(i => [i.id, i])).values()]);
      setNextCursor(data.nextCursor); if (data.resumen) setResumen(data.resumen);
    }).catch((e: unknown) => { if (run === sequence.current && !abort.signal.aborted) { setFailedCursor(cursor); setError(e instanceof Error ? e.message : "No se pudo cargar el inventario."); } })
      .finally(() => { if (run === sequence.current && !abort.signal.aborted) { busy.current = false; setLoading(false); setLoadingMore(false); } });
  }, [allowed, obraId, vista, query]);
  const reloadList = (cursor: string | null = null) => {
    if (!allowed || !obraId || (cursor && busy.current)) return;
    setLoading(!cursor); setLoadingMore(!!cursor); setError(""); void load(cursor);
  };
  useEffect(() => {
    void load();
    return () => { controller.current?.abort(); sequence.current += 1; };
  }, [load]);
  const obra = obras.find(o => o.id === obraId);
  return <SafeAreaView style={s.screen} edges={["top", "left", "right", "bottom"]}>
    <View style={s.header}>
      <BrandHeader subtitle="Inventario Beck · Administración" onBack={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/perfil")} />
      {allowed && <>
        <SelectSheet label="Obra" value={obraId} placeholder="Selecciona una obra" options={obras.map(o => ({ value: o.id, label: `${o.nombre}${o.codigo ? ` · ${o.codigo}` : ""}` }))} onChange={value => { if (value !== obraId) { resetList(!!value); setObraId(value); } }} icon="office-building-outline" />
        {!!obraId && <><BeckSearchInput value={search} onChangeText={value => setSearch(value.slice(0, 100))} placeholder="Artículo, SKU o nombre de responsable" style={{ marginBottom: 0 }} /><SelectSheet label="Ver asignaciones" value={vista} placeholder="Asignaciones activas" options={vistas} onChange={value => { if ((value || "asignados") !== vista) { resetList(true); setVista(value || "asignados"); } }} /></>}
      </>}
      {initialLoading && <ActivityIndicator color="#f97316" />}
      {!!initialError && <><Text style={s.error}>{initialError}</Text><BodegaButton title="Reintentar" onPress={retryInitial} /></>}
    </View>
    <FlatList data={allowed ? items : []} keyExtractor={i => i.id} renderItem={({ item }) => <Tarjeta item={item} onPress={setSelected} />} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"
      refreshing={loading} onRefresh={() => { if (allowed && obraId) reloadList(); else retryInitial(); }}
      onEndReached={() => { if (nextCursor && !busy.current && !error) reloadList(nextCursor); }} onEndReachedThreshold={0.4}
      ListHeaderComponent={allowed && resumen ? <View style={s.summary}>
        <Text style={s.name}>{obra?.nombre}</Text><Text style={s.meta}>Solo lectura · {resumen.supervisores} supervisores responsables · {resumen.operarios} operarios con asignaciones activas</Text>
        <View style={s.grid}>{[["Con supervisores", resumen.conSupervisores], ["Con operarios", resumen.conOperarios], ["Devueltas a bodega", resumen.devueltas], ["Consumidas", resumen.consumidas]].map(([label, value]) => <View key={label} style={s.stat}><Text style={s.quantity}>{value}</Text><Text style={s.meta}>{label}</Text></View>)}</View>
        <Text style={s.caption}>Resumen de toda la obra, independiente del buscador. Las devoluciones son históricas, no stock disponible.</Text>
      </View> : null}
      ListEmptyComponent={!loading && !initialLoading && allowed ? <Text style={s.empty}>{!obras.length ? "No hay obras disponibles." : !obraId ? "Selecciona una obra para consultar sus asignaciones y trazabilidad." : error ? "No se pudo completar la consulta." : "No hay asignaciones con estos filtros."}</Text> : null}
      ListFooterComponent={loadingMore ? <ActivityIndicator color="#f97316" /> : error ? <View style={s.detail}><Text style={s.error}>{error}</Text><BodegaButton title="Reintentar" onPress={() => reloadList(failedCursor)} /></View> : null}
    />
    {selected && obra && <Detalle item={selected} obra={obra} onClose={() => setSelected(null)} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb" }, header: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  content: { padding: 16, paddingTop: 4, paddingBottom: 32, gap: 12 }, grow: { flex: 1 }, row: { flexDirection: "row", alignItems: "center", gap: 10 },
  card: { padding: 13, gap: 9, backgroundColor: "#fffdf6", borderWidth: 1, borderColor: "#fbbf24", borderLeftWidth: 4, borderRadius: 18 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#ffc400", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 21, fontWeight: "800", color: "#0f172a" }, name: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  overline: { fontSize: 11, fontWeight: "700", color: "#9a3412", marginBottom: 3 }, quantity: { fontSize: 23, fontWeight: "800", color: "#0f172a" },
  meta: { fontSize: 12, lineHeight: 19, color: "#64748b" }, strong: { fontWeight: "700", color: "#334155" },
  state: { fontSize: 12, lineHeight: 18, fontWeight: "700", color: "#9a3412", backgroundColor: "#fef3c7", borderRadius: 9, padding: 7 },
  route: { backgroundColor: "#fff", borderRadius: 12, padding: 9, gap: 2 }, link: { fontSize: 12, color: "#c2410c", fontWeight: "700" },
  summary: { gap: 9, marginBottom: 14 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, stat: { width: "48%", padding: 12, borderRadius: 15, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e2e8f0" },
  caption: { color: "#64748b", fontSize: 11 }, detail: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: "#fffdf6", borderWidth: 1, borderColor: "#fbbf24" },
  event: { gap: 6, padding: 14, borderRadius: 16, backgroundColor: "white", borderLeftWidth: 4, borderLeftColor: "#ffc400" },
  error: { color: "#b91c1c", fontSize: 13 }, empty: { padding: 24, color: "#64748b", textAlign: "center" },
});
