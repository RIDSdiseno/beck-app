import {
  getIngenieriaRegistros,
  getIngenieriaResumen,
  IngenieriaRegistroApi,
  IngenieriaResumenApi,
  iniciarRevisionIngenieria,
  rechazarRegistroIngenieria,
  updateRegistroIngenieria,
  validarRegistroIngenieria,
} from "@/services/api/ingenieriaApi";
import type { EstadoRegistroApi } from "@/services/api/registrosApi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
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
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";

type EstadoFiltro = EstadoRegistroApi | "todos";

type RegistroForm = {
  codigoBeck: string;
  itemizadoBeck: string;
  itemizadoMandante: string;
  folio: string;
  modulo: string;
  recinto: string;
  piso: string;
  ejeAlfabetico: string;
  ejeNumerico: string;
  numeroSello: string;
  cantidadSellos: string;
  nombreSellador: string;
  holgura: string;
  accesibilidad: string;
  aislacion: string;
  reparacionTabique: string;
  observaciones: string;
};

const estadoColor = {
  pendiente: "#f59e0b",
  en_revision: "#2563eb",
  validado: "#16a34a",
  rechazado: "#dc2626",
} as const;

function getEstadoLabel(estado?: string | null) {
  switch (estado) {
    case "pendiente":
      return "Pendiente";
    case "en_revision":
      return "En revisión";
    case "validado":
      return "Validado";
    case "rechazado":
      return "Rechazado";
    default:
      return "Sin estado";
  }
}

