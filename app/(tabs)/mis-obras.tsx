import {
  getMisObras,
  isObraDisponible,
  ObraApi,
} from "@/services/api/obrasApi";
import { getSession, saveSelectedObra } from "@/services/auth/session";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BeckSearchInput } from "@/components/BeckSearchInput";
import { BeckFilterPanel } from "@/components/BeckFilterPanel";
import { BrandHeader } from "../../components/BrandHeader";
import RegistrosScreen from "./registros";

type EstadoFiltro = "todas" | "activa" | "pausada";

const OBRA_FILTERS: {
  value: EstadoFiltro;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { value: "todas", label: "Todas", icon: "view-grid-outline" },
  { value: "activa", label: "Activas", icon: "check-circle-outline" },
  { value: "pausada", label: "Pausadas", icon: "pause-circle-outline" },
];

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
  const hasLoadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [obras, setObras] = useState<ObraApi[]>([]);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todas");
  const [showRegistro, setShowRegistro] = useState(false);
  const [selectedObra, setSelectedObra] = useState<ObraApi | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminView, setAdminView] = useState<"obras" | "registros">("obras");

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

  const filterCounts = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const matchingSearch = obras.filter(
      (obra) =>
        !term ||
        `${obra.nombre} ${obra.codigo || ""}`.toLowerCase().includes(term),
    );

    return {
      todas: matchingSearch.length,
      activa: matchingSearch.filter((obra) => obra.estado === "activa").length,
      pausada: matchingSearch.filter((obra) => obra.estado === "pausada").length,
    };
  }, [obras, search]);

  const loadObras = useCallback(async (forceRefresh = false) => {
    try {
      setError("");
      const data = await getMisObras(forceRefresh);
      setObras(data);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar las obras");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
    const init = async () => {
      const shouldBlockScreen = !hasLoadedRef.current;
      if (shouldBlockScreen) setLoading(true);
      try {
        const [session] = await Promise.all([getSession(), loadObras()]);
        if (active) {
          setIsAdmin(session.user?.rol === "administrador");
        }
      } finally {
        if (active) {
          hasLoadedRef.current = true;
          if (shouldBlockScreen) setLoading(false);
        }
      }
    };

      void init();
      return () => {
        active = false;
      };
    }, [loadObras]),
  );

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
      <BrandHeader subtitle={isAdmin ? "Operario · Administración" : "Obras disponibles · BECK"} />
      {isAdmin ? (
        <View style={styles.adminSwitcher}>
          <Button
            mode={adminView === "obras" ? "contained" : "outlined"}
            icon="office-building-outline"
            onPress={() => setAdminView("obras")}
            style={styles.adminSwitcherButton}
            labelStyle={styles.adminSwitcherLabel}
          >
            Nueva carga
          </Button>
          <Button
            mode={adminView === "registros" ? "contained" : "outlined"}
            icon="clipboard-clock-outline"
            onPress={() => setAdminView("registros")}
            style={styles.adminSwitcherButton}
            labelStyle={styles.adminSwitcherLabel}
          >
            Pendientes
          </Button>
        </View>
      ) : null}
      <BeckSearchInput
        placeholder="Buscar por nombre o código"
        value={search}
        onChangeText={setSearch}
      />
      <BeckFilterPanel
        title="Filtrar obras"
        resultCount={filteredObras.length}
        options={OBRA_FILTERS.map((filter) => ({
          ...filter,
          count: filterCounts[filter.value],
        }))}
        value={estadoFiltro}
        onChange={setEstadoFiltro}
      />
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
        operationalRole={isAdmin ? "terreno" : undefined}
        onChangeObra={() => {
          setSelectedObra(null);
          setShowRegistro(false);
        }}
      />
    );
  }

  if (isAdmin && adminView === "registros") {
    return (
      <RegistrosScreen
        operationalRole="terreno"
        onChangeObra={() => setAdminView("obras")}
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
            <View style={styles.cardClip}>
              <View style={styles.cardAccent} />
              <Card.Content style={styles.cardContent}>
                <View style={styles.topRow}>
                  <View style={styles.obraIcon}>
                    <MaterialCommunityIcons
                      name="office-building-outline"
                      size={25}
                      color="#0f172a"
                    />
                  </View>

                  <View style={styles.cardHeading}>
                    <Text style={styles.cardTitle}>{item.nombre}</Text>
                    <Text style={styles.codeBadge}>
                      {item.codigo || "Sin código"}
                    </Text>
                  </View>

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

                <View style={styles.descriptionBox}>
                  <MaterialCommunityIcons
                    name="text-box-outline"
                    size={18}
                    color="#64748b"
                  />
                  <View style={styles.descriptionContent}>
                    <Text style={styles.cardLabel}>Descripción</Text>
                    <Text style={styles.cardValue} numberOfLines={2}>
                      {item.descripcion || "Sin descripción"}
                    </Text>
                  </View>
                </View>

                <Button
                  mode="contained"
                  icon="arrow-right"
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
            </View>
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
  adminSwitcher: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  adminSwitcherButton: {
    borderColor: "#0f172a",
    borderRadius: 13,
    flex: 1,
  },
  adminSwitcherLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyListContent: {
    flexGrow: 1,
  },
  card: {
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#FDC10B",
  },
  cardClip: {
    borderRadius: 18,
    overflow: "hidden",
  },
  cardAccent: {
    backgroundColor: "#f97316",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 5,
  },
  cardContent: {
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 13,
  },
  obraIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 13,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  cardHeading: {
    flex: 1,
    alignItems: "flex-start",
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
  },
  codeBadge: {
    backgroundColor: "#0f172a",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  chip: {
    borderRadius: 999,
    flexShrink: 0,
  },
  chipText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  descriptionBox: {
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderColor: "#fde68a",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  descriptionContent: {
    flex: 1,
  },
  cardLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardValue: {
    marginTop: 3,
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
  selectButton: {
    marginTop: 12,
    backgroundColor: "#0f172a",
    borderRadius: 12,
  },
  selectButtonContent: {
    flexDirection: "row-reverse",
    minHeight: 44,
  },
  selectButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  searchInput: {
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  filterPanel: {
    backgroundColor: "#fffaf0",
    borderColor: "#fbbf24",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 10,
  },
  filterHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  filterTitleGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  filterIconBox: {
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderRadius: 8,
    height: 29,
    justifyContent: "center",
    width: 29,
  },
  filterTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  filterResultCount: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#fed7aa",
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 6,
  },
  filterOptionSelected: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  filterOptionPressed: {
    opacity: 0.75,
  },
  filterOptionText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "800",
  },
  filterOptionTextSelected: {
    color: "#ffffff",
  },
  filterBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    color: "#475569",
    fontSize: 9,
    fontWeight: "900",
    minWidth: 19,
    overflow: "hidden",
    paddingHorizontal: 5,
    paddingVertical: 2,
    textAlign: "center",
  },
  filterBadgeSelected: {
    backgroundColor: "#FDC10B",
    color: "#0f172a",
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
