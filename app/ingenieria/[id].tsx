import {
  Conformidad,
  ControlInspeccion,
  createControlInspeccion,
  getControlInspeccion,
  getIngenieriaRegistroById,
  marcarInspeccion,
  ParametroInspeccion,
  rechazarRegistroIngenieria,
  RegistroIngenieriaApi,
  ResultadoParametro,
  updateRegistroIngenieria,
  validarRegistroIngenieria,
} from "@/services/api/ingenieriaApi";
import { estadoColor, getEstadoLabel, formatShortDate } from "@/utils/registroEstado";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const PARAMETROS_FIJOS = [
  "Continuidad del sello cortafuego en toda la longitud de la junta",
  "Espesor adecuado del material sellador",
  "Ausencia de huecos o vacíos en el sello",
  "Material sellador compatible con los sustratos presentes",
  "Superficie limpia y seca antes de la aplicación",
  "Preparación superficial adecuada",
  "Rango de temperatura durante la aplicación dentro de especificación",
  "Ancho de junta dentro de tolerancia",
  "Aplicación uniforme sin irregularidades",
  "Curado completo del material",
  "Sin signos de contaminación post-aplicación",
  "Marcación e identificación del sello correcta",
  "Documentación fotográfica tomada correctamente",
  "Código BECK asignado",
  "Folio registrado",
  "Aislación correctamente aplicada si aplica",
  "Reparación de tabique realizada si aplica",
  "Sellador certificado para el tipo de junta",
  "Registro firmado por el ejecutor",
];

function formatDecimal(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : String(value);
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? "—"}</Text>
    </View>
  );
}

