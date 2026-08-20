import {
  getMisRegistros,
  RegistroHistorialApi,
} from "@/services/api/registrosApi";
import { STORAGE_KEYS } from "@/services/auth/session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Text,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";
import { RegistroHistoryDetailModal } from "../../components/RegistroHistoryDetailModal";
import { RegistroHistoryCard } from "../../components/RegistroHistoryCard";
import { RegistroHistorySearch } from "../../components/RegistroHistorySearch";
import { BeckDateFilter } from "../../components/BeckDateFilter";
import { BeckOptionFilter } from "../../components/BeckOptionFilter";
import { matchesRegistroHistorySearch } from "../../utils/registroHistorySearch";

async function getHiddenValidatedIds() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.hiddenValidatedRegistros);

  if (!raw) return new Set<string>();

  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set<string>();
  }
}

async function saveHiddenValidatedIds(ids: Set<string>) {
  await AsyncStorage.setItem(
    STORAGE_KEYS.hiddenValidatedRegistros,
    JSON.stringify(Array.from(ids)),
  );
}

export default function HistorialScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [registros, setRegistros] = useState<RegistroHistorialApi[]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [obraFilter, setObraFilter] = useState("todas");
  const [selectedRegistro, setSelectedRegistro] =
    useState<RegistroHistorialApi | null>(null);
  const [hiddenValidatedIds, setHiddenValidatedIds] = useState<Set<string>>(
    new Set(),
  );

  const loadRegistros = useCallback(async (forceRefresh = false) => {
    try {
      setError("");
      const [hiddenIds, data] = await Promise.all([
        getHiddenValidatedIds(),
        getMisRegistros(forceRefresh),
      ]);

      setHiddenValidatedIds(hiddenIds);
      setRegistros(data);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar los registros");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadRegistros();
      setLoading(false);
    };

    init();
  }, [loadRegistros]);

  const visibleRegistros = useMemo(
    () =>
      registros.filter(
        (registro) =>
          (registro.estado !== "validado" || !hiddenValidatedIds.has(registro.id)) &&
          matchesRegistroHistorySearch(registro, search) &&
          (!dateFilter || registro.fecha.slice(0, 10) === dateFilter) &&
          (obraFilter === "todas" || registro.obras?.id === obraFilter),
      ),
    [dateFilter, hiddenValidatedIds, obraFilter, registros, search],
  );

  const historyObras = useMemo(() => {
    const unique = new Map<string, string>();
    registros.forEach((registro) => {
      if (registro.obras?.id && registro.obras?.nombre) {
        unique.set(registro.obras.id, registro.obras.nombre);
      }
    });
    return Array.from(unique, ([value, label]) => ({ value, label })).sort(
      (a, b) => a.label.localeCompare(b.label, "es"),
    );
  }, [registros]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRegistros(true);
    setRefreshing(false);
  };

  const hideValidatedRegistro = async (registroId: string) => {
    const next = new Set(hiddenValidatedIds);
    next.add(registroId);

    setHiddenValidatedIds(next);
    await saveHiddenValidatedIds(next);
  };

  const renderFixedHeader = () => (
    <View style={styles.fixedHeader}>
      <BrandHeader subtitle="Registros realizados · BECK" />
      <RegistroHistorySearch value={search} onChangeText={setSearch} />
      <View style={styles.historyInlineFilters}>
        <BeckDateFilter
          value={dateFilter}
          onChange={setDateFilter}
          compact
          containerStyle={styles.historyInlineFilter}
        />
        <BeckOptionFilter
          label="Filtrar por obra"
          value={obraFilter}
          allValue="todas"
          allLabel="Todas las obras"
          options={historyObras}
          onChange={setObraFilter}
          compact
          containerStyle={styles.historyInlineFilter}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.helper}>Cargando historial...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorTitle}>No se pudo cargar el historial</Text>
        <Text style={styles.errorText}>{error}</Text>

        <Button
          mode="contained"
          onPress={() => loadRegistros(true)}
          style={styles.retryButton}
          contentStyle={styles.retryButtonContent}
          labelStyle={styles.retryButtonLabel}
        >
          Reintentar
        </Button>
      </View>
    );
  }

  return (
    <>
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      {renderFixedHeader()}
      <FlatList
        data={visibleRegistros}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin registros</Text>
            <Text style={styles.itemMeta}>
              {search || dateFilter || obraFilter !== "todas"
                ? "No hay registros que coincidan con la búsqueda o los filtros seleccionados."
                : "Cuando realices registros en terreno aparecerán aquí."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <View>
              <RegistroHistoryCard
                registro={item}
                onPress={() => setSelectedRegistro(item)}
              />
              {item.estado === "validado" ? (
                <Button
                  mode="outlined"
                  icon="trash-can-outline"
                  onPress={() => hideValidatedRegistro(item.id)}
                  style={styles.removeButton}
                  labelStyle={styles.removeButtonLabel}
                >
                  Borrar del historial
                </Button>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
    <RegistroHistoryDetailModal
      registro={selectedRegistro}
      onClose={() => setSelectedRegistro(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    paddingTop: 4,
  },
  fixedHeader: {
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  historyInlineFilters: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  historyInlineFilter: {
    flex: 1,
    marginBottom: 0,
    minWidth: 0,
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
  },
  openHint: {
    alignItems: "center",
    borderTopColor: "#fed7aa",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 5,
    marginTop: 10,
    paddingTop: 9,
  },
  openHintText: {
    color: "#c2410c",
    fontSize: 12,
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  titleGroup: {
    flex: 1,
  },
  itemTitle: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 16,
  },
  itemDetail: {
    color: "#0f172a",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 8,
    lineHeight: 19,
  },
  detailGrid: {
    gap: 4,
  },
  detailItem: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
  observaciones: {
    marginTop: 8,
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
  itemMeta: {
    color: "#64748b",
    fontSize: 12,
    flexShrink: 1,
  },
  chip: {
    borderRadius: 14,
    height: 32,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  chipText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  removeButton: {
    marginTop: 14,
    borderColor: "#dc2626",
    borderRadius: 12,
  },
  removeButtonLabel: {
    color: "#dc2626",
    fontWeight: "700",
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#0f172a",
    fontWeight: "700",
    marginBottom: 4,
  },
  centerBox: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  helper: {
    marginTop: 12,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  errorTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    color: "#dc2626",
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
  retryButtonContent: {
    minHeight: 46,
  },
  retryButtonLabel: {
    fontWeight: "700",
  },
});
