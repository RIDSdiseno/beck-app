import { BeckDateFilter } from "@/components/BeckDateFilter";
import { BeckOptionFilter } from "@/components/BeckOptionFilter";
import { BeckSearchInput } from "@/components/BeckSearchInput";
import { BrandHeader } from "@/components/BrandHeader";
import {
  ActividadAdministrador,
  getAdminActividad,
} from "@/services/api/adminApi";
import { formatTime24WithPeriod } from "@/utils/dateTime";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const MODULOS = [
  { value: "operario", label: "Operario" },
  { value: "supervisor", label: "Supervisor" },
  { value: "ingenieria", label: "Ingeniería" },
  { value: "administracion", label: "Administración" },
];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Sin fecha"
    : date.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ActividadAdminScreen() {
  const router = useRouter();
  const requestRef = useRef(0);
  const [items, setItems] = useState<ActividadAdministrador[]>([]);
  const [search, setSearch] = useState("");
  const [fecha, setFecha] = useState("");
  const [modulo, setModulo] = useState("todos");
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (reset: boolean) => {
    if (!reset && !nextCursor) return;
    const requestId = ++requestRef.current;
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const page = await getAdminActividad({
        cursor: reset ? null : nextCursor,
        limit: 25,
        search,
        fecha,
        modulo,
      });
      if (requestId !== requestRef.current) return;
      setItems((current) => reset ? page.items : [...current, ...page.items]);
      setTotal(page.total);
      setNextCursor(page.nextCursor);
    } catch (err: any) {
      if (requestId === requestRef.current) setError(err?.message || "No se pudo cargar la actividad");
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [fecha, modulo, nextCursor, search]);

  useEffect(() => {
    const timer = setTimeout(() => void load(true), 300);
    return () => clearTimeout(timer);
  }, [fecha, modulo, search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={[styles.container, { paddingTop: 2 }]} edges={["top", "left", "right"]}>
      <View style={styles.fixedHeader}>
        <BrandHeader subtitle="Mi actividad · Administración" onBack={() => router.replace("/perfil")} />
        <BeckSearchInput placeholder="Buscar acción o módulo" value={search} onChangeText={setSearch} />
        <View style={styles.filters}>
          <BeckDateFilter value={fecha} onChange={setFecha} compact containerStyle={styles.filter} />
          <BeckOptionFilter
            label="Filtrar por módulo"
            value={modulo}
            allValue="todos"
            allLabel="Todos los módulos"
            options={MODULOS}
            onChange={setModulo}
            icon="view-dashboard-outline"
            compact
            containerStyle={styles.filter}
          />
        </View>
        <Text style={styles.total}>{total} {total === 1 ? "acción" : "acciones"}</Text>
      </View>
      {loading && !items.length ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} />}
          onEndReached={() => { if (!loadingMore && nextCursor) void load(false); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#f97316" style={styles.loader} /> : null}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{error ? "No se pudo cargar" : "Sin actividad"}</Text><Text style={styles.helper}>{error || "Tus acciones en la aplicación aparecerán aquí."}</Text>{error ? <Button onPress={() => void load(true)}>Reintentar</Button> : null}</View>}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.clip}>
                <View style={styles.accent} />
                <Card.Content style={styles.cardContent}>
                  <View style={styles.row}>
                    <View style={styles.icon}><MaterialCommunityIcons name="shield-check-outline" size={21} color="#0f172a" /></View>
                    <View style={styles.info}>
                      <Text style={styles.action}>{item.descripcion}</Text>
                      <Text style={styles.meta}>{item.modulo.charAt(0).toUpperCase() + item.modulo.slice(1)} · {item.accion.replaceAll("_", " ")}</Text>
                      <Text style={styles.meta}>{formatDate(item.created_at)} · {formatTime24WithPeriod(item.created_at)}</Text>
                    </View>
                  </View>
                </Card.Content>
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  fixedHeader: { backgroundColor: "#f5f7fb", paddingHorizontal: 16, paddingBottom: 6 },
  filters: { flexDirection: "row", gap: 8 },
  filter: { flex: 1, minWidth: 0, marginBottom: 4 },
  total: { color: "#64748b", fontSize: 12, fontWeight: "700", marginBottom: 5 },
  list: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 5, paddingBottom: 80 },
  card: { backgroundColor: "#fffaf0", borderColor: "#FDC10B", borderRadius: 17, borderWidth: 1, marginBottom: 11 },
  clip: { borderRadius: 17, overflow: "hidden" },
  accent: { backgroundColor: "#f97316", bottom: 0, left: 0, position: "absolute", top: 0, width: 5 },
  cardContent: { paddingHorizontal: 15, paddingVertical: 13 },
  row: { alignItems: "center", flexDirection: "row", gap: 11 },
  icon: { alignItems: "center", backgroundColor: "#FDC10B", borderRadius: 11, height: 42, justifyContent: "center", width: 42 },
  info: { flex: 1 },
  action: { color: "#0f172a", fontSize: 14, fontWeight: "900" },
  meta: { color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 3 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  empty: { alignItems: "center", paddingHorizontal: 24, paddingTop: 50 },
  emptyTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  helper: { color: "#64748b", marginTop: 7, textAlign: "center" },
  loader: { marginVertical: 18 },
});
