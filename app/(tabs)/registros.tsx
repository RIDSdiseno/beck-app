import {
  createRegistro,
  uploadRegistroFotos,
} from "@/services/api/registrosApi";
import {
  clearSession,
  getSelectedObra,
  getSession,
} from "@/services/auth/session";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Card, Checkbox, Text, TextInput } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";

type ObraSeleccionada = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  estado?: string | null;
};

type FotoLocal = {
  uri: string;
  name: string;
  type: string;
};

const MATERIAL_OPTIONS = [
  "Tubería metálica",
  "Tubería no metálica",
  "Ducto clima circular",
  "Ducto clima rectangular",
  "Bandejas y escalerillas",
];

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toApiNumber(value: string) {
  return Number(value.replace(",", "."));
}

function buildCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;

  return [
    ...Array.from({ length: mondayFirstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

export default function RegistrosScreen() {
  const insets = useSafeAreaInsets();
  const [obra, setObra] = useState<ObraSeleccionada | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fecha, setFecha] = useState(formatDate(new Date()));
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [descripcionMaterial, setDescripcionMaterial] = useState("");
  const [otroMaterial, setOtroMaterial] = useState(false);
  const [modulo, setModulo] = useState("");
  const [piso, setPiso] = useState("");
  const [ejeNumerico, setEjeNumerico] = useState("");
  const [ejeAlfabetico, setEjeAlfabetico] = useState("");
  const [numeroSello, setNumeroSello] = useState("");
  const [cantidadSellos, setCantidadSellos] = useState("");
  const [nombreSellador, setNombreSellador] = useState("");
  const [holgura, setHolgura] = useState("");
  const [accesibilidad, setAccesibilidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fotos, setFotos] = useState<FotoLocal[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadInitialData = async () => {
        const currentObra = await getSelectedObra();
        const session = await getSession();
        const userName = session.user?.nombre || "";

        setObra(currentObra);
        setCurrentUserName(userName);
        setNombreSellador(userName);
      };

      loadInitialData();
    }, []),
  );

  const resetForm = () => {
    setFecha(formatDate(new Date()));
    setCalendarMonth(new Date());
    setDescripcionMaterial("");
    setOtroMaterial(false);
    setModulo("");
    setPiso("");
    setEjeNumerico("");
    setEjeAlfabetico("");
    setNumeroSello("");
    setCantidadSellos("");
    setNombreSellador(currentUserName);
    setHolgura("");
    setAccesibilidad("");
    setObservaciones("");
    setFotos([]);
  };

  const changeCalendarMonth = (offset: number) => {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const selectCalendarDay = (day: number) => {
    const selectedDate = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );

    setFecha(formatDate(selectedDate));
    setCalendarVisible(false);
  };

  const selectMaterial = (material: string) => {
    setDescripcionMaterial(material);
    setOtroMaterial(false);
  };

  const toggleOtroMaterial = () => {
    setOtroMaterial((current) => {
      const next = !current;
      setDescripcionMaterial(next ? "" : descripcionMaterial);
      return next;
    });
  };

  const pickFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError("Debes otorgar permiso para acceder a tus fotos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      const nuevasFotos: FotoLocal[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name:
          asset.fileName ||
          `foto-${Date.now()}-${index}.${asset.mimeType?.split("/")[1] || "jpg"}`,
        type: asset.mimeType || "image/jpeg",
      }));

      setFotos((prev) => [...prev, ...nuevasFotos]);
      setError("");
    } catch (err) {
      console.log("PICK IMAGE ERROR =>", err);
      setError("No se pudo seleccionar la imagen.");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        setError("Debes otorgar permiso para usar la cámara.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      const nuevaFoto: FotoLocal = {
        uri: asset.uri,
        name:
          asset.fileName ||
          `camara-${Date.now()}.${asset.mimeType?.split("/")[1] || "jpg"}`,
        type: asset.mimeType || "image/jpeg",
      };

      setFotos((prev) => [...prev, nuevaFoto]);
      setError("");
    } catch (err) {
      console.log("TAKE PHOTO ERROR =>", err);
      setError("No se pudo tomar la foto.");
    }
  };

  const removeFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async () => {
    try {
      if (!obra) {
        setError("Debes seleccionar una obra antes de guardar.");
        return;
      }

      if (
        !fecha.trim() ||
        !descripcionMaterial.trim() ||
        !modulo.trim() ||
        !piso.trim() ||
        !ejeNumerico.trim() ||
        !ejeAlfabetico.trim() ||
        !numeroSello.trim() ||
        !cantidadSellos.trim() ||
        !nombreSellador.trim() ||
        !holgura.trim() ||
        !accesibilidad.trim()
      ) {
        setError("Debes completar todos los campos obligatorios.");
        return;
      }

      if (!fotos.length) {
        setError("Debes agregar al menos una foto.");
        return;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      const registro = await createRegistro({
        obraId: obra.id,
        fecha,
        descripcionMaterial,
        modulo,
        piso,
        ejeNumerico: toApiNumber(ejeNumerico),
        ejeAlfabetico,
        numeroSello,
        cantidadSellos: toApiNumber(cantidadSellos),
        nombreSellador,
        holgura: toApiNumber(holgura),
        accesibilidad: toApiNumber(accesibilidad),
        observaciones,
      });

      await uploadRegistroFotos(registro.id, fotos);

      setSuccess("Registro y fotos enviados correctamente.");
      resetForm();
    } catch (err: any) {
      console.log("CREATE/UPLOAD REGISTRO ERROR =>", err);
      setError(err?.message || "No se pudo completar el envío.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearSession();
      router.replace("/login");
    } catch (error) {
      console.log("LOGOUT ERROR", error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <BrandHeader
          subtitle="Registro de terreno · BECK"
          onLogout={handleLogout}
        />
        <Text variant="titleLarge" style={styles.title}>
          Registros
        </Text>
        <Text style={styles.subtitle}>
          Carga avances, fotos y datos de instalación por obra seleccionada.
        </Text>

        {!obra ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyTitle}>No hay obra seleccionada</Text>
              <Text style={styles.emptyText}>
                Primero debes seleccionar una obra antes de registrar
                información.
              </Text>

              <Button
                mode="contained"
                onPress={() => router.replace("/mis-obras")}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Ir a Mis Obras
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.label}>Obra seleccionada</Text>
                    <Text style={styles.value}>{obra.nombre}</Text>

                    <Text style={styles.label}>Código</Text>
                    <Text style={styles.value}>{obra.codigo}</Text>

                    <Text style={styles.label}>Estado</Text>
                    <Text style={styles.value}>
                      {obra.estado || "Sin estado"}
                    </Text>
                  </View>

                  <Button
                    mode="outlined"
                    onPress={() => router.replace("/mis-obras")}
                    style={styles.changeButton}
                  >
                    Cambiar obra
                  </Button>
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.formTitle}>Nuevo registro de terreno</Text>

                <Pressable onPress={() => setCalendarVisible(true)}>
                  <TextInput
                    label="Fecha"
                    value={fecha}
                    mode="outlined"
                    editable={false}
                    pointerEvents="none"
                    right={<TextInput.Icon icon="calendar" />}
                    style={styles.input}
                  />
                </Pressable>

                <TextInput
                  label="Módulo"
                  value={modulo}
                  onChangeText={setModulo}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Piso"
                  value={piso}
                  onChangeText={(value) => setPiso(onlyDigits(value))}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />

                <TextInput
                  label="Nombre del sellador"
                  value={nombreSellador}
                  mode="outlined"
                  editable={false}
                  style={styles.input}
                />

                <TextInput
                  label="Cantidad"
                  value={cantidadSellos}
                  onChangeText={(value) => setCantidadSellos(onlyDigits(value))}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>Descripción de material</Text>
                <View style={styles.materialOptions}>
                  {MATERIAL_OPTIONS.map((material) => (
                    <Button
                      key={material}
                      mode={
                        descripcionMaterial === material && !otroMaterial
                          ? "contained"
                          : "outlined"
                      }
                      onPress={() => selectMaterial(material)}
                      style={styles.materialButton}
                    >
                      {material}
                    </Button>
                  ))}
                </View>

                <Checkbox.Item
                  label="Otro"
                  status={otroMaterial ? "checked" : "unchecked"}
                  onPress={toggleOtroMaterial}
                  style={styles.checkboxItem}
                />

                {otroMaterial ? (
                  <TextInput
                    label="Ingresar descripción de material"
                    value={descripcionMaterial}
                    onChangeText={setDescripcionMaterial}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                <TextInput
                  label="Eje numérico"
                  value={ejeNumerico}
                  onChangeText={setEjeNumerico}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Eje alfabético"
                  value={ejeAlfabetico}
                  onChangeText={setEjeAlfabetico}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Número de sello"
                  value={numeroSello}
                  onChangeText={setNumeroSello}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Holgura"
                  value={holgura}
                  onChangeText={setHolgura}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Accesibilidad"
                  value={accesibilidad}
                  onChangeText={setAccesibilidad}
                  mode="outlined"
                  style={styles.input}
                />

                <TextInput
                  label="Observaciones"
                  value={observaciones}
                  onChangeText={setObservaciones}
                  mode="outlined"
                  multiline
                  numberOfLines={6}
                  style={[styles.input, styles.observacionesInput]}
                />

                <Text style={styles.photosTitle}>Fotografías</Text>

                <View style={styles.photoActions}>
                  <Button mode="outlined" onPress={pickFromLibrary}>
                    Elegir de galería
                  </Button>
                  <Button mode="outlined" onPress={takePhoto}>
                    Tomar foto
                  </Button>
                </View>

                <View style={styles.photosGrid}>
                  {fotos.map((foto, index) => (
                    <View key={`${foto.uri}-${index}`} style={styles.photoItem}>
                      <Image
                        source={{ uri: foto.uri }}
                        style={styles.photoPreview}
                      />
                      <Button
                        mode="text"
                        onPress={() => removeFoto(index)}
                        compact
                        textColor="#dc2626"
                      >
                        Quitar
                      </Button>
                    </View>
                  ))}
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {success ? (
                  <Text style={styles.successText}>{success}</Text>
                ) : null}

                <Button
                  mode="contained"
                  onPress={onSubmit}
                  loading={saving}
                  disabled={saving}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {saving ? "Enviando..." : "Guardar registro y fotos"}
                </Button>
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCalendarVisible(false)}
        >
          <Pressable style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Button mode="text" onPress={() => changeCalendarMonth(-1)}>
                Anterior
              </Button>
              <Text style={styles.calendarTitle}>
                {MONTH_NAMES[calendarMonth.getMonth()]}{" "}
                {calendarMonth.getFullYear()}
              </Text>
              <Button mode="text" onPress={() => changeCalendarMonth(1)}>
                Siguiente
              </Button>
            </View>

            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {buildCalendarDays(calendarMonth).map((day, index) => {
                const dayDate = day
                  ? formatDate(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        day,
                      ),
                    )
                  : "";
                const isSelected = dayDate === fecha;

                return (
                  <Pressable
                    key={`${day || "empty"}-${index}`}
                    disabled={!day}
                    onPress={() => day && selectCalendarDay(day)}
                    style={[
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {day || ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 80,
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
  card: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  cardHeaderRow: {
    gap: 16,
  },
  cardHeaderInfo: {
    gap: 2,
  },
  changeButton: {
    alignSelf: "flex-start",
    borderRadius: 12,
  },
  formTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  label: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  value: {
    marginTop: 4,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  observacionesInput: {
    minHeight: 132,
    textAlignVertical: "top",
  },
  fieldLabel: {
    marginTop: 4,
    marginBottom: 10,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  materialOptions: {
    gap: 8,
    marginBottom: 6,
  },
  materialButton: {
    alignSelf: "stretch",
    borderRadius: 12,
  },
  checkboxItem: {
    paddingHorizontal: 0,
    marginBottom: 6,
  },
  photosTitle: {
    marginTop: 8,
    marginBottom: 10,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  photoActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  photosGrid: {
    gap: 12,
  },
  photoItem: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 8,
    backgroundColor: "#fff",
  },
  photoPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
  buttonContent: {
    minHeight: 48,
  },
  buttonLabel: {
    fontWeight: "700",
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    marginTop: 4,
    color: "#dc2626",
    fontWeight: "600",
  },
  successText: {
    marginTop: 4,
    color: "#16a34a",
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "center",
    padding: 18,
  },
  calendarModal: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarTitle: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "capitalize",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekDay: {
    color: "#64748b",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    width: `${100 / 7}%`,
  },
  calendarDaySelected: {
    backgroundColor: "#f97316",
    borderRadius: 999,
  },
  calendarDayText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  calendarDayTextSelected: {
    color: "#ffffff",
  },
});