export default function IngenieriaDetalleScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registro, setRegistro] = useState<RegistroIngenieriaApi | null>(null);
  const [error, setError] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [showRechazo, setShowRechazo] = useState(false);
  const [showInspeccion, setShowInspeccion] = useState(false);
  const [showControlForm, setShowControlForm] = useState(false);
  const [control, setControl] = useState<ControlInspeccion | null>(null);
  const [controlLoading, setControlLoading] = useState(false);

  const [motivoRechazo, setMotivoRechazo] = useState("");

  const [editFields, setEditFields] = useState({
    codigoBeck: "",
    itemizadoBeck: "",
    recinto: "",
    modulo: "",
    piso: "",
    ejeNumerico: "",
    ejeAlfabetico: "",
    numeroSello: "",
    cantidadSellos: "",
    nombreSellador: "",
    holgura: "",
    accesibilidad: "",
    folio: "",
    observaciones: "",
  });

  const [inspeccionFields, setInspeccionFields] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    ensayo: "",
    observacion: "",
    conformidad: "" as Conformidad | "",
  });
  const [parametros, setParametros] = useState<ParametroInspeccion[]>(
    PARAMETROS_FIJOS.map((p, i) => ({ orden: i + 1, parametro: p, resultado: "cumple" as ResultadoParametro })),
  );

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getIngenieriaRegistroById(id);
        setRegistro(data);
        setEditFields({
          codigoBeck: data.codigo_beck || "",
          itemizadoBeck: data.itemizado_beck || "",
          recinto: data.recinto || "",
          modulo: data.modulo || "",
          piso: data.piso || "",
          ejeNumerico: data.eje_numerico || "",
          ejeAlfabetico: data.eje_alfabetico || "",
          numeroSello: data.numero_sello || "",
          cantidadSellos: String(data.cantidad_sellos ?? ""),
          nombreSellador: data.nombre_sellador || "",
          holgura: String(data.holgura ?? ""),
          accesibilidad: String(data.accesibilidad ?? ""),
          folio: data.folio || "",
          observaciones: data.observaciones || "",
        });
      } catch (err: any) {
        setError(err?.message || "No se pudo cargar el registro");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const loadControl = async () => {
    if (!id) return;
    setControlLoading(true);
    try {
      const data = await getControlInspeccion(id);
      setControl(data);
    } catch {
      setControl(null);
    } finally {
      setControlLoading(false);
    }
  };

  const handleValidar = () => {
    Alert.alert(
      "Validar registro",
      "¿Confirmas que este registro cumple con todos los requisitos?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Validar",
          style: "default",
          onPress: async () => {
            try {
              setSaving(true);
              const updated = await validarRegistroIngenieria(id!);
              setRegistro(updated);
              Alert.alert("Listo", "El registro fue validado correctamente.");
            } catch (err: any) {
              Alert.alert("Error", err?.message || "No se pudo validar el registro");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const handleConfirmarRechazo = async () => {
    if (!motivoRechazo.trim()) {
      Alert.alert("Requerido", "Ingresa el motivo del rechazo");
      return;
    }
    try {
      setSaving(true);
      const result = await rechazarRegistroIngenieria(id!, motivoRechazo.trim());
      setRegistro(result.registro);
      setShowRechazo(false);
      setMotivoRechazo("");
      Alert.alert(
        "Registro rechazado",
        "Se creó una copia para corrección por el técnico.",
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo rechazar el registro");
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarEdicion = async () => {
    if (!id) return;
    try {
      setSaving(true);
      const updated = await updateRegistroIngenieria(id, {
        codigoBeck: editFields.codigoBeck || undefined,
        itemizadoBeck: editFields.itemizadoBeck || undefined,
        recinto: editFields.recinto || undefined,
        modulo: editFields.modulo || undefined,
        piso: editFields.piso || undefined,
        ejeNumerico: editFields.ejeNumerico || undefined,
        ejeAlfabetico: editFields.ejeAlfabetico || undefined,
        numeroSello: editFields.numeroSello || undefined,
        cantidadSellos: editFields.cantidadSellos ? Number(editFields.cantidadSellos) : undefined,
        nombreSellador: editFields.nombreSellador || undefined,
        holgura: editFields.holgura ? Number(editFields.holgura.replace(",", ".")) : undefined,
        accesibilidad: editFields.accesibilidad ? Number(editFields.accesibilidad) : undefined,
        folio: editFields.folio || undefined,
        observaciones: editFields.observaciones || undefined,
      });
      setRegistro(updated);
      setShowEdit(false);
      Alert.alert("Guardado", "Los cambios fueron guardados correctamente.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo guardar el registro");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleInspeccion = async () => {
    if (!registro || !id) return;
    try {
      setSaving(true);
      const updated = await marcarInspeccion(id, !registro.seleccionado_para_inspeccion);
      setRegistro(updated);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo actualizar la inspección");
    } finally {
      setSaving(false);
    }
  };

  const handleCrearControl = async () => {
    if (!id) return;
    if (!inspeccionFields.ensayo.trim()) {
      Alert.alert("Requerido", "El campo ensayo es obligatorio");
      return;
    }
    try {
      setSaving(true);
      const created = await createControlInspeccion(id, {
        fecha: inspeccionFields.fecha,
        ensayo: inspeccionFields.ensayo.trim(),
        observacion: inspeccionFields.observacion || undefined,
        conformidad: inspeccionFields.conformidad || undefined,
        parametros,
      });
      setControl(created);
      setShowControlForm(false);
      Alert.alert("Control creado", "El control de inspección fue registrado.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo crear el control de inspección");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !registro) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTxt}>{error || "Registro no encontrado"}</Text>
        <Button onPress={() => router.back()}>Volver</Button>
      </View>
    );
  }

  const estadoBg = estadoColor[registro.estado as keyof typeof estadoColor] || "#64748b";
  const esEnRevision = registro.estado === "en_revision";

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {registro.obra?.nombre || "Registro"}
        </Text>
        <View style={[styles.estadoBadge, { backgroundColor: estadoBg }]}>
          <Text style={styles.estadoBadgeText}>{getEstadoLabel(registro.estado)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <SectionTitle title="OBRA" />
        <InfoRow label="Nombre" value={registro.obra?.nombre} />
        <InfoRow label="Código" value={registro.obra?.codigo} />
        <InfoRow label="Cliente" value={registro.obra?.cliente} />

        <SectionTitle title="UBICACIÓN" />
        <InfoRow label="Piso" value={registro.piso} />
        <InfoRow label="Módulo / Edificio" value={registro.modulo} />
        <InfoRow label="Recinto" value={registro.recinto} />
        <InfoRow label="Eje numérico" value={registro.eje_numerico} />
        <InfoRow label="Eje alfabético" value={registro.eje_alfabetico} />

        <SectionTitle title="TÉCNICO" />
        <InfoRow label="Tipo" value={registro.tipo_registro === "junta_lineal_espuma" ? "Junta Lineal Espuma" : "Sello Cortafuego"} />
        <InfoRow label="Nº Sello" value={registro.numero_sello} />
        <InfoRow label="Folio" value={registro.folio} />
        <InfoRow label="Código BECK" value={registro.codigo_beck} />
        <InfoRow label="Itemizado BECK" value={registro.itemizado_beck} />
        <InfoRow label="Material" value={registro.descripcion_material} />
        <InfoRow label="Fecha ejecución" value={formatShortDate(registro.fecha)} />
        <InfoRow label="Sellador" value={registro.nombre_sellador} />
        <InfoRow label="Técnico creador" value={registro.usuario?.nombre} />

        <SectionTitle title="CANTIDADES" />
        <InfoRow label="Cantidad sellos" value={registro.cantidad_sellos} />
        <InfoRow label="Holgura (cm)" value={formatDecimal(registro.holgura)} />
        <InfoRow label="Factor por holguras" value={formatDecimal(registro.factor_por_holguras)} />
        <InfoRow label="Sellos con factor" value={formatDecimal(registro.cantidad_sellos_con_factores)} />
        <InfoRow label="Accesibilidad" value={registro.accesibilidad} />
        <InfoRow label="Aislación" value={formatDecimal(registro.aislacion)} />
        <InfoRow label="Sellos aislación" value={formatDecimal(registro.cantidad_sellos_aislacion)} />
        <InfoRow label="Reparación tabique" value={formatDecimal(registro.reparacion_tabique)} />
        <InfoRow label="Cantidad final" value={formatDecimal(registro.cantidad_final)} />
        {registro.metros_lineales ? (
          <InfoRow label="Metros lineales" value={`${registro.metros_lineales} m`} />
        ) : null}

        {registro.observaciones ? (
          <>
            <SectionTitle title="OBSERVACIONES" />
            <Text style={styles.observacionesText}>{registro.observaciones}</Text>
          </>
        ) : null}

        {registro.motivo_rechazo ? (
          <>
            <SectionTitle title="MOTIVO DE RECHAZO" />
            <View style={styles.rechazoBadge}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.rechazoText}>{registro.motivo_rechazo}</Text>
            </View>
          </>
        ) : null}

        {(registro.fotos?.length ?? 0) > 0 ? (
          <>
            <SectionTitle title="FOTOGRAFÍAS" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosRow}>
              {registro.fotos!.map((foto) => (
                <Image key={foto.id} source={{ uri: foto.url }} style={styles.foto} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <SectionTitle title="INSPECCIÓN" />
        <View style={styles.inspeccionRow}>
          <View>
            <Text style={styles.infoLabel}>Seleccionado para inspección</Text>
            <Text style={[styles.infoValue, { color: registro.seleccionado_para_inspeccion ? "#7c3aed" : "#64748b" }]}>
              {registro.seleccionado_para_inspeccion ? "Sí" : "No"}
            </Text>
          </View>
          <Button
            mode="outlined"
            compact
            onPress={handleToggleInspeccion}
            loading={saving}
            style={styles.inspeccionToggleBtn}
            labelStyle={{ fontSize: 12 }}
          >
            {registro.seleccionado_para_inspeccion ? "Quitar inspección" : "Marcar inspección"}
          </Button>
        </View>

        {registro.seleccionado_para_inspeccion ? (
          <View style={styles.controlRow}>
            {controlLoading ? (
              <ActivityIndicator size="small" color="#7c3aed" />
            ) : control ? (
              <View style={styles.controlCard}>
                <Text style={styles.controlTitle}>Control de inspección registrado</Text>
                <InfoRow label="Ensayo" value={control.ensayo} />
                <InfoRow label="Fecha" value={control.fecha?.slice(0, 10)} />
                <InfoRow label="Conformidad" value={control.conformidad === "conforme" ? "Conforme" : control.conformidad === "no_conforme" ? "No conforme" : "Sin definir"} />
                {control.observacion ? <InfoRow label="Observación" value={control.observacion} /> : null}
                <Text style={styles.paramsTitle}>
                  {control.controles_inspeccion_parametros?.length ?? 0} parámetros evaluados
                </Text>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={() => {
                  setShowControlForm(true);
                }}
                style={styles.controlBtn}
                icon="clipboard-check-outline"
                labelStyle={{ fontSize: 13 }}
              >
                Crear control de inspección
              </Button>
            )}
            {!controlLoading && !control ? null : (
              <Button
                mode="text"
                compact
                onPress={loadControl}
                style={{ marginTop: 6 }}
                labelStyle={{ fontSize: 12 }}
              >
                {control ? "Recargar control" : "Verificar si existe un control"}
              </Button>
            )}
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {esEnRevision ? (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 12 }]}>
          <Button
            mode="outlined"
            onPress={() => setShowEdit(true)}
            style={styles.actionBtnOutline}
            icon="pencil-outline"
            labelStyle={styles.actionBtnLabel}
          >
            Editar
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowRechazo(true)}
            style={[styles.actionBtnOutline, styles.actionBtnRed]}
            icon="close-circle-outline"
            labelStyle={[styles.actionBtnLabel, { color: "#dc2626" }]}
          >
            Rechazar
          </Button>
          <Button
            mode="contained"
            onPress={handleValidar}
            loading={saving}
            style={styles.actionBtnGreen}
            icon="check-circle-outline"
            labelStyle={styles.actionBtnLabel}
          >
            Validar
          </Button>
        </View>
      ) : null}

      <Modal visible={showRechazo} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Motivo del rechazo</Text>
            <Text style={styles.modalSubtitle}>
              Describe por qué se rechaza este registro. El técnico recibirá esta información para corregirlo.
            </Text>
            <TextInput
              label="Motivo"
              value={motivoRechazo}
              onChangeText={setMotivoRechazo}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.modalInput}
            />
            <View style={styles.modalBtns}>
              <Button
                mode="outlined"
                onPress={() => { setShowRechazo(false); setMotivoRechazo(""); }}
                style={styles.modalBtnCancel}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirmarRechazo}
                loading={saving}
                style={styles.modalBtnConfirm}
                buttonColor="#dc2626"
              >
                Rechazar
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showEdit} animationType="slide">
        <SafeAreaView style={styles.editModal}>
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>Editar campos</Text>
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.editScroll} keyboardShouldPersistTaps="handled">
            {(
              [
                ["codigoBeck", "Código BECK"],
                ["itemizadoBeck", "Itemizado BECK"],
                ["recinto", "Recinto"],
                ["modulo", "Módulo / Edificio"],
                ["piso", "Piso"],
                ["ejeNumerico", "Eje numérico"],
                ["ejeAlfabetico", "Eje alfabético"],
                ["numeroSello", "Nº Sello"],
                ["cantidadSellos", "Cantidad de sellos"],
                ["nombreSellador", "Nombre sellador"],
                ["holgura", "Holgura (cm)"],
                ["accesibilidad", "Accesibilidad"],
                ["folio", "Folio"],
                ["observaciones", "Observaciones"],
              ] as [keyof typeof editFields, string][]
            ).map(([key, label]) => (
              <TextInput
                key={key}
                label={label}
                value={editFields[key]}
                onChangeText={(v) => setEditFields((prev) => ({ ...prev, [key]: v }))}
                mode="outlined"
                style={styles.editInput}
                multiline={key === "observaciones"}
                numberOfLines={key === "observaciones" ? 3 : 1}
                keyboardType={
                  ["cantidadSellos", "holgura", "accesibilidad"].includes(key)
                    ? "decimal-pad"
                    : "default"
                }
              />
            ))}
            <Button
              mode="contained"
              onPress={handleGuardarEdicion}
              loading={saving}
              style={styles.editSaveBtn}
            >
              Guardar cambios
            </Button>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={showControlForm} animationType="slide">
        <SafeAreaView style={styles.editModal}>
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>Control de inspección</Text>
            <TouchableOpacity onPress={() => setShowControlForm(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.editScroll} keyboardShouldPersistTaps="handled">
            <TextInput
              label="Fecha (YYYY-MM-DD)"
              value={inspeccionFields.fecha}
              onChangeText={(v) => setInspeccionFields((prev) => ({ ...prev, fecha: v }))}
              mode="outlined"
              style={styles.editInput}
            />
            <TextInput
              label="Ensayo *"
              value={inspeccionFields.ensayo}
              onChangeText={(v) => setInspeccionFields((prev) => ({ ...prev, ensayo: v }))}
              mode="outlined"
              style={styles.editInput}
            />
            <TextInput
              label="Observación general"
              value={inspeccionFields.observacion}
              onChangeText={(v) => setInspeccionFields((prev) => ({ ...prev, observacion: v }))}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.editInput}
            />

            <Text style={styles.paramsTitle}>Conformidad general</Text>
            <View style={styles.conformidadRow}>
              {(["conforme", "no_conforme"] as Conformidad[]).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setInspeccionFields((prev) => ({ ...prev, conformidad: c }))}
                  style={[
                    styles.conformidadBtn,
                    inspeccionFields.conformidad === c && styles.conformidadBtnActive,
                    c === "no_conforme" && styles.conformidadBtnRed,
                    inspeccionFields.conformidad === c && c === "no_conforme" && styles.conformidadBtnRedActive,
                  ]}
                >
                  <Text style={[
                    styles.conformidadBtnText,
                    inspeccionFields.conformidad === c && styles.conformidadBtnTextActive,
                  ]}>
                    {c === "conforme" ? "Conforme" : "No conforme"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.paramsTitle}>Parámetros ({parametros.length})</Text>
            {parametros.map((p, i) => (
              <View key={i} style={styles.paramRow}>
                <Text style={styles.paramLabel} numberOfLines={2}>{p.parametro}</Text>
                <View style={styles.paramBtns}>
                  {(["cumple", "no_cumple", "no_aplica"] as ResultadoParametro[]).map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => {
                        setParametros((prev) =>
                          prev.map((item, idx) => idx === i ? { ...item, resultado: r } : item),
                        );
                      }}
                      style={[
                        styles.paramBtn,
                        p.resultado === r && styles.paramBtnActive,
                        r === "no_cumple" && p.resultado === r && styles.paramBtnRed,
                        r === "no_aplica" && p.resultado === r && styles.paramBtnGray,
                      ]}
                    >
                      <Text style={[styles.paramBtnText, p.resultado === r && styles.paramBtnTextActive]}>
                        {r === "cumple" ? "✓" : r === "no_cumple" ? "✗" : "N/A"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}

            <Button
              mode="contained"
              onPress={handleCrearControl}
              loading={saving}
              style={styles.editSaveBtn}
              icon="clipboard-check"
            >
              Guardar control
            </Button>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  errorTxt: { color: "#dc2626", marginBottom: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontWeight: "700", fontSize: 16, color: "#0f172a" },
  estadoBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  estadoBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, marginBottom: 8 },
  sectionTitle: { color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  sectionLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  infoLabel: { color: "#64748b", fontSize: 13, flex: 1 },
  infoValue: { color: "#0f172a", fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
  observacionesText: { color: "#334155", fontSize: 14, lineHeight: 20, backgroundColor: "#f8fafc", padding: 12, borderRadius: 10 },
  rechazoBadge: { flexDirection: "row", gap: 8, backgroundColor: "#fef2f2", padding: 12, borderRadius: 10, alignItems: "flex-start" },
  rechazoText: { color: "#dc2626", fontSize: 13, flex: 1, lineHeight: 18 },
  fotosRow: { marginTop: 4 },
  foto: { width: 140, height: 140, borderRadius: 12, marginRight: 10 },
  inspeccionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  inspeccionToggleBtn: { borderRadius: 10 },
  controlRow: { marginTop: 8 },
  controlCard: { backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14, marginBottom: 8 },
  controlTitle: { fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  controlBtn: { backgroundColor: "#7c3aed", borderRadius: 12 },
  paramsTitle: { fontWeight: "700", color: "#0f172a", marginTop: 16, marginBottom: 8 },
  actionBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  actionBtnOutline: { flex: 1, borderRadius: 12 },
  actionBtnRed: { borderColor: "#dc2626" },
  actionBtnGreen: { flex: 1, borderRadius: 12, backgroundColor: "#16a34a" },
  actionBtnLabel: { fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: { backgroundColor: "#ffffff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  modalSubtitle: { color: "#475569", fontSize: 13, lineHeight: 19, marginBottom: 16 },
  modalInput: { marginBottom: 16 },
  modalBtns: { flexDirection: "row", gap: 10 },
  modalBtnCancel: { flex: 1, borderRadius: 12 },
  modalBtnConfirm: { flex: 1, borderRadius: 12 },
  editModal: { flex: 1, backgroundColor: "#f5f7fb" },
  editHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  editTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  editScroll: { padding: 16, gap: 8 },
  editInput: { marginBottom: 4 },
  editSaveBtn: { marginTop: 12, borderRadius: 14, backgroundColor: "#3b82f6" },
  conformidadRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  conformidadBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: "#e2e8f0", alignItems: "center" },
  conformidadBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  conformidadBtnRed: { borderColor: "#e2e8f0" },
  conformidadBtnRedActive: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  conformidadBtnText: { color: "#475569", fontWeight: "600" },
  conformidadBtnTextActive: { color: "#ffffff" },
  paramRow: { backgroundColor: "#ffffff", borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: "#e2e8f0" },
  paramLabel: { color: "#334155", fontSize: 12, marginBottom: 8, lineHeight: 17 },
  paramBtns: { flexDirection: "row", gap: 6 },
  paramBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" },
  paramBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  paramBtnRed: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  paramBtnGray: { backgroundColor: "#94a3b8", borderColor: "#94a3b8" },
  paramBtnText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  paramBtnTextActive: { color: "#ffffff" },
});
