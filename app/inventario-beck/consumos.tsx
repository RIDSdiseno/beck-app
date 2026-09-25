import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BodegaButton, BodegaInput, BodegaModal, bodegaStyles as s } from "@/components/BodegaBeckUI";
import { SelectSheet } from "@/components/SelectSheet";
import { inventarioBeckRequest } from "@/services/api/inventarioBeckApi";
import { bodegaRequest, notificarCambioBodega } from "@/services/api/bodegaBeckApi";
import { getSession } from "@/services/auth/session";

type Consumo = { id: string; nombre: string; obra: string; operario: string; supervisor: string; cantidad: number; sub_skus: string[]; observacion: string | null; estado: string; solicitado_at: string; resuelto_at: string | null; resuelto_por: string | null; motivo_rechazo: string | null };
type Page = { habilitado: boolean; items: Consumo[]; hasMore: boolean; pendientes: number };
export default function ConsumosInventario() {
  const [scope, setScope] = useState<"operario" | "supervisor" | "bodega" | null>(null);
  const [estado, setEstado] = useState<string | null>("pendiente");
  const [page, setPage] = useState(1), [reload, setReload] = useState(0);
  const [items, setItems] = useState<Consumo[]>([]), [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false), [pendientes, setPendientes] = useState(0);
  const [habilitado, setHabilitado] = useState(true), [error, setError] = useState("");
  const [decision, setDecision] = useState<{ item: Consumo; confirmar: boolean } | null>(null);
  const [motivo, setMotivo] = useState(""), [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const loadingPage = useRef(false);
  useEffect(() => { let live = true; void getSession().then(session => {
    if (!live) return;
    const role = session.user?.rol;
    if (role === "terreno") setScope("operario");
    else if (role === "jefeobra") setScope("supervisor");
    else if (role === "bodeguero") setScope("bodega");
    else setError("No tienes acceso a esta pantalla.");
  }).catch(() => { if (live) setError("No se pudo recuperar la sesión."); }); return () => { live = false; }; }, []);
  useEffect(() => {
    if (!scope) return;
    let live = true;
    async function load() {
      loadingPage.current = true;
      setLoading(true); setError("");
      try {
        const query = `?estado=${estado || "todos"}&page=${page}`;
        const data = scope === "bodega" ? await bodegaRequest<Page>(`/consumos${query}`) : await inventarioBeckRequest<Page>(`/api/inventario-beck/${scope}/consumos${query}`);
        if (!live) return;
        setItems(current => [...new Map((page === 1 ? data.items : [...current, ...data.items]).map(i => [i.id, i])).values()]);
        setMore(data.hasMore); setPendientes(data.pendientes); setHabilitado(data.habilitado);
      } catch (e) { if (live) setError(e instanceof Error ? e.message : "No se pudo cargar."); }
      finally { if (live) { loadingPage.current = false; setLoading(false); } }
    }
    void load(); return () => { live = false; };
  }, [scope, estado, page, reload]);
  const refresh = () => { setPage(1); setReload(n => n + 1); };
  async function resolve() {
    if (!decision || lock.current) return;
    if (!decision.confirmar && !motivo.trim()) return Alert.alert("Falta el motivo", "Indica por qué rechazas el consumo.");
    lock.current = true; setSaving(true);
    try {
      await inventarioBeckRequest(`/api/inventario-beck/supervisor/consumos/${decision.item.id}/resolver`, { method: "POST", body: JSON.stringify({ confirmar: decision.confirmar, motivo }) });
      setDecision(null); refresh(); notificarCambioBodega();
    } catch (e) { Alert.alert("No se pudo resolver", e instanceof Error ? e.message : "Intenta nuevamente."); }
    finally { lock.current = false; setSaving(false); }
  }
  return <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f7fb" }}>
    <View style={{ padding: 16, gap: 10 }}>
      <BodegaButton title="Volver" onPress={() => router.canGoBack() ? router.back() : router.replace(scope === "bodega" ? "/bodega-beck/asignaciones" : "/inventario-beck")} />
      <Text style={s.name}>Consumos informados · {pendientes} pendientes</Text>
      <SelectSheet label="Estado del consumo" placeholder="Todos" value={estado} onChange={value => { setEstado(value); setPage(1); setItems([]); }} options={[{ value: "pendiente", label: "Pendientes de confirmación" }, { value: "confirmado", label: "Consumidos" }, { value: "rechazado", label: "Rechazados por supervisor" }, { value: "todos", label: "Todos" }]} />
      {!habilitado && <Text style={s.text}>Esta función estará disponible tras la migración coordinada del inventario.</Text>}
      {!!error && <Text style={{ color: "#b91c1c" }}>{error}</Text>}
    </View>
    <FlatList data={items} keyExtractor={i => i.id} refreshing={loading && page === 1} onRefresh={refresh} contentContainerStyle={{ padding: 16, gap: 12 }} onEndReached={() => { if (more && !loadingPage.current && !error) { loadingPage.current = true; setPage(p => p + 1); } }} onEndReachedThreshold={0.2}
      ListEmptyComponent={!loading ? <Text style={s.text}>No hay consumos en este estado.</Text> : <ActivityIndicator />}
      ListFooterComponent={loading && page > 1 ? <ActivityIndicator /> : error ? <BodegaButton title="Reintentar" onPress={() => setReload(n => n + 1)} /> : null}
      renderItem={({ item }) => <View style={{ padding: 15, borderRadius: 18, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#fbbf24", gap: 8 }}>
        <Text style={s.name}>{item.nombre} · {item.cantidad} unidades</Text>
        <Text style={s.text}>Obra: {item.obra}{"\n"}Operario: {item.operario}{"\n"}Supervisor: {item.supervisor}</Text>
        <Text style={{ fontWeight: "700", color: item.estado === "confirmado" ? "#047857" : "#92400e" }}>{item.estado === "confirmado" ? "Consumido · No se devolverá" : item.estado === "rechazado" ? "Consumo rechazado" : "Pendiente de confirmación"}</Text>
        <Text style={s.text}>Informado: {new Date(item.solicitado_at).toLocaleString("es-CL")}</Text>
        {!!item.sub_skus.length && <Text style={s.text}>Códigos: {item.sub_skus.join(", ")}</Text>}
        {!!item.observacion && <Text style={s.text}>Observación: {item.observacion}</Text>}
        {!!item.resuelto_at && <Text style={s.text}>Resuelto por {item.resuelto_por} · {new Date(item.resuelto_at).toLocaleString("es-CL")}</Text>}
        {!!item.motivo_rechazo && <Text style={{ color: "#b91c1c" }}>Motivo: {item.motivo_rechazo}</Text>}
        {scope === "supervisor" && item.estado === "pendiente" && <View style={{ gap: 8 }}>
          <BodegaButton title="Confirmar consumo" onPress={() => { setMotivo(""); setDecision({ item, confirmar: true }); }} />
          <BodegaButton title="Rechazar consumo" onPress={() => { setMotivo(""); setDecision({ item, confirmar: false }); }} />
        </View>}
      </View>} />
    <BodegaModal title={decision?.confirmar ? "Confirmar consumo" : "Rechazar consumo"} open={!!decision} busy={saving} onClose={() => setDecision(null)} footer={<BodegaButton title={saving ? "Guardando..." : "Confirmar decisión"} disabled={saving} onPress={() => void resolve()} />}>
      <Text style={s.name}>{decision?.item.nombre} · {decision?.item.cantidad} unidades</Text>
      <Text style={s.text}>{decision?.confirmar ? "Estas unidades quedarán consumidas. No volverán al inventario ni se podrán reasignar." : "Las unidades seguirán asignadas al operario. El motivo quedará visible en la trazabilidad."}</Text>
      {!decision?.confirmar && <BodegaInput label="Motivo obligatorio" value={motivo} onChangeText={setMotivo} multiline maxLength={1000} />}
    </BodegaModal>
  </SafeAreaView>;
}