function getTipoRegistroLabel(tipo?: string | null) {
  switch (tipo) {
    case "junta_lineal_espuma":
      return "Junta Lineal Espuma";
    case "sello_cortafuego":
      return "Sello Cortafuego";
    default:
      return tipo || "Registro";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function getRegistroFotos(registro?: IngenieriaRegistroApi | null) {
  if (!registro) return [];

  const relationFotos = registro.fotos || [];
  const fallbackUrls = [
    ...(Array.isArray(registro.fotos_urls) ? registro.fotos_urls : []),
    registro.foto_url,
  ].filter((url): url is string => Boolean(url));
  const seen = new Set<string>();

  return [
    ...relationFotos,
    ...fallbackUrls.map((url, index) => ({
      id: `${registro.id}-fallback-${index}`,
      url,
      created_at: registro.created_at,
    })),
  ].filter((foto) => {
    if (!foto.url || seen.has(foto.url)) return false;
    seen.add(foto.url);
    return true;
  });
}

function buildForm(registro: IngenieriaRegistroApi): RegistroForm {
  return {
    codigoBeck: toText(registro.codigo_beck),
    itemizadoBeck: toText(registro.itemizado_beck || registro.descripcion_material),
    itemizadoMandante: toText(registro.itemizado_mandante),
    folio: toText(registro.folio),
    modulo: toText(registro.modulo),
    recinto: toText(registro.recinto),
    piso: toText(registro.piso),
    ejeAlfabetico: toText(registro.eje_alfabetico),
    ejeNumerico: toText(registro.eje_numerico),
    numeroSello: toText(registro.numero_sello),
    cantidadSellos: toText(registro.cantidad_sellos),
    nombreSellador: toText(registro.nombre_sellador),
    holgura: toText(registro.holgura),
    accesibilidad: toText(registro.accesibilidad),
    aislacion: toText(registro.aislacion),
    reparacionTabique: toText(registro.reparacion_tabique),
    observaciones: toText(registro.observaciones),
  };
}

function parseOptionalNumber(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : value;
}

export default function IngenieriaScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("todos");
  const [resumen, setResumen] = useState<IngenieriaResumenApi | null>(null);
  const [registros, setRegistros] = useState<IngenieriaRegistroApi[]>([]);
  const [selectedRegistro, setSelectedRegistro] =
    useState<IngenieriaRegistroApi | null>(null);
  const [form, setForm] = useState<RegistroForm | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [notasValidacion, setNotasValidacion] = useState("");
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      try {
        setError("");
        const [resumenData, registrosData] = await Promise.all([
          getIngenieriaResumen(forceRefresh),
          getIngenieriaRegistros(forceRefresh, {
            estado: estadoFiltro,
            search,
          }),
        ]);
        setResumen(resumenData);
        setRegistros(registrosData);
      } catch (err: any) {
        setError(err?.message || "No se pudo cargar ingeniería");
      }
    },
    [estadoFiltro, search],
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    };

    init();
  }, [loadData]);

  const filteredRegistros = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return registros;

    return registros.filter((registro) => {
      const searchable = [
        registro.obra?.nombre || registro.obras?.nombre,
        registro.obra?.codigo || registro.obras?.codigo,
        registro.usuario?.nombre || registro.usuarios?.nombre,
        registro.codigo_beck,
        registro.itemizado_beck,
        registro.descripcion_material,
        registro.folio,
        registro.numero_sello,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(q);
    });
  }, [registros, search]);

  const updateForm = (key: keyof RegistroForm, value: string) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const openRegistro = (registro: IngenieriaRegistroApi) => {
    setSelectedRegistro(registro);
    setForm(buildForm(registro));
    setEditMode(false);
    setMotivoRechazo("");
    setNotasValidacion("");
    setSuccess("");
    setError("");
  };

  const closeRegistro = () => {
    setSelectedRegistro(null);
    setForm(null);
    setEditMode(false);
    setMotivoRechazo("");
    setNotasValidacion("");
  };

  const updateSelectedFromResponse = (registro: IngenieriaRegistroApi) => {
    setSelectedRegistro(registro);
    setForm(buildForm(registro));
    setRegistros((current) =>
      current.map((item) => (item.id === registro.id ? registro : item)),
    );
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const runAction = async (
    callback: () => Promise<IngenieriaRegistroApi | { registro: IngenieriaRegistroApi }>,
    message: string,
  ) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const result = await callback();
      const registro = "registro" in result ? result.registro : result;
      updateSelectedFromResponse(registro);
      setSuccess(message);
      await loadData(true);
    } catch (err: any) {
      setError(err?.message || "No se pudo completar la acción");
    } finally {
      setSaving(false);
    }
  };

  const handleIniciarRevision = async () => {
    if (!selectedRegistro) return;
    await runAction(
      () => iniciarRevisionIngenieria(selectedRegistro.id),
      "Registro en revisión.",
    );
  };

  const handleGuardar = async () => {
    if (!selectedRegistro || !form) return;

    await runAction(
      () =>
        updateRegistroIngenieria(selectedRegistro.id, {
          codigoBeck: form.codigoBeck,
          itemizadoBeck: form.itemizadoBeck,
          itemizadoMandante: form.itemizadoMandante,
          folio: form.folio,
          modulo: form.modulo,
          recinto: form.recinto,
          piso: form.piso,
          ejeAlfabetico: form.ejeAlfabetico,
          ejeNumerico: form.ejeNumerico,
          numeroSello: form.numeroSello,
          cantidadSellos: parseOptionalNumber(form.cantidadSellos),
          nombreSellador: form.nombreSellador,
          holgura: parseOptionalNumber(form.holgura),
          accesibilidad: parseOptionalNumber(form.accesibilidad),
          aislacion: parseOptionalNumber(form.aislacion),
          reparacionTabique: parseOptionalNumber(form.reparacionTabique),
          observaciones: form.observaciones,
        }),
      "Registro actualizado.",
    );
    setEditMode(false);
  };

  const handleValidar = async () => {
    if (!selectedRegistro) return;
    await runAction(
      () => validarRegistroIngenieria(selectedRegistro.id, notasValidacion),
      "Registro validado.",
    );
  };

  const handleRechazar = async () => {
    if (!selectedRegistro) return;
    if (!motivoRechazo.trim()) {
      setError("Debes ingresar el motivo del rechazo.");
      return;
    }

    await runAction(
      () => rechazarRegistroIngenieria(selectedRegistro.id, motivoRechazo),
      "Registro rechazado y copia creada para corrección.",
    );
  };

  const renderResumen = () => (
    <View style={styles.metricsGrid}>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{resumen?.pendientes ?? 0}</Text>
        <Text style={styles.metricLabel}>Pendientes</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{resumen?.enRevision ?? 0}</Text>
        <Text style={styles.metricLabel}>En revisión</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{resumen?.validados ?? 0}</Text>
        <Text style={styles.metricLabel}>Validados</Text>
      </View>
      <View style={styles.metricCard}>
        <Text style={styles.metricValue}>{resumen?.rechazados ?? 0}</Text>
        <Text style={styles.metricLabel}>Rechazados</Text>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <BrandHeader subtitle="Procesamiento de ingeniería · BECK" />
      <Text style={styles.title}>Procesamiento Ingeniería</Text>
      <Text style={styles.subtitle}>
        Revisa registros enviados por Supervisor, valida o rechaza con motivo.
      </Text>
      {renderResumen()}
      <TextInput
        mode="outlined"
        label="Buscar registro"
        value={search}
        onChangeText={setSearch}
        left={<TextInput.Icon icon="magnify" />}
        style={styles.searchInput}
      />
      <SegmentedButtons
        value={estadoFiltro}
        onValueChange={(value) => setEstadoFiltro(value as EstadoFiltro)}
        density="small"
        style={styles.segmented}
        buttons={[
          { value: "todos", label: "Todos" },
          { value: "pendiente", label: "Pend." },
          { value: "en_revision", label: "Rev." },
          { value: "validado", label: "Val." },
          { value: "rechazado", label: "Rech." },
        ]}
      />
    </View>
  );

  const renderRegistro = ({ item }: { item: IngenieriaRegistroApi }) => {
    const obra = item.obra || item.obras;
    const usuario = item.usuario || item.usuarios;
    const color = estadoColor[item.estado] || "#64748b";

    return (
      <Card style={styles.card} onPress={() => openRegistro(item)}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleBox}>
              <Text style={styles.cardTitle}>{obra?.nombre || "Obra sin nombre"}</Text>
              <Text style={styles.cardMeta}>
                {obra?.codigo || "Sin código"} · {formatDate(item.fecha)}
              </Text>
            </View>
            <Chip compact textStyle={styles.chipText} style={{ backgroundColor: color }}>
              {getEstadoLabel(item.estado)}
            </Chip>
          </View>
          <Text style={styles.cardLine}>
            Operario: {usuario?.nombre || item.nombre_sellador || "Sin asignar"}
          </Text>
          <Text style={styles.cardLine}>
            {getTipoRegistroLabel(item.tipo_registro)} · Piso {item.piso || "N/A"} ·{" "}
            Sello {item.numero_sello || "N/A"}
          </Text>
          <Text style={styles.cardLine} numberOfLines={1}>
            Itemizado: {item.itemizado_beck || item.descripcion_material || "Sin itemizado"}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  const renderReadField = (label: string, value?: unknown) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{toText(value) || "Sin información"}</Text>
    </View>
  );

  const renderEditField = (
    label: string,
    key: keyof RegistroForm,
    options?: { keyboardType?: "default" | "numeric"; multiline?: boolean },
  ) => {
    if (!form) return null;

    return (
      <TextInput
        mode="outlined"
        label={label}
        value={form[key]}
        onChangeText={(value) => updateForm(key, value)}
        keyboardType={options?.keyboardType}
        multiline={options?.multiline}
        style={styles.formInput}
      />
    );
  };

  const renderDetalle = () => {
    if (!selectedRegistro || !form) return null;

    const fotos = getRegistroFotos(selectedRegistro);
    const obra = selectedRegistro.obra || selectedRegistro.obras;
    const usuario = selectedRegistro.usuario || selectedRegistro.usuarios;
    const canReview = selectedRegistro.estado === "pendiente";
    const canProcess = selectedRegistro.estado === "en_revision";

    return (
      <Modal visible animationType="slide" onRequestClose={closeRegistro}>
        <SafeAreaView style={styles.modalSafe} edges={["top", "left", "right"]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Detalle del registro</Text>
              <Text style={styles.modalSubtitle}>{obra?.nombre || "Obra sin nombre"}</Text>
            </View>
            <Button mode="text" onPress={closeRegistro}>
              Cerrar
            </Button>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {success ? <Text style={styles.successText}>{success}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.detailTop}>
              <Chip
                compact
                textStyle={styles.chipText}
                style={{
                  backgroundColor: estadoColor[selectedRegistro.estado] || "#64748b",
                }}
              >
                {getEstadoLabel(selectedRegistro.estado)}
              </Chip>
              <Text style={styles.detailKind}>
                {getTipoRegistroLabel(selectedRegistro.tipo_registro)}
              </Text>
            </View>

            {selectedRegistro.estado === "rechazado" &&
            selectedRegistro.motivo_rechazo ? (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionTitle}>Motivo de rechazo</Text>
                <Text style={styles.rejectionText}>
                  {selectedRegistro.motivo_rechazo}
                </Text>
              </View>
            ) : null}

            <View style={styles.detailSection}>
              {renderReadField("Obra", obra?.nombre)}
              {renderReadField("Código obra", obra?.codigo)}
              {renderReadField("Operario", usuario?.nombre)}
              {renderReadField("Fecha", formatDate(selectedRegistro.fecha))}
            </View>

            <View style={styles.actionsRow}>
              {canReview ? (
                <Button
                  mode="contained"
                  icon="clipboard-check-outline"
                  loading={saving}
                  disabled={saving}
                  onPress={handleIniciarRevision}
                  style={styles.primaryButton}
                >
                  Iniciar revisión
                </Button>
              ) : null}
              {canProcess ? (
                <Button
                  mode={editMode ? "outlined" : "contained-tonal"}
                  icon={editMode ? "close" : "pencil"}
                  onPress={() => setEditMode((value) => !value)}
                  disabled={saving}
                >
                  {editMode ? "Cancelar edición" : "Editar"}
                </Button>
              ) : null}
            </View>

            {editMode ? (
              <View style={styles.formGrid}>
                {renderEditField("Código BECK", "codigoBeck")}
                {renderEditField("Itemizado BECK", "itemizadoBeck")}
                {renderEditField("Itemizado Mandante", "itemizadoMandante")}
                {renderEditField("Folio", "folio")}
                {renderEditField("Módulo", "modulo")}
                {renderEditField("Recinto", "recinto")}
                {renderEditField("Piso", "piso", { keyboardType: "numeric" })}
                {renderEditField("Eje alfabético", "ejeAlfabetico")}
                {renderEditField("Eje numérico", "ejeNumerico")}
                {renderEditField("N° del sello", "numeroSello")}
                {renderEditField("Cantidad sellos", "cantidadSellos", {
                  keyboardType: "numeric",
                })}
                {renderEditField("Nombre sellador", "nombreSellador")}
                {renderEditField("Holgura", "holgura", { keyboardType: "numeric" })}
                {renderEditField("Accesibilidad", "accesibilidad", {
                  keyboardType: "numeric",
                })}
                {renderEditField("Aislación", "aislacion", { keyboardType: "numeric" })}
                {renderEditField("Reparación tabique", "reparacionTabique", {
                  keyboardType: "numeric",
                })}
                {renderEditField("Observaciones", "observaciones", {
                  multiline: true,
                })}
                <Button
                  mode="contained"
                  icon="content-save-outline"
                  loading={saving}
                  disabled={saving}
                  onPress={handleGuardar}
                  style={styles.primaryButton}
                >
                  Guardar cambios
                </Button>
              </View>
            ) : (
              <View style={styles.detailSection}>
                {renderReadField("Código BECK", selectedRegistro.codigo_beck)}
                {renderReadField(
                  "Itemizado BECK",
                  selectedRegistro.itemizado_beck ||
                    selectedRegistro.descripcion_material,
                )}
                {renderReadField(
                  "Itemizado Mandante",
                  selectedRegistro.itemizado_mandante,
                )}
                {renderReadField("Folio", selectedRegistro.folio)}
                {renderReadField("Módulo", selectedRegistro.modulo)}
                {renderReadField("Recinto", selectedRegistro.recinto)}
                {renderReadField("Piso", selectedRegistro.piso)}
                {renderReadField("Eje alfabético", selectedRegistro.eje_alfabetico)}
                {renderReadField("Eje numérico", selectedRegistro.eje_numerico)}
                {renderReadField("N° del sello", selectedRegistro.numero_sello)}
                {renderReadField("Cantidad sellos", selectedRegistro.cantidad_sellos)}
                {renderReadField("Nombre sellador", selectedRegistro.nombre_sellador)}
                {renderReadField("Holgura", selectedRegistro.holgura)}
                {renderReadField("Accesibilidad", selectedRegistro.accesibilidad)}
                {renderReadField("Aislación", selectedRegistro.aislacion)}
                {renderReadField(
                  "Reparación tabique",
                  selectedRegistro.reparacion_tabique,
                )}
                {renderReadField("Cantidad final", selectedRegistro.cantidad_final)}
                {renderReadField("Observaciones", selectedRegistro.observaciones)}
              </View>
            )}

            <Text style={styles.photosTitle}>Fotografías</Text>
            {fotos.length ? (
              <View style={styles.photosGrid}>
                {fotos.map((foto) => (
                  <Pressable
                    key={foto.id}
                    style={styles.photoItem}
                    onPress={() => setPreviewFoto(foto.url)}
                  >
                    <Image source={{ uri: foto.url }} style={styles.photoPreview} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Este registro no tiene fotografías.</Text>
            )}

            {canProcess ? (
              <View style={styles.processBox}>
                <TextInput
                  mode="outlined"
                  label="Notas de validación"
                  value={notasValidacion}
                  onChangeText={setNotasValidacion}
                  multiline
                  style={styles.formInput}
                />
                <Button
                  mode="contained"
                  icon="check-circle-outline"
                  loading={saving}
                  disabled={saving}
                  onPress={handleValidar}
                  style={styles.validButton}
                >
                  Validar registro
                </Button>

                <TextInput
                  mode="outlined"
                  label="Motivo de rechazo"
                  value={motivoRechazo}
                  onChangeText={setMotivoRechazo}
                  multiline
                  style={styles.formInput}
                />
                <Button
                  mode="contained"
                  icon="close-circle-outline"
                  loading={saving}
                  disabled={saving}
                  onPress={handleRechazar}
                  buttonColor="#dc2626"
                >
                  Rechazar registro
                </Button>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>

        <Modal
          visible={Boolean(previewFoto)}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewFoto(null)}
        >
          <Pressable
            style={styles.photoModalBackdrop}
            onPress={() => setPreviewFoto(null)}
          >
            {previewFoto ? (
              <Image
                source={{ uri: previewFoto }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
            ) : null}
            <Button
              mode="contained"
              onPress={() => setPreviewFoto(null)}
              style={styles.photoCloseButton}
            >
              Cerrar
            </Button>
          </Pressable>
        </Modal>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.helper}>Cargando ingeniería...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <FlatList
        data={filteredRegistros}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="clipboard-search-outline"
              size={42}
              color="#94a3b8"
            />
            <Text style={styles.emptyTitle}>Sin registros</Text>
            <Text style={styles.emptyText}>
              No hay registros para el filtro seleccionado.
            </Text>
          </View>
        }
        renderItem={renderRegistro}
      />
      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      {renderDetalle()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f7fb",
    padding: 24,
  },
  helper: {
    marginTop: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  listContent: {
    padding: 18,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 4,
    color: "#64748b",
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricLabel: {
    marginTop: 2,
    color: "#64748b",
    fontWeight: "700",
  },
  searchInput: {
    marginTop: 16,
    backgroundColor: "#ffffff",
  },
  segmented: {
    marginTop: 10,
  },
  card: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitleBox: {
    flex: 1,
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  cardMeta: {
    marginTop: 2,
    color: "#64748b",
  },
  cardLine: {
    marginTop: 8,
    color: "#334155",
  },
  chipText: {
    color: "#ffffff",
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  emptyTitle: {
    marginTop: 8,
    color: "#0f172a",
    fontWeight: "800",
    fontSize: 18,
  },
  emptyText: {
    marginTop: 4,
    color: "#64748b",
    textAlign: "center",
  },
  inlineError: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 86,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontWeight: "700",
    textAlign: "center",
  },
  modalSafe: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
  },
  modalSubtitle: {
    marginTop: 2,
    color: "#64748b",
  },
  modalContent: {
    padding: 18,
    paddingBottom: 60,
  },
  successText: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#dcfce7",
    color: "#166534",
    fontWeight: "800",
  },
  errorText: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    fontWeight: "800",
  },
  detailTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  detailKind: {
    flex: 1,
    color: "#0f172a",
    fontWeight: "800",
    textAlign: "right",
  },
  detailSection: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  detailRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailLabel: {
    color: "#64748b",
    fontWeight: "700",
  },
  detailValue: {
    marginTop: 2,
    color: "#0f172a",
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  primaryButton: {
    borderRadius: 8,
  },
  validButton: {
    borderRadius: 8,
    marginBottom: 12,
  },
  formGrid: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  formInput: {
    marginBottom: 10,
    backgroundColor: "#ffffff",
  },
  rejectionBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 12,
  },
  rejectionTitle: {
    color: "#991b1b",
    fontWeight: "800",
  },
  rejectionText: {
    marginTop: 4,
    color: "#7f1d1d",
  },
  photosTitle: {
    marginTop: 8,
    marginBottom: 8,
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  photoItem: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
  },
  processBox: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 8,
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  photoModalImage: {
    width: "100%",
    height: "82%",
  },
  photoCloseButton: {
    marginTop: 16,
    borderRadius: 8,
  },
});
