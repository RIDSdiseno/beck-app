import { BeckDateFilter } from "@/components/BeckDateFilter";
import { BeckOptionFilter } from "@/components/BeckOptionFilter";
import { BrandHeader } from "@/components/BrandHeader";
import { RegistroHistoryCard } from "@/components/RegistroHistoryCard";
import { RegistroHistoryDetailModal } from "@/components/RegistroHistoryDetailModal";
import { RegistroHistorySearch } from "@/components/RegistroHistorySearch";
import {
  compartirPdfCliente,
  getClienteHistorialPage,
  getClienteRegistroDetalle,
  RegistroCliente,
} from "@/services/api/clienteApi";
import {
  getHistorialRegistroDetalle,
  getHistorialRegistrosPage,
  RegistroHistorialApi,
} from "@/services/api/registrosApi";
import { getSession, STORAGE_KEYS } from "@/services/auth/session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type HistoryItem = RegistroHistorialApi | RegistroCliente;
type ObraOption = { value: string; label: string };

async function getHiddenValidatedIds() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.hiddenValidatedRegistros);
  if (!raw) return new Set<string>();
  try { return new Set(JSON.parse(raw) as string[]); } catch { return new Set<string>(); }
}

async function saveHiddenValidatedIds(ids: Set<string>) {
  await AsyncStorage.setItem(STORAGE_KEYS.hiddenValidatedRegistros, JSON.stringify([...ids]));
}

function isClienteItem(item: HistoryItem): item is RegistroCliente {
  return "tipoRegistro" in item;
}

