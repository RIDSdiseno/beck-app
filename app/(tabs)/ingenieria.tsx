import {
  getIngenieriaRegistros,
  RegistroIngenieriaApi,
} from "@/services/api/ingenieriaApi";
import { getEstadoLabel, formatShortDate } from "@/utils/registroEstado";
import { formatTime24WithPeriod } from "@/utils/dateTime";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Text,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";
import { BeckSearchInput } from "../../components/BeckSearchInput";
import { BeckDateFilter } from "../../components/BeckDateFilter";
import { SelectSheet } from "../../components/SelectSheet";

const ACCENT = "#f97316";

type FiltroEstado = "todos" | "pendiente" | "en_revision" | "validado" | "rechazado";

const FILTROS: {
  label: string;
  value: FiltroEstado;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { label: "Todos", value: "todos", icon: "view-grid-outline" },
  { label: "Pendientes", value: "pendiente", icon: "clipboard-clock-outline" },
  { label: "En revisión", value: "en_revision", icon: "clock-outline" },
  { label: "Validados", value: "validado", icon: "check-circle-outline" },
  { label: "Rechazados", value: "rechazado", icon: "alert-circle-outline" },
];

function getTipoLabel(tipo: string) {
  return tipo === "junta_lineal_espuma" ? "Junta Lineal" : "Sello";
}

