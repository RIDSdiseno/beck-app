import React, { useState } from "react";
import { View, FlatList, StyleSheet, Image, ScrollView } from "react-native";
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
} from "react-native-paper";
import { useRegistros } from "../../context/RegistrosContext";
import type { TipoRegistro, EstadoRegistro } from "../../types/beck";
import * as ImagePicker from "expo-image-picker";

const estadoChipColors: Record<EstadoRegistro, string> = {
  pendiente: "#fb923c",
  instalado: "#38bdf8",
  observado: "#fbbf24",
  aprobado: "#22c55e",
};

export default function RegistrosScreen() {
  const { registros, agregarRegistro, actualizarRegistro, eliminarRegistro } =
    useRegistros();
  const insets = useSafeAreaInsets();

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
  const [registroDetalle, setRegistroDetalle] = useState<
    | (ReturnType<typeof useRegistros>["registros"][number] & {
        fotoLocalUri?: string;
      })
    | null
  >(null);
  const [editando, setEditando] = useState(false);
  const [editObra, setEditObra] = useState("");
  const [editPiso, setEditPiso] = useState("");
  const [editEquipo, setEditEquipo] = useState("");
  const [editEstado, setEditEstado] = useState<EstadoRegistro>("pendiente");
  const [editFotoUrl, setEditFotoUrl] = useState("");
  const [editFotoLocalUri, setEditFotoLocalUri] = useState<string | undefined>();

  const abrirModal = () => setModalVisible(true);
  const cerrarModal = () => setModalVisible(false);

  const limpiarFormulario = () => {
    setTipo("sello");
    setObra("");
    setPiso("");
    setEquipo("");
    setEstado("pendiente");
    setFotoUrl("");
    setFotoLocalUri(undefined);
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
    if (!obra.trim() || !piso.trim() || !equipo.trim()) {
      setError("Completa obra, piso y equipo");
      return;
    }

    agregarRegistro({
      tipo,
      obra: obra.trim(),
      piso: piso.trim(),
      equipo: equipo.trim(),
      estado,
      fotoUrl: fotoUrl.trim() || undefined,
      fotoLocalUri,
    });

    limpiarFormulario();
    cerrarModal();
  };

  const registrosFiltrados = registros.filter((r) => {
    const q = search.toLowerCase();
    const okSearch =
      !q ||
      r.obra.toLowerCase().includes(q) ||
      r.piso.toLowerCase().includes(q) ||
      r.equipo.toLowerCase().includes(q);
    const okTipo = filtroTipo === "todos" || r.tipo === filtroTipo;
    const okEstado = filtroEstado === "todos" || r.estado === filtroEstado;
    return okSearch && okTipo && okEstado;
  });

  const abrirDetalle = (item: typeof registros[0]) => {
    setRegistroDetalle(item);
    setEditando(false);
    setEditObra(item.obra);
    setEditPiso(item.piso);
    setEditEquipo(item.equipo);
    setEditEstado(item.estado);
    setEditFotoUrl(item.fotoUrl || "");
    setEditFotoLocalUri(item.fotoLocalUri);
    setDetalleVisible(true);
  };

  const guardarCambiosDetalle = () => {
    if (!registroDetalle) return;
    if (!editObra.trim() || !editPiso.trim() || !editEquipo.trim()) {
      setError("Completa obra, piso y equipo");
      return;
    }
    actualizarRegistro(registroDetalle.id, {
      obra: editObra.trim(),
      piso: editPiso.trim(),
      equipo: editEquipo.trim(),
      estado: editEstado,
      fotoUrl: editFotoUrl.trim() || undefined,
      fotoLocalUri: editFotoLocalUri,
    });
    setEditando(false);
    setError("");
  };

  const borrarRegistro = () => {
    if (!registroDetalle) return;
    eliminarRegistro(registroDetalle.id);
    setDetalleVisible(false);
  };

  const pickImageDetalle = async () => {
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
      setEditFotoLocalUri(result.assets[0].uri);
      setError("");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      edges={["top", "left", "right"]}
    >
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
        placeholder="Buscar obra, piso o equipo..."
        value={search}
        onChangeText={setSearch}
        style={{ marginBottom: 10 }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
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
        contentContainerStyle={[styles.filterRow, { marginBottom: 12 }]}
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

      <FlatList
        data={registrosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={styles.helperTextSmall}>Sin resultados con estos filtros.</Text>
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
                  icon="alert-circle-check"
                  style={[
                    styles.statusChip,
                    { backgroundColor: estadoChipColors[item.estado] },
                  ]}
                  compact
                  textStyle={styles.statusChipText}
                >
                  {item.estado}
                </Chip>
              )}
            />
            <Card.Content>
              <Text>Equipo: {item.equipo}</Text>
              {(item.fotoLocalUri || item.fotoUrl) && (
                <View style={{ marginTop: 8 }}>
                  <Text variant="labelSmall">Foto</Text>
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
                </View>
              )}
            </Card.Content>
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
              Nuevo registro
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
                <View style={styles.row}>
                  <RadioButton value="pendiente" />
                  <Text style={styles.radioLabel}>Pendiente</Text>
                </View>
                <View style={styles.row}>
                  <RadioButton value="instalado" />
                  <Text style={styles.radioLabel}>Instalado</Text>
                </View>
                <View style={styles.row}>
                  <RadioButton value="observado" />
                  <Text style={styles.radioLabel}>Observado</Text>
                </View>
                <View style={styles.row}>
                  <RadioButton value="aprobado" />
                  <Text style={styles.radioLabel}>Aprobado</Text>
                </View>
              </View>
            </RadioButton.Group>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.modalButtons}>
              <Button onPress={cerrarModal}>Cancelar</Button>
              <Button mode="contained" onPress={handleGuardar}>
                Guardar
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
              {!editando ? (
                <>
                  <Text style={styles.helperTextSmall}>
                    Piso: {registroDetalle.piso} · Estado: {registroDetalle.estado}
                  </Text>
                  <Text style={styles.helperTextSmall}>
                    Equipo: {registroDetalle.equipo}
                  </Text>
                  <Text style={[styles.label, { marginTop: 10 }]}>Foto</Text>
                  {registroDetalle.fotoLocalUri || registroDetalle.fotoUrl ? (
                    <Image
                      source={{
                        uri: registroDetalle.fotoLocalUri || registroDetalle.fotoUrl,
                      }}
                      style={{ width: "100%", height: 200, borderRadius: 10 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.helperTextSmall}>Sin foto adjunta.</Text>
                  )}
                  <View style={styles.modalButtons}>
                    <Button
                      mode="outlined"
                      textColor="#dc2626"
                      onPress={borrarRegistro}
                    >
                      Eliminar
                    </Button>
                    <Button mode="contained" onPress={() => setEditando(true)}>
                      Editar
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  <TextInput
                    label="Obra"
                    value={editObra}
                    onChangeText={setEditObra}
                    style={styles.input}
                  />
                  <TextInput
                    label="Piso"
                    value={editPiso}
                    onChangeText={setEditPiso}
                    style={styles.input}
                  />
                  <TextInput
                    label="Equipo"
                    value={editEquipo}
                    onChangeText={setEditEquipo}
                    style={styles.input}
                  />
                  <Text style={styles.label}>Estado</Text>
                  <RadioButton.Group
                    onValueChange={(value) =>
                      setEditEstado(value as EstadoRegistro)
                    }
                    value={editEstado}
                  >
                    <View style={styles.column}>
                      {(["pendiente", "instalado", "observado", "aprobado"] as EstadoRegistro[]).map((est) => (
                        <View style={styles.row} key={est}>
                          <RadioButton value={est} />
                          <Text style={styles.radioLabel}>{est}</Text>
                        </View>
                      ))}
                    </View>
                  </RadioButton.Group>

                  <TextInput
                    label="Foto URL (opcional)"
                    value={editFotoUrl}
                    onChangeText={setEditFotoUrl}
                    style={styles.input}
                    left={<TextInput.Icon icon="camera" />}
                  />
                  <Button
                    mode="outlined"
                    icon="image"
                    style={styles.buttonSmall}
                    onPress={pickImageDetalle}
                  >
                    Cambiar foto local
                  </Button>
                  {editFotoLocalUri && (
                    <Image
                      source={{ uri: editFotoLocalUri }}
                      style={{ width: "100%", height: 150, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  )}

                  {error ? <Text style={styles.error}>{error}</Text> : null}
                  <View style={styles.modalButtons}>
                    <Button onPress={() => setEditando(false)}>Cancelar</Button>
                    <Button mode="contained" onPress={guardarCambiosDetalle}>
                      Guardar cambios
                    </Button>
                  </View>
                </>
              )}
            </ScrollView>
          ) : (
            <Text>Sin detalle</Text>
          )}
        </Modal>
      </Portal>
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
    gap: 8,
    paddingVertical: 4,
  },
});
