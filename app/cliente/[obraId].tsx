import {
  getClienteRegistrosObra,
  type RegistroCliente,
} from "@/services/api/clienteApi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "@/components/BrandHeader";
import { BeckSearchInput } from "@/components/BeckSearchInput";
import { ClientePendingRegistroCard } from "@/components/ClientePendingRegistroCard";
import { matchesClienteRegistro } from "@/utils/clienteRegistros";
import { cargarVisibilidadCliente } from "@/services/api/clienteVisibilidad";
import { campoVisibleCliente, type ClienteVisibilidad } from "@/utils/clienteVisibilidad";

const EMPTY_REGISTROS: RegistroCliente[] = [];
const keyExtractor = (registro: RegistroCliente) => registro.id;

export default function ClienteObraScreen() {
  const { obraId } = useLocalSearchParams<{ obraId: string }>();
  const [result, setResult] = useState<{
    obraId: string;
    items: RegistroCliente[];
    visibility: ClienteVisibilidad;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const loadedObra = useRef<string | null>(null);
  const generation = useRef(0);
  const hasData = result?.obraId === obraId;
  const registros = hasData ? result.items : EMPTY_REGISTROS;

  const load = useCallback(
    async (manual = false) => {
      const ticket = ++generation.current;
      setLoading(loadedObra.current !== obraId);
      setRefreshing(manual);
      setError("");
      try {
        if (!obraId)
          throw new Error(
            "No se pudo identificar la obra. Vuelve a Mis obras e inténtalo nuevamente.",
          );
        const [data, configs] = await Promise.all([
          getClienteRegistrosObra(obraId), cargarVisibilidadCliente([obraId]),
        ]);
        if (ticket !== generation.current) return;
        setResult({ obraId, items: data, visibility: configs[obraId] });
        loadedObra.current = obraId;
      } catch (err) {
        if (ticket === generation.current) {
          setResult(null);
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los registros",
          );
        }
      } finally {
        if (ticket === generation.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [obraId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current += 1;
      };
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/cliente");
  }, []);
  const onOpen = useCallback(
    (id: string) => {
      router.push({
        pathname: "/cliente/registro/[id]",
        params: { id, obraId },
      });
    },
    [obraId],
  );
  const renderItem = useCallback(
    ({ item }: { item: RegistroCliente }) => (
      <ClientePendingRegistroCard registro={item} onOpen={onOpen} visibility={hasData ? result.visibility : undefined} />
    ),
    [onOpen, hasData, result],
  );
  const filteredRegistros = useMemo(
    () =>
      registros.filter((registro) => matchesClienteRegistro({
        ...registro,
        piso: campoVisibleCliente(result?.visibility, "piso") ? registro.piso : "",
        nombreSellador: campoVisibleCliente(result?.visibility, "nombreSellador") ? registro.nombreSellador : "",
        sellador: campoVisibleCliente(result?.visibility, "nombreSellador") ? registro.sellador : "",
        folio: campoVisibleCliente(result?.visibility, "folio") ? registro.folio : null,
      }, search)),
    [registros, search, result],
  );

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={styles.fixedHeader}>
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <BrandHeader subtitle="Revisión · Cliente" />
          </View>
          <Button
            mode="text"
            onPress={goBack}
            compact
            textColor="#c2410c"
            contentStyle={styles.backContent}
            accessibilityLabel="Volver a mis obras"
          >
            Volver
          </Button>
        </View>
        <View style={styles.heading}>
          <View style={styles.headingIcon}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={24}
              color="#FDC10B"
            />
          </View>
          <View style={styles.headingInfo}>
            <Text style={styles.title}>Registros pendientes</Text>
            <Text style={styles.subtitle}>
              Aprobados por Ingeniería · Pendientes de tu firma
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text
              accessibilityLabel={
                hasData
                  ? `${registros.length} registros pendientes de firma`
                  : "Cantidad aún no disponible"
              }
              style={styles.count}
            >
              {hasData ? registros.length : "—"}
            </Text>
          </View>
        </View>
        <BeckSearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar registros"
        />
        {!!search.trim() && hasData && (
          <Text style={styles.results}>
            {filteredRegistros.length} de {registros.length} registros
          </Text>
        )}
      </View>
      <FlatList
        data={filteredRegistros}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.content}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={refreshing}
        onRefresh={onRefresh}
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
              <Text style={styles.emptyText}>Cargando registros…</Text>
            </View>
          ) : !error ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialCommunityIcons
                  name={
                    registros.length ? "magnify" : "clipboard-check-outline"
                  }
                  size={30}
                  color="#9a7100"
                />
              </View>
              <Text style={styles.emptyTitle}>
                {registros.length
                  ? "Sin coincidencias"
                  : "Sin registros pendientes"}
              </Text>
              <Text style={styles.emptyText}>
                {registros.length
                  ? "Prueba con otro número de sello, piso o responsable."
                  : "Esta obra aún no tiene registros aprobados por Ingeniería para tu firma, o todos ya fueron firmados."}
              </Text>
              {registros.length > 0 && (
                <Button onPress={() => setSearch("")} textColor="#c2410c">
                  Limpiar búsqueda
                </Button>
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb", paddingTop: 2 },
  fixedHeader: { paddingHorizontal: 16, backgroundColor: "#f5f7fb" },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  brand: { flex: 1, minWidth: 0 },
  backContent: { minHeight: 44 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#FDC10B",
    padding: 12,
    marginBottom: 12,
  },
  headingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  headingInfo: { flex: 1, minWidth: 0 },
  title: { color: "#0f172a", fontSize: 16, fontWeight: "900" },
  subtitle: { color: "#64748b", fontSize: 11, lineHeight: 16, marginTop: 4 },
  countBadge: {
    borderRadius: 10,
    backgroundColor: "#FDC10B",
    minWidth: 36,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  count: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
  },
  results: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 24,
    gap: 12,
    flexGrow: 1,
  },
  errorBox: {
    padding: 14,
    gap: 8,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    borderRadius: 16,
  },
  errorText: { color: "#b91c1c", fontWeight: "700" },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 32,
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
});
