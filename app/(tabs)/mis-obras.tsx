import {
  getMisObras,
  isObraDisponible,
  ObraApi,
} from "@/services/api/obrasApi";
import { saveSelectedObra } from "@/services/auth/session";
import React, { useCallback, useEffect, useState } from "react";
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
import { TextInput } from "@/components/AppTextInput";
import { BrandHeader } from "../../components/BrandHeader";
import RegistrosScreen from "./registros";

function getEstadoLabel(estado?: string | null) {
  switch (estado) {
    case "activa":
      return "Activa";
    case "pausada":
      return "Pausada";
    case "finalizada":
      return "Finalizada";
    case "inactiva":
      return "Inactiva";
    default:
      return "Inactiva";
  }
}

function getEstadoBg(estado?: string | null) {
  switch (estado) {
    case "activa":
      return "#16a34a";
    case "pausada":
      return "#f59e0b";
    case "finalizada":
      return "#64748b";
    case "inactiva":
      return "#dc2626";
    default:
      return "#dc2626";
  }
}

export default function MisObrasScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [obras, setObras] = useState<ObraApi[]>([]);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<
    "todas" | "activa" | "pausada"
  >("todas");
  const [showRegistro, setShowRegistro] = useState(false);
  const [selectedObra, setSelectedObra] = useState<ObraApi | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const filteredObras = React.useMemo(() => {
    const term = search.trim().toLowerCase();

    return obras.filter((obra) => {
      const matchesText =
        !term ||
        `${obra.nombre} ${obra.codigo || ""}`.toLowerCase().includes(term);
      const matchesEstado =
        estadoFiltro === "todas" || obra.estado === estadoFiltro;

      return matchesText && matchesEstado;
    });
  }, [estadoFiltro, obras, search]);

  const loadObras = useCallback(async (forceRefresh = false) => {
    try {
      setError("");
      const data = await getMisObras(forceRefresh);
      setObras(data);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar las obras");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadObras();
      setLoading(false);
    };

    init();
  }, [loadObras]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadObras(true);
    setRefreshing(false);
  };

  const onSelectObra = async (obra: ObraApi) => {
    if (!isObraDisponible(obra.estado)) {
      setError("Esta obra no esta disponible para registros.");
      return;
    }

    try {
      setSelectingId(obra.id);

      await saveSelectedObra({
        id: obra.id,
        nombre: obra.nombre,
        codigo: obra.codigo,
        descripcion: obra.descripcion,
        estado: obra.estado,
      });

      setSelectedObra(obra);
      setShowRegistro(true);
    } catch (err: any) {
      if (__DEV__) console.warn("SELECT OBRA ERROR", err);
      setError(err?.message || "No se pudo seleccionar la obra. Intenta nuevamente.");
    } finally {
      setSelectingId(null);
    }
  };

  const renderHeader = () => (
    <>
      <BrandHeader subtitle="Obras disponibles · BECK" />
      <Text variant="titleLarge" style={styles.title}>
        Obras disponibles
      </Text>
      <Text style={styles.subtitle}>
        Selecciona una obra activa o pausada para trabajar hoy.
      </Text>
      <TextInput
        label="Buscar por nombre o código"
        value={search}
        onChangeText={setSearch}
        mode="outlined"
        style={styles.searchInput}
        left={<TextInput.Icon icon="magnify" />}
      />
      <View style={styles.filterRow}>
        <Chip
          selected={estadoFiltro === "todas"}
          onPress={() => setEstadoFiltro("todas")}
          style={[
            styles.filterChip,
            estadoFiltro === "todas" && styles.filterChipSelected,
          ]}
          textStyle={[
            styles.filterChipText,
            estadoFiltro === "todas" && styles.filterChipTextSelected,
          ]}
        >
          Todas
        </Chip>
        <Chip
          selected={estadoFiltro === "activa"}
          onPress={() => setEstadoFiltro("activa")}
          style={[
            styles.filterChip,
            estadoFiltro === "activa" && styles.filterChipSelected,
          ]}
          textStyle={[
            styles.filterChipText,
            estadoFiltro === "activa" && styles.filterChipTextSelected,
          ]}
        >
          Activas
        </Chip>
        <Chip
          selected={estadoFiltro === "pausada"}
          onPress={() => setEstadoFiltro("pausada")}
          style={[
            styles.filterChip,
            estadoFiltro === "pausada" && styles.filterChipSelected,
          ]}
          textStyle={[
            styles.filterChipText,
            estadoFiltro === "pausada" && styles.filterChipTextSelected,
          ]}
        >
          Pausadas
        </Chip>
      </View>
    </>
  );

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.helper}>Cargando tus obras...</Text>
      </View>
    );
  }

  if (showRegistro) {
    return (
      <RegistrosScreen
        mode="form"
        initialObra={selectedObra}
        onChangeObra={() => {
          setSelectedObra(null);
          setShowRegistro(false);
        }}
      />
    );
  }

  if (error) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorTitle}>No se pudieron cargar las obras</Text>
        <Text style={styles.errorText}>{error}</Text>

        <Button
          mode="contained"
          onPress={() => loadObras(true)}
          style={styles.retryButton}
          contentStyle={styles.retryButtonContent}
          labelStyle={styles.retryButtonLabel}
        >
          Reintentar
        </Button>
      </View>
    );
  }

  if (!obras.length) {
    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: insets.top + 2 }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.fixedHeader}>{renderHeader()}</View>
        <FlatList
          data={[] as ObraApi[]}
          keyExtractor={(item) => item.id}
          renderItem={() => null}
          contentContainerStyle={[
            styles.listContent,
            styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No hay obras disponibles</Text>
              <Text style={styles.helper}>
                Cuando una obra quede activa o pausada, aparecera aqui.
              </Text>
            </View>
          }
          refreshControl={refreshControl}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.fixedHeader}>{renderHeader()}</View>
      <FlatList
        data={filteredObras}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.helper}>
              Prueba buscar por nombre, codigo o cambia el filtro de estado.
            </Text>
          </View>
        }
        refreshControl={refreshControl}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.topRow}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>

                <Chip
                  style={[
                    styles.chip,
                    { backgroundColor: getEstadoBg(item.estado) },
                  ]}
                  textStyle={styles.chipText}
                >
                  {getEstadoLabel(item.estado)}
                </Chip>
              </View>

              <Text style={styles.cardLabel}>Código</Text>
              <Text style={styles.cardValue}>{item.codigo}</Text>

              <Text style={styles.cardLabel}>Descripción</Text>
              <Text style={styles.cardValue}>
                {item.descripcion || "Sin descripción"}
              </Text>

              <Button
                mode="contained"
                onPress={() => onSelectObra(item)}
                loading={selectingId === item.id}
                disabled={selectingId === item.id}
                style={styles.selectButton}
                contentStyle={styles.selectButtonContent}
                labelStyle={styles.selectButtonLabel}
              >
                {selectingId === item.id
                  ? "Seleccionando..."
                  : "Selecciona esta obra"}
              </Button>
            </Card.Content>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#0f172a",
    marginBottom: 14,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  fixedHeader: {
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  card: {
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
  },
  chip: {
    borderRadius: 14,
  },
  chipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  cardLabel: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardValue: {
    marginTop: 2,
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
  },
  selectButton: {
    marginTop: 16,
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
  selectButtonContent: {
    minHeight: 46,
  },
  selectButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  searchInput: {
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderWidth: 1,
  },
  filterChipSelected: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  filterChipText: {
    color: "#334155",
    fontWeight: "700",
  },
  filterChipTextSelected: {
    color: "#ffffff",
  },
  centerBox: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  helper: {
    marginTop: 12,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
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
