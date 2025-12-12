import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, Image, ScrollView, Pressable } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Card,
  Text,
  Button,
  TextInput,
  RadioButton,
  Portal,
  Modal,
  Chip,
  Searchbar,
  Snackbar,
} from "react-native-paper";
import { useRegistros } from "../../context/RegistrosContext";
import type { TipoRegistro, EstadoRegistro } from "../../types/beck";
import * as ImagePicker from "expo-image-picker";
import { BrandHeader } from "../../components/BrandHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const estadoChipColors: Record<EstadoRegistro, string> = {
  pendiente: "#fb923c",
  instalado: "#38bdf8",
  observado: "#fbbf24",
  aprobado: "#22c55e",
};

const STORAGE_KEY = "beckcrm_user_email";

export default function RegistrosScreen() {
  const { registros, agregarRegistro, actualizarRegistro, eliminarRegistro } = useRegistros();
  const insets = useSafeAreaInsets();

  const [usuarioActual, setUsuarioActual] = useState("Usuario");
  const [modalVisible, setModalVisible] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [tipo, setTipo] = useState<TipoRegistro>("sello");
  const [obra, setObra] = useState("");
  const [piso, setPiso] = useState("");
  const [equipo, setEquipo] = useState("");
  const [estado, setEstado] = useState<EstadoRegistro>("pendiente");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoLocalUri, setFotoLocalUri] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoRegistro | "todos">("todos");
  const [filtroEstado, setFiltroEstado] =
    useState<EstadoRegistro | "todos">("todos");
  const [registroDetalle, setRegistroDetalle] =
    useState<typeof registros[0] | null>(null);
  const [fotoFullUri, setFotoFullUri] = useState<string | null>(null);
  const [cantidadSellos, setCantidadSellos] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const isFormValid =
    obra.trim().length > 0 &&
    piso.trim().length > 0 &&
    equipo.trim().length > 0 &&
    (tipo !== "sello" ||
      cantidadSellos.trim().length === 0 ||
      (Number.isFinite(Number(cantidadSellos)) && Number(cantidadSellos) > 0));

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val) setUsuarioActual(val);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    router.replace("/login");
  };

  const abrirModal = () => setModalVisible(true);
  const cerrarModal = () => {
    setModalVisible(false);
    setEditingId(null);
  };

  const limpiarFormulario = () => {
    setTipo("sello");
    setObra("");
    setPiso("");
    setEquipo("");
    setEstado("pendiente");
    setFotoUrl("");
    setFotoLocalUri(undefined);
    setCantidadSellos("");
    setEditingId(null);
    setError("");
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Permiso de galería denegado");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.length) {
      setFotoLocalUri(result.assets[0].uri);
      setError("");
    }
  };

  const handleGuardar = () => {
    setIsSaving(true);
    if (!obra.trim() || !piso.trim() || !equipo.trim()) {
      setError("Completa obra, piso y equipo");
      setIsSaving(false);
      return;
    }
    if (
      tipo === "sello" &&
      cantidadSellos.trim().length > 0 &&
      (!Number.isFinite(Number(cantidadSellos)) || Number(cantidadSellos) <= 0)
    ) {
      setError("La cantidad de sellos debe ser un número mayor a 0");
      setIsSaving(false);
      return;
    }

    const payload = {
      tipo,
      obra: obra.trim(),
      piso: piso.trim(),
      equipo: equipo.trim(),
      estado,
      usuario: usuarioActual || "Usuario",
      fotoUrl: fotoUrl.trim() || undefined,
      fotoLocalUri,
      // cantidadSellos solo aplica a sellos; se ignora si es junta
      cantidadSellos: tipo === "sello" && cantidadSellos ? Number(cantidadSellos) : undefined,
    };

    if (editingId !== null) {
      actualizarRegistro(editingId, payload);
      setSnackbarMessage("Registro actualizado");
    } else {
      agregarRegistro(payload);
      setSnackbarMessage("Registro creado");
    }

    limpiarFormulario();
    cerrarModal();
    setIsSaving(false);
    setSnackbarVisible(true);
  };

  const registrosFiltrados = registros.filter((r) => {
    const q = search.toLowerCase();
    const okSearch =
      !q ||
      r.obra.toLowerCase().includes(q) ||
      r.piso.toLowerCase().includes(q) ||
      r.equipo.toLowerCase().includes(q) ||
      r.usuario.toLowerCase().includes(q);
    const okTipo = filtroTipo === "todos" || r.tipo === filtroTipo;
    const okEstado = filtroEstado === "todos" || r.estado === filtroEstado;
    return okSearch && okTipo && okEstado;
  });

  const abrirDetalle = (item: typeof registros[0]) => {
    setRegistroDetalle(item);
    setDetalleVisible(true);
  };

  const abrirEdicion = (item: typeof registros[0]) => {
    setTipo(item.tipo);
    setObra(item.obra);
    setPiso(item.piso);
    setEquipo(item.equipo);
    setEstado(item.estado);
    setFotoUrl(item.fotoUrl || "");
    setFotoLocalUri(item.fotoLocalUri);
    setCantidadSellos(
      item.tipo === "sello" && typeof item.cantidadSellos === "number"
        ? String(item.cantidadSellos)
        : ""
    );
    setEditingId(item.id);
    setModalVisible(true);
    setSnackbarVisible(false);
  };

  const handleEliminar = (id: number) => {
    eliminarRegistro(id);
    if (detalleVisible && registroDetalle?.id === id) {
      setDetalleVisible(false);
    }
    setSnackbarMessage("Registro eliminado");
    setSnackbarVisible(true);
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      edges={["top", "left", "right"]}
    >
      <BrandHeader subtitle="Protección pasiva · CRM BECK" onLogout={handleLogout} />
      <Text variant="titleLarge" style={styles.title}>
        Registros de sellos / juntas
      </Text>
      <Text style={styles.subtitle}>
        Captura rápida con foto local o URL de referencia.
      </Text>

      <Button
        mode="contained-tonal"
        style={styles.button}
        icon="plus"
        onPress={abrirModal}
      >
        Nuevo registro
      </Button>

      <Searchbar
        placeholder="Buscar obra, piso, equipo o usuario..."
        value={search}
        onChangeText={setSearch}
        style={styles.search}
      />

      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          style={styles.filterRow}
        >
          {(["todos", "sello", "junta"] as (TipoRegistro | "todos")[]).map((t) => {
            const selected = filtroTipo === t;
            return (
              <Chip
                key={t}
                compact
                selected={selected}
                onPress={() => setFiltroTipo(selected ? "todos" : t)}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
                textStyle={styles.filterChipText}
              >
                {t === "todos" ? "Todos" : t === "sello" ? "Sellos" : "Juntas"}
              </Chip>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
          style={styles.filterRow}
        >
          {(["todos", "pendiente", "instalado", "observado", "aprobado"] as (EstadoRegistro | "todos")[]).map(
            (est) => {
              const selected = filtroEstado === est;
              return (
                <Chip
                  key={est}
                  compact
                  selected={selected}
                  onPress={() =>
                    setFiltroEstado(selected ? "todos" : (est as EstadoRegistro | "todos"))
                  }
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                  textStyle={styles.filterChipText}
                >
                  {est === "todos" ? "Estado: Todos" : est}
                </Chip>
              );
            }
          )}
        </ScrollView>
      </View>

      <FlatList
        data={registrosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.helperTextSmall}>
              Ajusta tus filtros o crea un nuevo registro.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => abrirDetalle(item)}>
            <Card.Title
              title={`${item.tipo.toUpperCase()} - ${item.obra}`}
              subtitle={`Piso: ${item.piso} · Estado: ${item.estado}`}
              left={() => (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.tipo === "sello" ? "S" : "J"}
                  </Text>
                </View>
              )}
              right={() => (
                <Chip
                  icon="account"
                  style={[
                    styles.statusChip,
                    { backgroundColor: "#0ea5e9" },
                  ]}
                  compact
                  textStyle={styles.statusChipText}
                >
                  {item.usuario}
                </Chip>
              )}
            />
            <Card.Content>
              <Text>Equipo: {item.equipo}</Text>
              {item.tipo === "sello" && typeof item.cantidadSellos === "number" ? (
                <Text style={styles.helperTextSmall}>
                  Cantidad: {item.cantidadSellos} sellos
                </Text>
              ) : null}
              {(item.fotoLocalUri || item.fotoUrl) && (
                <View style={{ marginTop: 8 }}>
                  <Text variant="labelSmall">Foto</Text>
                  <Pressable onPress={() => setFotoFullUri(item.fotoLocalUri || item.fotoUrl)}>
                    <Image
                      source={{ uri: item.fotoLocalUri || item.fotoUrl }}
                      style={{
                        width: "100%",
                        height: 140,
                        borderRadius: 8,
                        marginTop: 4,
                      }}
                      resizeMode="cover"
                    />
                  </Pressable>
                </View>
              )}
              {!item.fotoLocalUri && !item.fotoUrl && (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.helperTextSmall}>Sin foto adjunta</Text>
                </View>
              )}
            </Card.Content>
            <Card.Actions style={styles.cardActions}>
              <Button
                icon="pencil"
                mode="text"
                compact
                onPress={() => abrirEdicion(item)}
              >
                Editar
              </Button>
              <Button
                icon="delete"
                mode="text"
                compact
                textColor="#dc2626"
                onPress={() => handleEliminar(item.id)}
              >
                Eliminar
              </Button>
            </Card.Actions>
          </Card>
        )}
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={cerrarModal}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <Text variant="titleMedium" style={styles.modalTitle}>
              {editingId !== null ? "Editar registro" : "Nuevo registro"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Completa los datos operativos y adjunta evidencia fotográfica.
            </Text>

            <Text style={styles.label}>Tipo</Text>
            <RadioButton.Group
              onValueChange={(value) => setTipo(value as TipoRegistro)}
              value={tipo}
            >
              <View style={styles.row}>
                <RadioButton value="sello" />
                <Text style={styles.radioLabel}>Sello</Text>
                <RadioButton value="junta" />
                <Text style={styles.radioLabel}>Junta</Text>
              </View>
            </RadioButton.Group>

            <TextInput
              label="Obra"
              value={obra}
              onChangeText={setObra}
              style={styles.input}
            />
            <TextInput
              label="Piso"
              value={piso}
              onChangeText={setPiso}
              style={styles.input}
            />
            <TextInput
              label="Equipo"
              value={equipo}
              onChangeText={setEquipo}
              style={styles.input}
            />
            {tipo === "sello" && (
              <TextInput
                label="Cantidad de sellos"
                value={cantidadSellos}
                onChangeText={setCantidadSellos}
                keyboardType="numeric"
                style={styles.input}
              />
            )}

            <TextInput
              label="Foto URL (opcional)"
              value={fotoUrl}
              onChangeText={setFotoUrl}
              style={styles.input}
              left={<TextInput.Icon icon="camera" />}
            />
            <Button
              mode="outlined"
              icon="image"
              style={styles.buttonSmall}
              onPress={pickImage}
            >
              Seleccionar foto local
            </Button>
            {fotoLocalUri && (
              <Image
                source={{ uri: fotoLocalUri }}
                style={{ width: "100%", height: 150, borderRadius: 8 }}
                resizeMode="cover"
              />
            )}

            <Text style={styles.label}>Estado</Text>
            <RadioButton.Group
              onValueChange={(value) => setEstado(value as EstadoRegistro)}
              value={estado}
            >
              <View style={styles.column}>
                {(["pendiente", "instalado", "observado", "aprobado"] as EstadoRegistro[]).map(
                  (est) => (
                    <View style={styles.row} key={est}>
                      <RadioButton value={est} />
                      <Text style={styles.radioLabel}>{est}</Text>
                    </View>
                  )
                )}
              </View>
            </RadioButton.Group>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.modalButtons}>
              <Button onPress={cerrarModal}>Cancelar</Button>
              <Button
                mode="contained"
                onPress={handleGuardar}
                disabled={!isFormValid || isSaving}
                loading={isSaving}
              >
                {editingId !== null ? "Actualizar" : "Guardar"}
              </Button>
            </View>
          </ScrollView>
        </Modal>

        <Modal
          visible={detalleVisible}
          onDismiss={() => setDetalleVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {registroDetalle ? (
            <ScrollView>
              <Text variant="titleMedium" style={styles.modalTitle}>
                {registroDetalle.tipo.toUpperCase()} · {registroDetalle.obra}
              </Text>
              <Text style={styles.helperTextSmall}>
                Piso: {registroDetalle.piso} · Estado: {registroDetalle.estado}
              </Text>
              <Text style={styles.helperTextSmall}>
                Usuario: {registroDetalle.usuario}
              </Text>
              <Text style={styles.helperTextSmall}>
                Equipo: {registroDetalle.equipo}
              </Text>
              {registroDetalle.tipo === "sello" &&
              typeof registroDetalle.cantidadSellos === "number" ? (
                <Text style={styles.helperTextSmall}>
                  Cantidad de sellos: {registroDetalle.cantidadSellos}
                </Text>
              ) : null}
              <Text style={[styles.label, { marginTop: 10 }]}>Foto</Text>
              {registroDetalle.fotoLocalUri || registroDetalle.fotoUrl ? (
                <Pressable
                  onPress={() =>
                    setFotoFullUri(registroDetalle.fotoLocalUri || registroDetalle.fotoUrl || null)
                  }
                >
                  <Image
                    source={{
                      uri: registroDetalle.fotoLocalUri || registroDetalle.fotoUrl,
                    }}
                    style={{ width: "100%", height: 200, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                </Pressable>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.helperTextSmall}>Sin foto adjunta.</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <Text>Sin detalle</Text>
          )}
        </Modal>

        <Modal
          visible={!!fotoFullUri}
          onDismiss={() => setFotoFullUri(null)}
          contentContainerStyle={styles.fullImageContainer}
        >
          {fotoFullUri ? (
            <Pressable onPress={() => setFotoFullUri(null)}>
              <Image
                source={{ uri: fotoFullUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </Pressable>
          ) : null}
        </Modal>
      </Portal>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
        action={{ label: "Cerrar", onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage || "Acción realizada"}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f7fb",
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 12,
  },
  filtersWrapper: {
    gap: 8,
    marginBottom: 12,
  },
  search: {
    marginBottom: 12,
  },
  helperTextSmall: {
    color: "#64748b",
    marginBottom: 6,
  },
  button: {
    marginBottom: 12,
    backgroundColor: "#f97316",
  },
  card: {
    marginBottom: 10,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    backgroundColor: "#ffffff",
  },
  cardActions: {
    justifyContent: "flex-end",
    paddingHorizontal: 8,
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: 8,
    color: "#0f172a",
  },
  modalSubtitle: {
    color: "#475569",
    marginBottom: 12,
  },
  input: {
    marginBottom: 8,
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: "500",
    color: "#0f172a",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonSmall: {
    marginBottom: 8,
    borderColor: "#f97316",
  },
  column: {
    flexDirection: "column",
  },
  radioLabel: {
    marginRight: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  error: {
    color: "#dc2626",
    marginTop: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontWeight: "700",
  },
  statusChip: {
    backgroundColor: "#38bdf8",
  },
  statusChipText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  filterChip: {
    backgroundColor: "#e2e8f0",
    height: 36,
  },
  filterChipSelected: {
    backgroundColor: "#d1fae5",
  },
  filterChipText: {
    color: "#0f172a",
    fontWeight: "600",
  },
  filterRow: {
    paddingVertical: 4,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#0f172a",
    fontWeight: "700",
    marginBottom: 4,
  },
  photoPlaceholder: {
    marginTop: 8,
    paddingVertical: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  fullImageContainer: {
    backgroundColor: "#000000cc",
    borderRadius: 16,
    padding: 8,
  },
  fullImage: {
    width: "100%",
    height: 420,
  },
});
