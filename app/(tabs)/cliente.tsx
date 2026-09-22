import { getClienteObras, type ObraCliente } from "@/services/api/clienteApi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "@/components/BrandHeader";
import { BeckFilterPanel } from "@/components/BeckFilterPanel";
import { BeckSearchInput } from "@/components/BeckSearchInput";
import {
  filtrarObrasCliente,
  type ClienteObraFiltro,
} from "@/utils/clienteObras";

const FILTERS: {
  value: ClienteObraFiltro;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { value: "todas", label: "Todas", icon: "view-grid-outline" },
  { value: "pendientes", label: "Pendientes", icon: "clock-outline" },
  { value: "validadas", label: "Validadas", icon: "check-circle-outline" },
];

const ObraCard = memo(function ObraCard({ obra }: { obra: ObraCliente }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${obra.nombre}, código ${obra.codigo}. ${obra.registrosPendientes} pendientes y ${obra.registrosValidados} validados. Ver registros.`}
      onPress={() => router.push(`/cliente/${obra.id}`)}
      style={({ pressed }) => [styles.obraCard, pressed && styles.pressed]}
    >
      <View style={styles.obraHeader}>
        <View style={styles.obraIcon}>
          <MaterialCommunityIcons
            name="office-building-outline"
            size={24}
            color="#0f172a"
          />
        </View>
        <View style={styles.obraInfo}>
          <Text style={styles.obraNombre} numberOfLines={2}>
            {obra.nombre}
          </Text>
          <Text style={styles.obraCodigo}>
            Código: {obra.codigo || "Sin código"}
          </Text>
        </View>
      </View>
      {obra.cliente || obra.direccion ? (
        <View style={styles.obraDetails}>
          {!!obra.cliente && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="account-outline"
                size={15}
                color="#c2410c"
              />
              <Text style={styles.detailText} numberOfLines={2}>
                {obra.cliente}
              </Text>
            </View>
          )}
          {!!obra.direccion && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={15}
                color="#c2410c"
              />
              <Text style={styles.detailText} numberOfLines={2}>
                {obra.direccion}
              </Text>
            </View>
          )}
        </View>
      ) : null}
      <View style={styles.obraStats}>
        <View
          style={[
            styles.badge,
            obra.registrosPendientes
              ? styles.pendingBadge
              : styles.neutralBadge,
          ]}
        >
          <MaterialCommunityIcons
            name="clock-outline"
            size={15}
            color={obra.registrosPendientes ? "#92400e" : "#64748b"}
          />
          <Text
            style={[
              styles.badgeText,
              !obra.registrosPendientes && styles.neutralText,
            ]}
          >
            {obra.registrosPendientes}{" "}
            {obra.registrosPendientes === 1 ? "pendiente" : "pendientes"}
          </Text>
        </View>
        <View style={[styles.badge, styles.validatedBadge]}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={15}
            color="#15803d"
          />
          <Text style={[styles.badgeText, styles.validatedText]}>
            {obra.registrosValidados}{" "}
            {obra.registrosValidados === 1 ? "validado" : "validados"}
          </Text>
        </View>
      </View>
      <View style={styles.obraFooter}>
        <View style={styles.footerLabel}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={16}
            color="#c2410c"
          />
          <Text style={styles.footerText}>Ver registros de la obra</Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={21}
          color="#c2410c"
        />
      </View>
    </Pressable>
  );
});

const renderObra = ({ item }: { item: ObraCliente }) => (
  <ObraCard obra={item} />
);
const obraKey = (obra: ObraCliente) => obra.id;

export default function ClienteScreen() {
  const { filtro } = useLocalSearchParams<{ filtro?: string }>();
  const obraFiltro: ClienteObraFiltro =
    filtro === "pendientes" || filtro === "validadas" ? filtro : "todas";
  const [obras, setObras] = useState<ObraCliente[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [hasData, setHasData] = useState(false);
  const loaded = useRef(false);
  const generation = useRef(0);

  const load = useCallback(async (manual = false) => {
    const ticket = ++generation.current;
    setLoading(!loaded.current);
    setRefreshing(manual);
    setError("");
    try {
      const data = await getClienteObras();
      if (ticket !== generation.current) return;
      setObras(data);
      setHasData(true);
      loaded.current = true;
    } catch (err) {
      if (ticket === generation.current)
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las obras",
        );
    } finally {
      if (ticket === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current += 1;
      };
    }, [load]),
  );

  const filteredObras = useMemo(
    () => filtrarObrasCliente(obras, obraFiltro, search),
    [obras, obraFiltro, search],
  );
  const filters = useMemo(
    () =>
      FILTERS.map((option) => ({
        ...option,
        count: filtrarObrasCliente(obras, option.value, search).length,
      })),
    [obras, search],
  );
  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);
  const onFilterChange = useCallback(
    (value: ClienteObraFiltro) => router.setParams({ filtro: value }),
    [],
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.fixedHeader}>
        <BrandHeader subtitle="Mis obras · Cliente" />
        <BeckSearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o código de obra"
        />
        <BeckFilterPanel
          title="Filtrar obras"
          resultCount={filteredObras.length}
          options={filters}
          value={obraFiltro}
          onChange={onFilterChange}
        />
      </View>
      <FlatList
        data={filteredObras}
        renderItem={renderObra}
        keyExtractor={obraKey}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={refreshing}
        onRefresh={onRefresh}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        ListHeaderComponent={
          error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
              {hasData && (
                <Text style={styles.emptyText}>
                  Se muestra la última información cargada.
                </Text>
              )}
              <Button
                onPress={onRefresh}
                disabled={refreshing}
                textColor="#c2410c"
              >
                Reintentar
              </Button>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={styles.emptyText}>Cargando tus obras…</Text>
            </View>
          ) : !error ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name={
                    obras.length
                      ? "filter-off-outline"
                      : "office-building-outline"
                  }
                  size={30}
                  color="#9a7100"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {obras.length ? "Sin coincidencias" : "Sin obras asignadas"}
              </Text>
              <Text style={styles.emptyText}>
                {obras.length
                  ? "Prueba con otro nombre, código o filtro."
                  : "Tus obras aparecerán aquí cuando te las asignen."}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb", paddingTop: 2 },
  fixedHeader: { backgroundColor: "#f5f7fb", paddingHorizontal: 16 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 2,
    gap: 12,
    flexGrow: 1,
  },
  obraCard: {
    backgroundColor: "#fffaf0",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FDC10B",
    borderLeftWidth: 4,
    borderLeftColor: "#f97316",
    padding: 12,
    gap: 10,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  obraHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  obraIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FDC10B",
    alignItems: "center",
    justifyContent: "center",
  },
  obraInfo: { flex: 1, minWidth: 0 },
  obraNombre: {
    color: "#0f172a",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },
  obraCodigo: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  obraDetails: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fff",
    gap: 5,
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  detailText: { flex: 1, color: "#475569", fontSize: 12, lineHeight: 17 },
  obraStats: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 9,
  },
  pendingBadge: { backgroundColor: "#fef3c7" },
  validatedBadge: { backgroundColor: "#dcfce7" },
  neutralBadge: { backgroundColor: "#f1f5f9" },
  badgeText: { color: "#92400e", fontSize: 11, fontWeight: "800" },
  validatedText: { color: "#15803d" },
  neutralText: { color: "#64748b" },
  obraFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#fde68a",
    paddingTop: 8,
    gap: 8,
  },
  footerLabel: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: { flex: 1, color: "#c2410c", fontSize: 11, fontWeight: "800" },
  errorBox: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  errorText: { color: "#b91c1c", fontWeight: "700" },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 36,
    gap: 10,
  },
  emptyIcon: { backgroundColor: "#fef3c7", padding: 16, borderRadius: 18 },
  emptyTitle: { color: "#0f172a", fontSize: 17, fontWeight: "800" },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  pressed: { opacity: 0.75 },
});
