import {
  getMisRegistros,
  RegistroHistorialApi,
} from "@/services/api/registrosApi";
import {
  estadoColor,
  formatShortDate as formatDate,
  getEstadoLabel,
} from "@/utils/registroEstado";
import { STORAGE_KEYS } from "@/services/auth/session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";

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
          registro.estado !== "validado" || !hiddenValidatedIds.has(registro.id),
      ),
    [hiddenValidatedIds, registros],
  );

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

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <BrandHeader subtitle="Registros realizados · BECK" />
      <Text variant="titleLarge" style={styles.title}>
        Historial de registros
      </Text>
      <Text style={styles.subtitle}>
        Revisa el estado de tus registros y actualiza la lista para ver cambios
        recientes.
      </Text>
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
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <FlatList
        ListHeaderComponent={renderHeader}
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
              Cuando realices registros en terreno aparecerán aquí.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const obraNombre = item.obras?.nombre || "Obra sin nombre";

          return (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.headerRow}>
                  <View style={styles.titleGroup}>
                    <Text style={styles.itemTitle}>{obraNombre}</Text>
                    <Text style={styles.itemMeta}>
                      {item.obras?.codigo || "Sin código"} ·{" "}
                      {formatDate(item.fecha)}
                    </Text>
                  </View>

                  <Chip
                    compact
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          estadoColor[item.estado] || estadoColor.pendiente,
                      },
                    ]}
                    textStyle={styles.chipText}
                  >
                    {getEstadoLabel(item.estado)}
                  </Chip>
                </View>

                <Text style={styles.itemDetail}>
                  {item.descripcion_material}
                </Text>

                <View style={styles.detailGrid}>
                  <Text style={styles.detailItem}>Módulo: {item.modulo}</Text>
                  <Text style={styles.detailItem}>Piso: {item.piso}</Text>
                  <Text style={styles.detailItem}>
                    Eje: {item.eje_numerico}-{item.eje_alfabetico}
                  </Text>
                  <Text style={styles.detailItem}>
                    Sellos: {item.cantidad_sellos}
                  </Text>
                </View>

                {item.observaciones ? (
                  <Text style={styles.observaciones}>
                    Observaciones: {item.observaciones}
                  </Text>
                ) : null}

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
              </Card.Content>
            </Card>
          );
        }}
      />
    </SafeAreaView>
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
  },
  headerWrapper: {
    paddingHorizontal: 0,
    paddingBottom: 8,
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
    overflow: "hidden",
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
