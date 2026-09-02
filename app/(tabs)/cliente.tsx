import { getClienteObras, ObraCliente } from "@/services/api/clienteApi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";
import { BeckFilterPanel } from "../../components/BeckFilterPanel";

type ClienteObraFiltro = "todas" | "pendientes" | "validadas";

const CLIENTE_OBRA_FILTERS: {
  value: ClienteObraFiltro;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { value: "todas", label: "Todas", icon: "view-grid-outline" },
  { value: "pendientes", label: "Pendientes", icon: "clock-outline" },
  { value: "validadas", label: "Validadas", icon: "check-circle-outline" },
];

export default function ClienteScreen() {
  const [obras, setObras] = useState<ObraCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [obraFiltro, setObraFiltro] = useState<ClienteObraFiltro>("todas");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getClienteObras();
      setObras(data);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar las obras");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      };
      init();
      return () => { active = false; };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalPendientes = obras.reduce((sum, o) => sum + o.registrosPendientes, 0);
  const totalValidados  = obras.reduce((sum, o) => sum + o.registrosValidados,  0);
  const filterCounts = useMemo(
    () => ({
      todas: obras.length,
      pendientes: obras.filter((obra) => obra.registrosPendientes > 0).length,
      validadas: obras.filter((obra) => obra.registrosValidados > 0).length,
    }),
    [obras],
  );
  const filteredObras = useMemo(
    () =>
      obras.filter((obra) => {
        if (obraFiltro === "pendientes") return obra.registrosPendientes > 0;
        if (obraFiltro === "validadas") return obra.registrosValidados > 0;
        return true;
      }),
    [obraFiltro, obras],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Cargando obras...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: 2 }]} edges={["top", "left", "right"]}>
      <View style={styles.fixedHeader}>
        <BrandHeader subtitle="Validación · BECK" />
        <Text variant="titleLarge" style={styles.title}>Mis Obras</Text>
        <Text style={styles.subtitle}>Registros listos para tu validación final.</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={() => load()} style={styles.retryBtn}>
              Reintentar
            </Button>
          </View>
        ) : null}

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, styles.kpiOrange]}>
            <MaterialCommunityIcons name="clock-outline" size={22} color="#ea580c" />
            <Text style={styles.kpiValue}>{totalPendientes}</Text>
            <Text style={styles.kpiLabel}>Pendientes</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiGreen]}>
            <MaterialCommunityIcons name="check-circle-outline" size={22} color="#16a34a" />
            <Text style={[styles.kpiValue, styles.greenValue]}>{totalValidados}</Text>
            <Text style={styles.kpiLabel}>Validados</Text>
          </View>
        </View>

        <BeckFilterPanel
          title="Filtrar obras"
          resultCount={filteredObras.length}
          options={CLIENTE_OBRA_FILTERS.map((filter) => ({
            ...filter,
            count: filterCounts[filter.value],
          }))}
          value={obraFiltro}
          onChange={setObraFiltro}
        />

        {obras.length === 0 && !error ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="domain" size={52} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Sin obras asignadas</Text>
            <Text style={styles.emptyText}>No tienes obras asignadas en este momento.</Text>
          </View>
        ) : null}

        {obras.length > 0 && filteredObras.length === 0 && !error ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="filter-off-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Sin coincidencias</Text>
            <Text style={styles.emptyText}>No hay obras para el filtro seleccionado.</Text>
          </View>
        ) : null}

        {filteredObras.map((obra) => (
          <Pressable
            key={obra.id}
            style={({ pressed }) => [styles.obraCard, pressed && styles.pressed]}
            onPress={() => router.push(`/cliente/${obra.id}`)}
          >
            <View style={styles.obraHeader}>
              <View style={styles.obraIconBox}>
                <MaterialCommunityIcons name="office-building-outline" size={26} color="#f97316" />
              </View>
              <View style={styles.obraInfo}>
                <Text style={styles.obraNombre} numberOfLines={2}>{obra.nombre}</Text>
                <Text style={styles.obraCodigo}>{obra.codigo}{obra.cliente ? ` · ${obra.cliente}` : ""}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={28} color="#94a3b8" />
            </View>

            {obra.direccion ? (
              <Text style={styles.obraDireccion} numberOfLines={1}>
                <MaterialCommunityIcons name="map-marker-outline" size={12} color="#94a3b8" /> {obra.direccion}
              </Text>
            ) : null}

            <View style={styles.obraStats}>
              <View style={[styles.statBadge, obra.registrosPendientes > 0 ? styles.badgeOrange : styles.badgeGray]}>
                <Text style={[styles.statNum, obra.registrosPendientes > 0 ? styles.numOrange : styles.numGray]}>
                  {obra.registrosPendientes}
                </Text>
                <Text style={[styles.statLabel, obra.registrosPendientes > 0 ? styles.labelOrange : styles.labelGray]}>
                  {obra.registrosPendientes === 1 ? "pendiente" : "pendientes"}
                </Text>
              </View>
              {obra.registrosValidados > 0 ? (
                <View style={[styles.statBadge, styles.badgeGreen]}>
                  <Text style={[styles.statNum, styles.numGreen]}>{obra.registrosValidados}</Text>
                  <Text style={[styles.statLabel, styles.labelGreen]}>validados</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#f5f7fb" },
  fixedHeader: { backgroundColor: "#f5f7fb", paddingBottom: 8, paddingHorizontal: 16 },
  content:     { paddingHorizontal: 16, paddingBottom: 88, paddingTop: 4 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  loadingText: { marginTop: 12, color: "#475569" },
  title:       { color: "#0f172a", marginBottom: 4 },
  subtitle:    { color: "#475569", marginBottom: 14, lineHeight: 20 },
  errorBox:    { backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderRadius: 14, borderWidth: 1, marginBottom: 12, padding: 14 },
  errorText:   { color: "#dc2626", fontWeight: "700", marginBottom: 10 },
  retryBtn:    { backgroundColor: "#f97316", borderRadius: 12 },
  kpiRow:      { flexDirection: "row", gap: 10, marginBottom: 16 },
  kpiCard:     { flex: 1, alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  kpiOrange:   { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  kpiGreen:    { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  kpiValue:    { color: "#0f172a", fontSize: 28, fontWeight: "900" },
  greenValue:  { color: "#16a34a" },
  kpiLabel:    { color: "#64748b", fontSize: 12, fontWeight: "700" },
  emptyState:  { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle:  { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  emptyText:   { color: "#64748b", fontSize: 14, textAlign: "center", lineHeight: 20 },
  obraCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  pressed:     { opacity: 0.85 },
  obraHeader:  { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 8 },
  obraIconBox: { alignItems: "center", backgroundColor: "#fff7ed", borderRadius: 12, height: 46, justifyContent: "center", width: 46 },
  obraInfo:    { flex: 1 },
  obraNombre:  { color: "#0f172a", fontSize: 16, fontWeight: "800", lineHeight: 22 },
  obraCodigo:  { color: "#64748b", fontSize: 12, lineHeight: 18, marginTop: 2 },
  obraDireccion: { color: "#94a3b8", fontSize: 12, marginBottom: 10, paddingLeft: 4 },
  obraStats:   { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statBadge:   { alignItems: "center", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  badgeOrange: { backgroundColor: "#fff7ed", borderColor: "#fdba74" },
  badgeGreen:  { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  badgeGray:   { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" },
  statNum:     { fontSize: 16, fontWeight: "900" },
  numOrange:   { color: "#ea580c" },
  numGreen:    { color: "#16a34a" },
  numGray:     { color: "#94a3b8" },
  statLabel:   { fontSize: 12, fontWeight: "600" },
  labelOrange: { color: "#ea580c" },
  labelGreen:  { color: "#16a34a" },
  labelGray:   { color: "#94a3b8" },
});
