import {
  ClienteObraResumen,
  ClienteRegistroValidado,
  getClienteObras,
  getClienteRegistrosObra,
} from "@/services/api/clienteApi";
import {
  getMisObras,
  isObraDisponible,
  ObraApi,
} from "@/services/api/obrasApi";
import { getSession, saveSelectedObra } from "@/services/auth/session";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
  TextInput,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function getRegistroKind(registro: ClienteRegistroValidado) {
  return registro.tipoRegistro === "junta_lineal_espuma"
    ? "Junta Lineal"
    : "Sello";
}

function getRegistroFotos(registro: ClienteRegistroValidado) {
  const seen = new Set<string>();

  return [
    ...(registro.fotos || []),
    ...(registro.fotos_registro || []),
    ...(registro.fotosUrls || []).map((url, index) => ({
      id: `${registro.id}-url-${index}`,
      url,
    })),
    ...(registro.fotoUrl
      ? [{ id: `${registro.id}-foto-url`, url: registro.fotoUrl }]
      : []),
  ].filter((foto) => {
    if (!foto.url || seen.has(foto.url)) return false;
    seen.add(foto.url);
    return true;
  });
}

export default function MisObrasScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const [obras, setObras] = useState<ObraApi[]>([]);
  const [clienteObras, setClienteObras] = useState<ClienteObraResumen[]>([]);
  const [clienteObraSeleccionada, setClienteObraSeleccionada] =
    useState<ClienteObraResumen | null>(null);
  const [clienteRegistros, setClienteRegistros] = useState<ClienteRegistroValidado[]>([]);
  const [clienteRegistroSeleccionado, setClienteRegistroSeleccionado] =
    useState<ClienteRegistroValidado | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [loadingClienteRegistros, setLoadingClienteRegistros] = useState(false);
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

  const filteredClienteObras = React.useMemo(() => {
    const term = search.trim().toLowerCase();

    return clienteObras.filter((obra) => {
      const matchesText =
        !term ||
        `${obra.nombre} ${obra.codigo || ""}`.toLowerCase().includes(term);
      const matchesEstado =
        estadoFiltro === "todas" || obra.estado === estadoFiltro;

      return matchesText && matchesEstado;
    });
  }, [clienteObras, estadoFiltro, search]);

  const loadObras = useCallback(async (forceRefresh = false) => {
    try {
      setError("");
      const session = await getSession();
      const role = session.user?.rol || "";
      setUserRole(role);

      if (role === "cliente") {
        const data = await getClienteObras(forceRefresh);
        setClienteObras(data);
        setObras([]);
        return;
      }

      const data = await getMisObras(forceRefresh);
      setObras(data);
      setClienteObras([]);
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
    if (userRole === "cliente" && clienteObraSeleccionada) {
      await loadClienteRegistros(clienteObraSeleccionada, true);
    }
    setRefreshing(false);
  };

  const loadClienteRegistros = async (
    obra: ClienteObraResumen,
    forceRefresh = false,
  ) => {
    try {
      setError("");
      setClienteObraSeleccionada(obra);
      setClienteRegistroSeleccionado(null);
      setLoadingClienteRegistros(true);
      const data = await getClienteRegistrosObra(obra.id, forceRefresh);
      setClienteRegistros(data);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar los registros de la obra");
    } finally {
      setLoadingClienteRegistros(false);
    }
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
    } catch (err) {
      console.log("SELECT OBRA ERROR", err);
    } finally {
      setSelectingId(null);
    }
  };

  const renderHeader = () => (
    <>
      <BrandHeader
        subtitle={
          userRole === "cliente"
            ? "Mis obras · Cliente BECK"
            : "Obras disponibles · BECK"
        }
      />
      <Text variant="titleLarge" style={styles.title}>
        {userRole === "cliente" ? "Mis obras" : "Obras disponibles"}
      </Text>
      <Text style={styles.subtitle}>
        {userRole === "cliente"
          ? "Selecciona una obra para revisar sus registros validados."
          : "Selecciona una obra activa o pausada para trabajar hoy."}
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

  if (userRole === "cliente" && clienteRegistroSeleccionado) {
    const fotos = getRegistroFotos(clienteRegistroSeleccionado);
    const detalleCampos = [
      ["Tipo de registro", getRegistroKind(clienteRegistroSeleccionado)],
      ["Estado", clienteRegistroSeleccionado.estado || "Validado"],
      ["Fecha", formatDate(clienteRegistroSeleccionado.fecha)],
      ["Día semana", clienteRegistroSeleccionado.diaSemana],
      ["Código BECK", clienteRegistroSeleccionado.codigoBeck],
      ["Itemizado BECK", clienteRegistroSeleccionado.itemizadoBeck],
      ["Itemizado Mandante", clienteRegistroSeleccionado.itemizadoMandante],
      ["Material", clienteRegistroSeleccionado.material],
      ["Piso", clienteRegistroSeleccionado.piso],
      ["Módulo", clienteRegistroSeleccionado.modulo],
      ["Recinto", clienteRegistroSeleccionado.recinto],
      ["Eje alfabético", clienteRegistroSeleccionado.ejeAlfabetico],
      ["Eje numérico", clienteRegistroSeleccionado.ejeNumerico],
      ["N° del sello", clienteRegistroSeleccionado.numeroSello],
      ["Cantidad sellos", clienteRegistroSeleccionado.cantidadSellos],
      ["Metros lineales", clienteRegistroSeleccionado.metrosLineales],
      ["Holgura", clienteRegistroSeleccionado.holgura],
      ["Factor por holguras", clienteRegistroSeleccionado.factorPorHolguras],
      ["Accesibilidad", clienteRegistroSeleccionado.accesibilidad],
      [
        "Cantidad sellos con factores",
        clienteRegistroSeleccionado.cantidadSellosConFactores,
      ],
      ["Aislación", clienteRegistroSeleccionado.aislacion],
      ["Cantidad sellos aislación", clienteRegistroSeleccionado.cantidadSellosAislacion],
      ["Reparación tabique", clienteRegistroSeleccionado.reparacionTabique],
      ["Cantidad final", clienteRegistroSeleccionado.cantidadFinal],
      ["Folio", clienteRegistroSeleccionado.folio],
      ["Sellador", clienteRegistroSeleccionado.sellador],
      ["Observaciones", clienteRegistroSeleccionado.observaciones],
    ];

    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: insets.top + 2 }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.fixedHeader}>
          <BrandHeader subtitle="Detalle del registro · BECK" />
          <View style={styles.headerRow}>
            <View style={styles.headerTextBox}>
              <Text variant="titleLarge" style={styles.title}>
                Registro validado
              </Text>
              <Text style={styles.subtitle}>
                {clienteObraSeleccionada?.nombre || "Obra seleccionada"}
              </Text>
            </View>
            <Button
              mode="text"
              onPress={() => setClienteRegistroSeleccionado(null)}
            >
              Volver
            </Button>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.detailContent}
          refreshControl={refreshControl}
        >
          <Card style={styles.detailCard}>
            <Card.Content>
              <View style={styles.detailGrid}>
                {detalleCampos.map(([label, value]) => (
                  <View key={String(label)} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailValue}>
                      {formatValue(value as string | number | null)}
                    </Text>
                  </View>
                ))}
              </View>

              <Text style={styles.photoTitle}>Fotografías asociadas</Text>
              {fotos.length ? (
                <View style={styles.photoGrid}>
                  {fotos.map((foto, index) => (
                    <Pressable
                      key={foto.id || foto.url}
                      style={styles.photoBox}
                      onPress={() => setFotoAmpliada(foto.url)}
                    >
                      <Image
                        source={{ uri: foto.url }}
                        style={styles.photo}
                        contentFit="cover"
                        transition={150}
                      />
                      <Text style={styles.photoLabel}>Foto {index + 1}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.helper}>
                  Este registro no tiene fotografías asociadas.
                </Text>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        <Modal
          visible={Boolean(fotoAmpliada)}
          transparent
          animationType="fade"
          onRequestClose={() => setFotoAmpliada(null)}
        >
          <View style={styles.photoModalBackdrop}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Fotografía del registro</Text>
              <Button
                mode="contained-tonal"
                compact
                onPress={() => setFotoAmpliada(null)}
              >
                Cerrar
              </Button>
            </View>
            {fotoAmpliada ? (
              <Image
                source={{ uri: fotoAmpliada }}
                style={styles.photoModalImage}
                contentFit="contain"
                transition={150}
              />
            ) : null}
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  if (userRole === "cliente" && clienteObraSeleccionada) {
    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: insets.top + 2 }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.fixedHeader}>
          <BrandHeader subtitle="Registros validados · BECK" />
          <View style={styles.headerRow}>
            <View style={styles.headerTextBox}>
              <Text variant="titleLarge" style={styles.title}>
                {clienteObraSeleccionada.nombre}
              </Text>
              <Text style={styles.subtitle}>
                Código: {clienteObraSeleccionada.codigo || "Sin código"}
              </Text>
            </View>
            <Button
              mode="text"
              onPress={() => {
                setClienteObraSeleccionada(null);
                setClienteRegistros([]);
              }}
            >
              Volver
            </Button>
          </View>
        </View>

        <FlatList
          data={clienteRegistros}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={refreshControl}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              {loadingClienteRegistros ? (
                <>
                  <ActivityIndicator size="large" color="#f97316" />
                  <Text style={styles.helper}>Cargando registros...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>Sin registros validados</Text>
                  <Text style={styles.helper}>
                    Cuando la obra tenga registros validados aparecerán aquí.
                  </Text>
                </>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const fotos = getRegistroFotos(item);
            return (
              <Pressable onPress={() => setClienteRegistroSeleccionado(item)}>
                <Card style={styles.card}>
                  <Card.Content>
                    <View style={styles.topRow}>
                      <Text style={styles.cardTitle}>
                        {getRegistroKind(item)} · {formatDate(item.fecha)}
                      </Text>
                      <Chip style={styles.validChip} textStyle={styles.chipText}>
                        Validado
                      </Chip>
                    </View>

                    <Text style={styles.cardLabel}>Ubicación</Text>
                    <Text style={styles.cardValue}>
                      Piso {item.piso || "-"} · {item.modulo || "Sin módulo"} ·{" "}
                      {item.recinto || "Sin recinto"}
                    </Text>

                    <Text style={styles.cardLabel}>Registro</Text>
                    <Text style={styles.cardValue}>
                      N° sello {item.numeroSello || "-"} · Cantidad final{" "}
                      {item.cantidadFinal ?? "-"} · Fotos {fotos.length}
                    </Text>

                    <Text style={styles.openHint}>Presiona para ver detalle</Text>
                  </Card.Content>
                </Card>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
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

  if (userRole === "cliente" && !clienteObras.length) {
    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: insets.top + 2 }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.fixedHeader}>{renderHeader()}</View>
        <FlatList
          data={[] as ClienteObraResumen[]}
          keyExtractor={(item) => item.id}
          renderItem={() => null}
          contentContainerStyle={[
            styles.listContent,
            styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No hay obras asignadas</Text>
              <Text style={styles.helper}>
                Cuando tengas obras asociadas como cliente aparecerán aquí.
              </Text>
            </View>
          }
          refreshControl={refreshControl}
        />
      </SafeAreaView>
    );
  }

  if (userRole !== "cliente" && !obras.length) {
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
      {userRole === "cliente" ? (
        <FlatList
          data={filteredClienteObras}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.helper}>
                Prueba buscar por nombre, código o cambia el filtro de estado.
              </Text>
            </View>
          }
          refreshControl={refreshControl}
          renderItem={({ item }) => (
            <Pressable onPress={() => loadClienteRegistros(item)}>
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
                  <Text style={styles.cardValue}>{item.codigo || "Sin código"}</Text>

                  <Text style={styles.cardLabel}>Registros validados</Text>
                  <Text style={styles.cardValue}>
                    {item.totalRegistros} registros · Cantidad final{" "}
                    {Math.round(item.cantidadFinalTotal || 0)}
                  </Text>

                  <Text style={styles.openHint}>Presiona para ver registros</Text>
                </Card.Content>
              </Card>
            </Pressable>
          )}
        />
      ) : (
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
      )}
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
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  headerTextBox: {
    flex: 1,
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingBottom: 88,
  },
  detailCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
  },
  detailGrid: {
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
  },
  detailRow: {
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 10,
  },
  detailLabel: {
    color: "#9a3412",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  photoTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 18,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoBox: {
    width: "48%",
  },
  photo: {
    aspectRatio: 1.2,
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    width: "100%",
  },
  photoLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  photoModalBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  photoModalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  photoModalTitle: {
    color: "#ffffff",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    marginRight: 12,
  },
  photoModalImage: {
    flex: 1,
    width: "100%",
  },
  validChip: {
    backgroundColor: "#16a34a",
  },
  openHint: {
    color: "#ea580c",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 12,
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