export default function HistorialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const requestIdRef = useRef(0);
  const [role, setRole] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [obraFilter, setObraFilter] = useState("todas");
  const [obraOptions, setObraOptions] = useState<ObraOption[]>([]);
  const [selectedRegistro, setSelectedRegistro] = useState<HistoryItem | null>(null);
  const [hiddenValidatedIds, setHiddenValidatedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await getSession();
        const currentRole = session.user?.rol || "";
        if (!active) return;
        setRole(currentRole);
        setHiddenValidatedIds(await getHiddenValidatedIds());
        setReady(true);
      } catch (err: any) {
        if (active) setError(err?.message || "No se pudo preparar el historial");
      }
    })();
    return () => { active = false; };
  }, []);

  const loadPage = useCallback(async (reset: boolean) => {
    if (!ready || (!reset && !nextCursor)) return;
    const requestId = ++requestIdRef.current;
    if (reset) setLoading(true); else setLoadingMore(true);
    setError("");
    try {
      const params = {
        cursor: reset ? null : nextCursor,
        limit: 25,
        search,
        fecha: dateFilter,
        obraId: obraFilter,
      };
      const page = role === "cliente"
        ? await getClienteHistorialPage(params)
        : await getHistorialRegistrosPage(params);
      if (requestId !== requestIdRef.current) return;
      setItems((current) => {
        const combined = reset ? page.items : [...current, ...page.items];
        return [...new Map(combined.map((item) => [item.id, item])).values()];
      });
      setNextCursor(page.nextCursor);
      setTotal(page.total);
      if (page.obras) {
        setObraOptions(page.obras.map((obra) => ({ value: obra.id, label: obra.nombre })));
      }
    } catch (err: any) {
      if (requestId === requestIdRef.current) setError(err?.message || "No se pudo cargar el historial");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [dateFilter, nextCursor, obraFilter, ready, role, search]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { void loadPage(true); }, 350);
    return () => clearTimeout(timer);
  }, [ready, search, dateFilter, obraFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleItems = useMemo(
    () => items.filter((item) => item.estado !== "validado" || !hiddenValidatedIds.has(item.id)),
    [hiddenValidatedIds, items],
  );

  const openDetail = async (item: HistoryItem) => {
    try {
      setDetailLoading(true);
      const detail = role === "cliente"
        ? await getClienteRegistroDetalle(item.id)
        : await getHistorialRegistroDetalle(item.id);
      setSelectedRegistro(detail);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo abrir el registro");
    } finally {
      setDetailLoading(false);
    }
  };

  const hideValidatedRegistro = async (registroId: string) => {
    const next = new Set(hiddenValidatedIds);
    next.add(registroId);
    setHiddenValidatedIds(next);
    await saveHiddenValidatedIds(next);
  };

  const sharePdf = async (registro: RegistroCliente) => {
    try {
      setSharing(true);
      await compartirPdfCliente(registro.id, registro.codigoBeck);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo compartir el PDF");
    } finally {
      setSharing(false);
    }
  };

  const fixedHeader = (
    <View style={styles.fixedHeader}>
      <BrandHeader
        subtitle="Registros realizados · BECK"
        onBack={() => router.replace("/perfil")}
      />
      <RegistroHistorySearch value={search} onChangeText={setSearch} />
      <View style={styles.filters}>
        <BeckDateFilter value={dateFilter} onChange={setDateFilter} compact containerStyle={styles.filter} />
        <BeckOptionFilter
          label="Filtrar por obra" value={obraFilter} allValue="todas" allLabel="Todas las obras"
          options={obraOptions} onChange={setObraFilter} compact containerStyle={styles.filter}
        />
      </View>
      <Text style={styles.total}>{total} {total === 1 ? "registro" : "registros"}</Text>
    </View>
  );

  return (
    <>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top + 2 }]} edges={["top", "left", "right"]}>
        {fixedHeader}
        {loading && !items.length ? (
          <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /><Text style={styles.helper}>Cargando historial...</Text></View>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadPage(true); }} />}
            onEndReached={() => { if (!loadingMore && nextCursor) void loadPage(false); }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} color="#f97316" /> : null}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{error ? "No se pudo cargar" : "Sin registros"}</Text><Text style={styles.helper}>{error || "No hay registros que coincidan con los filtros."}</Text>{error ? <Button onPress={() => void loadPage(true)}>Reintentar</Button> : null}</View>}
            renderItem={({ item }) => (
              <View>
                <RegistroHistoryCard registro={item} onPress={() => void openDetail(item)} pdfDisponible={isClienteItem(item) && item.pdfDisponible} />
                {item.estado === "validado" && role !== "cliente" ? (
                  <Button mode="outlined" icon="trash-can-outline" onPress={() => void hideValidatedRegistro(item.id)} style={styles.removeButton} labelStyle={styles.removeLabel}>Borrar del historial</Button>
                ) : null}
              </View>
            )}
          />
        )}
      </SafeAreaView>
      {detailLoading ? <View style={styles.detailOverlay}><ActivityIndicator size="large" color="#f97316" /></View> : null}
      <RegistroHistoryDetailModal
        registro={selectedRegistro}
        onClose={() => setSelectedRegistro(null)}
        footer={selectedRegistro && isClienteItem(selectedRegistro) && selectedRegistro.pdfDisponible ? (
          <Button mode="contained" icon="share-variant" loading={sharing} disabled={sharing} onPress={() => void sharePdf(selectedRegistro)}>Compartir PDF firmado</Button>
        ) : undefined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  fixedHeader: { backgroundColor: "#f5f7fb", paddingHorizontal: 16, paddingBottom: 6 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 4 },
  filter: { flex: 1, minWidth: 0, marginBottom: 0 },
  total: { color: "#64748b", fontSize: 12, fontWeight: "700", marginBottom: 5 },
  listContent: { paddingHorizontal: 16, paddingTop: 5, paddingBottom: 80, flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  helper: { color: "#64748b", marginTop: 8, textAlign: "center" },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingTop: 50 },
  emptyTitle: { color: "#0f172a", fontSize: 16, fontWeight: "800" },
  footerLoader: { marginVertical: 18 },
  removeButton: { borderColor: "#dc2626", marginBottom: 12, marginTop: -5 },
  removeLabel: { color: "#dc2626", fontWeight: "700" },
  detailOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.22)", zIndex: 20 },
});