function matchesSearch(registro: RegistroIngenieriaApi, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [
    registro.numero_sello,
    registro.nombre_sellador,
    registro.usuario?.nombre,
    registro.piso,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export default function IngenieriaScreen() {
  const insets = useSafeAreaInsets();
  const hasLoadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [registros, setRegistros] = useState<RegistroIngenieriaApi[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("en_revision");
  const [obraFiltro, setObraFiltro] = useState<string>("todas");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setError("");
      setRegistros(await getIngenieriaRegistros({ limit: 100 }));
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el módulo de ingeniería");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        const shouldBlockScreen = !hasLoadedRef.current;
        if (shouldBlockScreen) setLoading(true);
        await loadData();
        if (active) {
          hasLoadedRef.current = true;
          if (shouldBlockScreen) setLoading(false);
        }
      };
      init();
      return () => { active = false; };
    }, [loadData]),
  );

  const obras = useMemo(() => {
    const map = new Map<string, string>();
    registros.forEach((r) => {
      if (r.obra?.id && r.obra?.nombre) {
        map.set(r.obra.id, r.obra.nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [registros]);

  const filtered = useMemo(() => {
    return registros.filter((r) => {
      if (filtroEstado !== "todos" && r.estado !== filtroEstado) return false;
      if (obraFiltro !== "todas" && r.obra_id !== obraFiltro) return false;
      if (fechaFiltro && r.fecha.slice(0, 10) !== fechaFiltro) return false;
      return matchesSearch(r, search);
    });
  }, [registros, filtroEstado, obraFiltro, fechaFiltro, search]);

  const filterCounts = useMemo(() => {
    const base = registros.filter(
      (registro) =>
        (obraFiltro === "todas" || registro.obra_id === obraFiltro) &&
        (!fechaFiltro || registro.fecha.slice(0, 10) === fechaFiltro) &&
        matchesSearch(registro, search),
    );
    return {
      todos: base.length,
      pendiente: base.filter((registro) => registro.estado === "pendiente").length,
      en_revision: base.filter((registro) => registro.estado === "en_revision").length,
      validado: base.filter((registro) => registro.estado === "validado").length,
      rechazado: base.filter((registro) => registro.estado === "rechazado").length,
    };
  }, [fechaFiltro, obraFiltro, registros, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.helper}>Cargando revisión...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      <BrandHeader subtitle="Procesamiento · Ingeniería" />

      <BeckSearchInput
        placeholder="Buscar por responsable, N° de sello o piso"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filtersRow}>
        <View style={styles.filterColumn}>
          <BeckDateFilter
            value={fechaFiltro}
            onChange={setFechaFiltro}
            compact
            containerStyle={styles.inlineDateFilter}
          />
        </View>
        <View style={styles.filterColumn}>
          <SelectSheet
            label="Obra"
            value={obraFiltro === "todas" ? null : obraFiltro}
            placeholder="Todas las obras"
            accentColor={ACCENT}
            icon="office-building-outline"
            includeAllOption={{ label: "Todas las obras" }}
            options={obras.map((obra) => ({ value: obra.id, label: obra.nombre }))}
            onChange={(value) => setObraFiltro(value ?? "todas")}
          />
        </View>
      </View>
      <SelectSheet
        label="Estado"
        value={filtroEstado === "todos" ? null : filtroEstado}
        placeholder="Todos los estados"
        accentColor={ACCENT}
        icon="list-status"
        includeAllOption={{ label: `Todos (${filterCounts.todos})` }}
        options={FILTROS.filter((filter) => filter.value !== "todos").map(
          (filter) => ({
            value: filter.value,
            label: `${filter.label} (${filterCounts[filter.value]})`,
          }),
        )}
        onChange={(value) =>
          setFiltroEstado((value ?? "todos") as FiltroEstado)
        }
      />

      {error ? (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={() => loadData(true)} style={styles.retryBtn}>
              Reintentar
            </Button>
          </Card.Content>
        </Card>
      ) : null}

    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.fixedHeader}>{renderHeader()}</View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Sin registros</Text>
            <Text style={styles.emptyText}>
              {filtroEstado === "en_revision"
                ? "No hay registros en revisión en este momento."
                : "No hay registros que coincidan con el filtro seleccionado."}
            </Text>
          </View>
        }
        renderItem={({ item }) => <RegistroCard registro={item} />}
      />
    </SafeAreaView>
  );
}

function RegistroCard({ registro }: { registro: RegistroIngenieriaApi }) {
  const isJunta = registro.tipo_registro === "junta_lineal_espuma";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Revisar registro completo y fotografías"
      onPress={() => router.push(`/ingenieria/${registro.id}` as any)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardAccent} />
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <MaterialCommunityIcons
            name={isJunta ? "ruler" : "fire"}
            size={21}
            color="#0f172a"
          />
        </View>
        <View style={styles.cardTitleGroup}>
          <Text style={styles.cardTitle}>{getTipoLabel(registro.tipo_registro)}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {registro.obra?.nombre || "Obra sin nombre"} · {registro.obra?.codigo || "Sin código"}
          </Text>
        </View>
        <Text style={[styles.statusPill, getStatusStyle(registro.estado)]}>
          {getEstadoLabel(registro.estado)}
        </Text>
      </View>

      <View style={styles.cardSummary}>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color="#f97316" />
          <Text style={styles.summaryText} numberOfLines={1}>
            Piso {registro.piso || "—"} · {registro.modulo || "Sin módulo"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="calendar-outline" size={16} color="#f97316" />
          <Text style={styles.summaryText} numberOfLines={1}>
            {formatShortDate(registro.fecha)} · {formatTime24WithPeriod(registro.created_at)} · Sello {registro.numero_sello || "N/A"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="account-outline" size={16} color="#f97316" />
          <Text style={styles.summaryText} numberOfLines={1}>
            Responsable: {registro.nombre_sellador || "Sin responsable"}
          </Text>
        </View>
      </View>

      {registro.seleccionado_para_inspeccion ? (
        <View style={styles.inspeccionBadge}>
          <MaterialCommunityIcons name="magnify-scan" size={13} color="#7c3aed" />
          <Text style={styles.inspeccionText}>Seleccionado para inspección</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.footerTextGroup}>
          <MaterialCommunityIcons name="eye-outline" size={15} color="#c2410c" />
          <Text style={styles.footerText}>Revisar registro completo y fotografías</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={19} color="#c2410c" />
      </View>
    </Pressable>
  );
}

function getStatusStyle(estado: RegistroIngenieriaApi["estado"]) {
  switch (estado) {
    case "en_revision":
      return styles.statusReview;
    case "validado":
      return styles.statusValidated;
    case "rechazado":
      return styles.statusRejected;
    default:
      return styles.statusPending;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  fixedHeader: {
    backgroundColor: "#f5f7fb",
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },
  center: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    alignItems: "center",
    justifyContent: "center",
  },
  helper: { marginTop: 12, color: "#475569" },
  filtersRow: { flexDirection: "row", gap: 8 },
  filterColumn: { flex: 1, minWidth: 0 },
  inlineDateFilter: { marginBottom: 12 },
  errorCard: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  errorText: { color: "#dc2626", fontWeight: "700", marginBottom: 8 },
  retryBtn: { backgroundColor: "#f97316", borderRadius: 10 },
  card: {
    backgroundColor: "#fffaf0",
    borderColor: "#fbbf24",
    borderWidth: 1,
    borderRadius: 15,
    elevation: 3,
    marginBottom: 12,
    padding: 11,
    paddingLeft: 13,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  cardAccent: {
    backgroundColor: "#f97316",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 4,
  },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 9 },
  cardIcon: {
    alignItems: "center",
    backgroundColor: "#ffc400",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  cardTitleGroup: { flex: 1, minWidth: 0 },
  cardTitle: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  cardSubtitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  statusPill: {
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPending: { backgroundColor: "#ffc400", color: "#0f172a" },
  statusReview: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  statusValidated: { backgroundColor: "#dcfce7", color: "#166534" },
  statusRejected: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  cardSummary: {
    backgroundColor: "#fffdf8",
    borderColor: "#fed7aa",
    borderRadius: 11,
    borderWidth: 1,
    gap: 4,
    marginTop: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  summaryRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  summaryText: {
    color: "#475569",
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  inspeccionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    backgroundColor: "#ede9fe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  inspeccionText: { color: "#7c3aed", fontSize: 11, fontWeight: "600" },
  cardFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 1,
    paddingTop: 8,
  },
  footerTextGroup: { alignItems: "center", flexDirection: "row", gap: 5 },
  footerText: { color: "#c2410c", fontSize: 11, fontWeight: "800" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { color: "#0f172a", fontWeight: "700", fontSize: 16 },
  emptyText: { color: "#64748b", textAlign: "center", lineHeight: 20, maxWidth: 260 },
});
