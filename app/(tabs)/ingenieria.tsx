import {
  EstadoRegistroIngenieria,
  getIngenieriaRegistros,
  getIngenieriaResumen,
  IngenieriaResumen,
  RegistroIngenieriaApi,
} from "@/services/api/ingenieriaApi";
import { getSession } from "@/services/auth/session";
import { estadoColor, getEstadoLabel, formatShortDate } from "@/utils/registroEstado";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
import { SelectSheet } from "../../components/SelectSheet";

const ACCENT = "#3b82f6";

type FiltroEstado = EstadoRegistroIngenieria | "todos";

const FILTROS: { label: string; value: FiltroEstado }[] = [
  { label: "En revisión", value: "en_revision" },
  { label: "Validados", value: "validado" },
  { label: "Rechazados", value: "rechazado" },
  { label: "Todos", value: "todos" },
];

const KPI_CONFIG = [
  { key: "enRevision", label: "En revisión", color: "#3b82f6", icon: "timer-sand" },
  { key: "validados", label: "Validados", color: "#16a34a", icon: "check-decagram-outline" },
  { key: "rechazados", label: "Rechazados", color: "#dc2626", icon: "close-octagon-outline" },
  { key: "total", label: "Total", color: "#6366f1", icon: "clipboard-list-outline" },
] as const;

function getTipoLabel(tipo: string) {
  return tipo === "junta_lineal_espuma" ? "Junta Lineal" : "Sello";
}

function getTipoColor(tipo: string) {
  return tipo === "junta_lineal_espuma" ? "#0891b2" : "#ea580c";
}

export default function IngenieriaScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [resumen, setResumen] = useState<IngenieriaResumen | null>(null);
  const [registros, setRegistros] = useState<RegistroIngenieriaApi[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("en_revision");
  const [obraFiltro, setObraFiltro] = useState<string>("todas");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      setError("");
      const [session, resumenData, registrosData] = await Promise.all([
        getSession(),
        getIngenieriaResumen(),
        getIngenieriaRegistros({ limit: 100 }),
      ]);
      setUserName(session.user?.nombre?.split(" ")[0] || "Ingeniería");
      setResumen(resumenData);
      setRegistros(registrosData);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el módulo de ingeniería");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        setLoading(true);
        await loadData();
        if (active) setLoading(false);
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
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          r.descripcion_material,
          r.numero_sello,
          r.nombre_sellador,
          r.codigo_beck,
          r.folio,
          r.obra?.nombre,
          r.obra?.codigo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [registros, filtroEstado, obraFiltro, search]);

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
      <Text variant="titleLarge" style={styles.title}>
        Hola, {userName}
      </Text>
      <Text style={styles.subtitle}>
        Registros enviados por supervisores pendientes de tu revisión.
      </Text>

      {resumen ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiRow}
        >
          {KPI_CONFIG.map(({ key, label, color, icon }) => (
            <Card key={key} style={[styles.kpiCard, { borderTopColor: color }]}>
              <Card.Content style={styles.kpiContent}>
                <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                <Text style={[styles.kpiValue, { color }]}>
                  {resumen[key as keyof IngenieriaResumen]}
                </Text>
                <Text style={styles.kpiLabel}>{label}</Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.searchRow}>
        <MaterialCommunityIcons name="magnify" size={18} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por material, sellador, sello..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.dropdownRow}>
        <SelectSheet
          label="Estado"
          value={filtroEstado}
          placeholder="Todos"
          accentColor={ACCENT}
          options={FILTROS.map(({ label, value }) => ({ label, value }))}
          onChange={(v) => setFiltroEstado((v as FiltroEstado) ?? "todos")}
        />
        <SelectSheet
          label="Obra"
          value={obraFiltro === "todas" ? null : obraFiltro}
          placeholder="Todas las obras"
          accentColor={ACCENT}
          includeAllOption={{ label: "Todas las obras" }}
          options={obras.map((obra) => ({ value: obra.id, label: obra.nombre }))}
          onChange={(v) => setObraFiltro(v ?? "todas")}
        />
      </View>

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

      <Text style={styles.countLabel}>
        {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <FlatList
        ListHeaderComponent={renderHeader()}
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
  const estadoBg = estadoColor[registro.estado as keyof typeof estadoColor] || "#64748b";
  const tipoBg = getTipoColor(registro.tipo_registro);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/ingenieria/${registro.id}` as any)}
      activeOpacity={0.85}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.obraNombre} numberOfLines={1}>
                {registro.obra?.nombre || "Sin obra"}
              </Text>
              <Text style={styles.obraMeta}>
                {registro.obra?.codigo || "—"} · {formatShortDate(registro.fecha)}
              </Text>
            </View>
            <View style={styles.badgeCol}>
              <View style={[styles.badge, { backgroundColor: estadoBg }]}>
                <Text style={styles.badgeText}>{getEstadoLabel(registro.estado)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: tipoBg, marginTop: 4 }]}>
                <Text style={styles.badgeText}>{getTipoLabel(registro.tipo_registro)}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.material} numberOfLines={2}>
            {registro.descripcion_material || "Sin descripción"}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="account-outline" size={13} color="#64748b" />
              <Text style={styles.metaText}>{registro.nombre_sellador}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="stairs" size={13} color="#64748b" />
              <Text style={styles.metaText}>Piso {registro.piso}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="office-building-outline" size={13} color="#64748b" />
              <Text style={styles.metaText}>{registro.modulo}</Text>
            </View>
          </View>

          {registro.seleccionado_para_inspeccion ? (
            <View style={styles.inspeccionBadge}>
              <MaterialCommunityIcons name="magnify-scan" size={12} color="#7c3aed" />
              <Text style={styles.inspeccionText}>Seleccionado para inspección</Text>
            </View>
          ) : null}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  center: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    alignItems: "center",
    justifyContent: "center",
  },
  helper: { marginTop: 12, color: "#475569" },
  title: { color: "#0f172a", marginBottom: 4 },
  subtitle: { color: "#475569", marginBottom: 14, lineHeight: 20 },
  kpiRow: { gap: 10, paddingBottom: 14 },
  kpiCard: {
    width: 110,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderTopWidth: 3,
  },
  kpiContent: { alignItems: "center", paddingVertical: 8, gap: 4 },
  kpiValue: { fontSize: 22, fontWeight: "800" },
  kpiLabel: { fontSize: 10, color: "#64748b", textAlign: "center", fontWeight: "600" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a" },
  dropdownRow: { flexDirection: "row", gap: 8, paddingBottom: 10 },
  countLabel: { color: "#94a3b8", fontSize: 12, marginBottom: 10 },
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
    marginBottom: 10,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  cardTitleGroup: { flex: 1 },
  obraNombre: { color: "#0f172a", fontWeight: "700", fontSize: 15 },
  obraMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },
  badgeCol: { alignItems: "flex-end" },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: "#ffffff", fontSize: 10, fontWeight: "700" },
  material: { color: "#334155", fontSize: 13, lineHeight: 18, marginBottom: 8 },
  metaRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "#64748b", fontSize: 12 },
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
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { color: "#0f172a", fontWeight: "700", fontSize: 16 },
  emptyText: { color: "#64748b", textAlign: "center", lineHeight: 20, maxWidth: 260 },
});
