import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SelectSheet } from "@/components/SelectSheet";
import {
  asignarInventario,
  getInventarioPorCodigo,
  getOperariosInventario,
  type PersonaInventario,
  type ResultadoEscaneoInventario,
} from "@/services/api/inventarioBeckApi";
import { getSession } from "@/services/auth/session";

const COLORS = {
  navy: "#0f172a",
  orange: "#f97316",
  yellow: "#fbbf24",
  background: "#f5f7fb",
  muted: "#64748b",
};

function tipoLabel(tipo: string) {
  if (tipo === "epp") return "EPP";
  if (tipo === "implemento") return "Implemento";
  return "Herramienta";
}

function tipoIcon(tipo: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (tipo === "epp") return "hard-hat";
  if (tipo === "implemento") return "shield-check-outline";
  return "tools";
}

export default function EscanearInventarioBeckScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanEnabled, setScanEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const scanLock = useRef(false);
  const [codigo, setCodigo] = useState("");
  const [codigoConsultado, setCodigoConsultado] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadoEscaneoInventario[]>([]);
  const [selected, setSelected] = useState<ResultadoEscaneoInventario | null>(null);
  const [obraId, setObraId] = useState<string | null>(null);
  const [operarios, setOperarios] = useState<PersonaInventario[]>([]);
  const [trabajadorId, setTrabajadorId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    void getSession().then((session) => {
      if (session.user?.rol !== "jefeobra") router.replace("/(tabs)");
    });
  }, [router]);

  const consultar = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value || loading) return;
    setLoading(true);
    setScanEnabled(false);
    try {
      const result = await getInventarioPorCodigo(value);
      setCodigo(result.codigo);
      setCodigoConsultado(result.codigo);
      setResultados(result.resultados);
      setSelected(result.resultados.length === 1 ? result.resultados[0] : null);
      setObraId(null);
      setOperarios([]);
      setTrabajadorId(null);
      setCantidad(1);
      setObservacion("");
      if (result.resultados.length) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      scanLock.current = false;
      setScanEnabled(true);
      Alert.alert("No se pudo consultar", error instanceof Error ? error.message : "Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleBarcode = useCallback(({ data }: BarcodeScanningResult) => {
    if (!scanEnabled || scanLock.current || loading) return;
    scanLock.current = true;
    void consultar(data);
  }, [consultar, loading, scanEnabled]);

  const resetScan = () => {
    scanLock.current = false;
    setScanEnabled(true);
    setCodigo("");
    setCodigoConsultado(null);
    setResultados([]);
    setSelected(null);
    setObraId(null);
    setOperarios([]);
    setTrabajadorId(null);
    setCantidad(1);
    setObservacion("");
  };

  const seleccionarResultado = (item: ResultadoEscaneoInventario) => {
    setSelected(item);
    const primeraObra = item.disponibleSupervisorPorObra[0];
    setObraId(primeraObra?.obra.id ?? null);
    setCantidad(1);
    setTrabajadorId(null);
    setOperarios([]);
    if (primeraObra) {
      void getOperariosInventario(primeraObra.obra.id)
        .then(setOperarios)
        .catch((error) => Alert.alert("No se cargaron los operarios", error instanceof Error ? error.message : "Intenta nuevamente."));
    }
  };

  const cambiarObra = async (value: string | null) => {
    setObraId(value);
    setTrabajadorId(null);
    setOperarios([]);
    setCantidad(1);
    if (!value) return;
    try {
      setOperarios(await getOperariosInventario(value));
    } catch (error) {
      Alert.alert("No se cargaron los operarios", error instanceof Error ? error.message : "Intenta nuevamente.");
    }
  };

  const disponibleSeleccionado = useMemo(() =>
    selected?.disponibleSupervisorPorObra.find((item) => item.obra.id === obraId)?.cantidad ?? 0,
  [obraId, selected]);

  const confirmarAsignacion = () => {
    const trabajador = operarios.find((item) => item.id === trabajadorId);
    if (!selected || !obraId || !trabajador || cantidad <= 0) return;
    Alert.alert(
      "Confirmar entrega",
      `Se asignarán ${cantidad} ${cantidad === 1 ? "unidad" : "unidades"} de ${selected.nombre} a ${trabajador.nombre}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Asignar",
          onPress: async () => {
            setSaving(true);
            try {
              await asignarInventario({
                obraId,
                trabajadorId: trabajador.id,
                observacion: observacion.trim() || "Asignación realizada mediante escaneo",
                lineas: [{ tipoItem: selected.tipoItem, itemId: selected.itemId, cantidad }],
              });
              const refreshed = await getInventarioPorCodigo(codigoConsultado!);
              setResultados(refreshed.resultados);
              const refreshedSelected = refreshed.resultados.find((item) => item.itemId === selected.itemId && item.tipoItem === selected.tipoItem) ?? null;
              setSelected(refreshedSelected);
              setObraId(null);
              setOperarios([]);
              setTrabajadorId(null);
              setCantidad(1);
              setObservacion("");
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Artículo asignado", `La entrega a ${trabajador.nombre} quedó registrada.`);
            } catch (error) {
              Alert.alert("No se pudo asignar", error instanceof Error ? error.message : "Intenta nuevamente.");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.orange} /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionCard}>
          <MaterialCommunityIcons name="camera-off-outline" size={54} color={COLORS.orange} />
          <Text style={styles.permissionTitle}>Permiso de cámara</Text>
          <Text style={styles.permissionText}>La cámara se utiliza únicamente para leer las etiquetas CODE128 generadas en el CRM.</Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}><Text style={styles.primaryButtonText}>Permitir cámara</Text></Pressable>
          <Pressable onPress={() => router.back()}><Text style={styles.backText}>Volver</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}><MaterialCommunityIcons name="arrow-left" size={24} color="#fff" /></Pressable>
        <View style={styles.headerText}><Text style={styles.eyebrow}>INVENTARIO BECK</Text><Text style={styles.headerTitle}>Consultar etiqueta</Text></View>
        <Pressable style={styles.headerButton} onPress={() => setTorch((value) => !value)}><MaterialCommunityIcons name={torch ? "flashlight" : "flashlight-off"} size={23} color={torch ? COLORS.yellow : "#fff"} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.cameraShell}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            active
            barcodeScannerSettings={{ barcodeTypes: ["code128", "ean13", "ean8", "upc_a", "upc_e"] }}
            onBarcodeScanned={scanEnabled ? handleBarcode : undefined}
          />
          <View style={styles.scanFrame} />
          {loading ? <View style={styles.cameraLoading}><ActivityIndicator color="#fff" /></View> : null}
        </View>

        <View style={styles.manualRow}>
          <TextInput value={codigo} onChangeText={setCodigo} placeholder="Ingresar SKU manualmente" placeholderTextColor="#94a3b8" autoCapitalize="characters" style={styles.manualInput} />
          <Pressable disabled={!codigo.trim() || loading} style={[styles.lookupButton, (!codigo.trim() || loading) && styles.disabled]} onPress={() => void consultar(codigo)}><MaterialCommunityIcons name="magnify" size={22} color="#fff" /></Pressable>
        </View>

        {codigoConsultado ? (
          <>
            <View style={styles.resultHeader}>
              <View><Text style={styles.resultEyebrow}>CÓDIGO LEÍDO</Text><Text style={styles.codeText}>{codigoConsultado}</Text></View>
              <Pressable style={styles.scanAgain} onPress={resetScan}><MaterialCommunityIcons name="barcode-scan" size={18} color={COLORS.orange} /><Text style={styles.scanAgainText}>Otro código</Text></Pressable>
            </View>
            {resultados.length > 1 ? <View style={styles.warningBox}><MaterialCommunityIcons name="alert-outline" size={20} color="#92400e" /><Text style={styles.warningText}>Este SKU coincide con {resultados.length} registros. Selecciona el artículo correcto.</Text></View> : null}
            {resultados.length === 0 ? (
              <View style={styles.emptyCard}><MaterialCommunityIcons name="barcode-off" size={38} color={COLORS.orange} /><Text style={styles.emptyTitle}>Código no registrado</Text><Text style={styles.emptyText}>No existe un EPP, implemento o herramienta activa con este SKU.</Text></View>
            ) : resultados.map((item) => {
              const active = selected?.itemId === item.itemId && selected.tipoItem === item.tipoItem;
              return (
                <Pressable key={`${item.tipoItem}:${item.itemId}`} style={[styles.itemCard, active && styles.itemCardActive]} onPress={() => seleccionarResultado(item)}>
                  <View style={styles.itemTop}>
                    <View style={styles.itemIcon}><MaterialCommunityIcons name={tipoIcon(item.tipoItem)} size={24} color={COLORS.navy} /></View>
                    <View style={styles.itemInfo}><Text style={styles.typeText}>{tipoLabel(item.tipoItem)}</Text><Text style={styles.itemName}>{item.nombre}</Text><Text style={styles.itemMeta}>{[item.detalle, item.talla ? `Talla ${item.talla}` : null, item.color].filter(Boolean).join(" · ") || `SKU ${item.sku}`}</Text></View>
                    {active ? <MaterialCommunityIcons name="check-circle" size={23} color={COLORS.orange} /> : null}
                  </View>
                  {item.custodios.map((custodio) => (
                    <View key={custodio.asignacionId} style={styles.ownerRow}>
                      <MaterialCommunityIcons name={custodio.custodio.rol === "operario" ? "account-hard-hat" : "account-tie"} size={18} color={custodio.esMio ? "#047857" : COLORS.muted} />
                      <View style={styles.ownerText}><Text style={styles.ownerName}>{custodio.custodio.nombre} · {custodio.cantidad} {custodio.cantidad === 1 ? "unidad" : "unidades"}</Text><Text style={styles.ownerMeta}>{custodio.custodio.rol === "operario" ? `Operario · Supervisor ${custodio.supervisor.nombre}` : "Supervisor"} · {custodio.obra.nombre}</Text></View>
                    </View>
                  ))}
                  {(item.saldoBodega ?? 0) > 0 ? (
                    <View style={styles.ownerRow}><MaterialCommunityIcons name="warehouse" size={18} color="#92400e" /><View style={styles.ownerText}><Text style={styles.ownerName}>Disponible en bodega · {item.saldoBodega} {item.saldoBodega === 1 ? "unidad" : "unidades"}</Text><Text style={styles.ownerMeta}>Aún no asignado a un supervisor</Text></View></View>
                  ) : null}
                  {!item.custodios.length && !(item.saldoBodega ?? 0) ? (
                    <View style={styles.ownerRow}><MaterialCommunityIcons name="account-question-outline" size={18} color={COLORS.muted} /><View style={styles.ownerText}><Text style={styles.ownerName}>Sin asignación activa</Text><Text style={styles.ownerMeta}>Este registro no tiene stock disponible ni custodio actual</Text></View></View>
                  ) : null}
                  {item.disponibleSupervisorPorObra.length ? <Text style={styles.availableText}>Tienes unidades disponibles para asignar</Text> : <Text style={styles.unavailableText}>No tienes unidades disponibles de este registro</Text>}
                </Pressable>
              );
            })}
          </>
        ) : <Text style={styles.scanHint}>Apunta la cámara al código de barras generado desde el módulo Inventario del CRM.</Text>}

        {selected?.disponibleSupervisorPorObra.length ? (
          <View style={styles.assignmentCard}>
            <Text style={styles.assignmentTitle}>Asignar artículo escaneado</Text>
            <SelectSheet label="Obra" value={obraId} placeholder="Selecciona la obra" options={selected.disponibleSupervisorPorObra.map((item) => ({ value: item.obra.id, label: `${item.obra.nombre}${item.obra.codigo ? ` · ${item.obra.codigo}` : ""} · ${item.cantidad} disponibles` }))} onChange={(value) => void cambiarObra(value)} icon="office-building-outline" />
            <SelectSheet label="Operario" value={trabajadorId} placeholder={obraId ? operarios.length ? "Selecciona un operario" : "No hay operarios vinculados" : "Primero selecciona una obra"} options={operarios.map((item) => ({ value: item.id, label: `${item.nombre} · ${item.email}` }))} onChange={setTrabajadorId} icon="account-hard-hat" />
            {obraId ? <View style={styles.quantityRow}><Text style={styles.quantityLabel}>Cantidad</Text><View style={styles.stepper}><Pressable style={styles.stepButton} onPress={() => setCantidad((value) => Math.max(1, value - 1))}><MaterialCommunityIcons name="minus" size={20} color={COLORS.navy} /></Pressable><Text style={styles.quantityValue}>{cantidad}</Text><Pressable style={styles.stepButton} onPress={() => setCantidad((value) => Math.min(disponibleSeleccionado, selected.tipoItem === "herramienta" ? 1 : value + 1))}><MaterialCommunityIcons name="plus" size={20} color={COLORS.navy} /></Pressable></View></View> : null}
            <TextInput value={observacion} onChangeText={setObservacion} placeholder="Observación opcional" placeholderTextColor="#94a3b8" multiline style={styles.observationInput} maxLength={1000} />
            <Pressable disabled={!trabajadorId || saving} style={[styles.assignButton, (!trabajadorId || saving) && styles.disabled]} onPress={confirmarAsignacion}>{saving ? <ActivityIndicator color="#fff" /> : <><MaterialCommunityIcons name="account-arrow-right" size={21} color="#fff" /><Text style={styles.assignText}>Asignar al operario</Text></>}</Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: COLORS.background, flex: 1 },
  center: { alignItems: "center", backgroundColor: COLORS.background, flex: 1, justifyContent: "center" },
  header: { alignItems: "center", backgroundColor: COLORS.navy, flexDirection: "row", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  headerButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 21, height: 42, justifyContent: "center", width: 42 },
  headerText: { flex: 1 },
  eyebrow: { color: COLORS.yellow, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  content: { padding: 14, paddingBottom: 40 },
  cameraShell: { backgroundColor: "#111827", borderRadius: 22, height: 235, overflow: "hidden" },
  scanFrame: { borderColor: COLORS.yellow, borderRadius: 16, borderWidth: 2, bottom: 70, left: 35, position: "absolute", right: 35, top: 70 },
  cameraLoading: { ...StyleSheet.absoluteFillObject, alignItems: "center", backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center" },
  manualRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  manualInput: { backgroundColor: "#fff", borderColor: "#cbd5e1", borderRadius: 15, borderWidth: 1, color: COLORS.navy, flex: 1, minHeight: 48, paddingHorizontal: 13 },
  lookupButton: { alignItems: "center", backgroundColor: COLORS.orange, borderRadius: 15, justifyContent: "center", width: 50 },
  disabled: { opacity: 0.45 },
  scanHint: { color: COLORS.muted, lineHeight: 20, paddingHorizontal: 12, paddingVertical: 18, textAlign: "center" },
  resultHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  resultEyebrow: { color: COLORS.muted, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  codeText: { color: COLORS.navy, fontSize: 20, fontWeight: "900" },
  scanAgain: { alignItems: "center", backgroundColor: "#fff7ed", borderRadius: 12, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  scanAgainText: { color: COLORS.orange, fontSize: 11, fontWeight: "900" },
  warningBox: { alignItems: "center", backgroundColor: "#fffbeb", borderColor: "#fde68a", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 8, marginTop: 10, padding: 10 },
  warningText: { color: "#92400e", flex: 1, fontSize: 11, fontWeight: "700" },
  emptyCard: { alignItems: "center", backgroundColor: "#fff", borderColor: "#fed7aa", borderRadius: 18, borderWidth: 1, marginTop: 12, padding: 25 },
  emptyTitle: { color: COLORS.navy, fontSize: 16, fontWeight: "900", marginTop: 8 },
  emptyText: { color: COLORS.muted, lineHeight: 18, marginTop: 4, textAlign: "center" },
  itemCard: { backgroundColor: "#fff", borderColor: "#e2e8f0", borderRadius: 18, borderWidth: 1, marginTop: 10, padding: 13 },
  itemCardActive: { backgroundColor: "#fffaf0", borderColor: COLORS.orange, borderWidth: 2 },
  itemTop: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  itemIcon: { alignItems: "center", backgroundColor: "#fef3c7", borderRadius: 12, height: 44, justifyContent: "center", width: 44 },
  itemInfo: { flex: 1 },
  typeText: { color: COLORS.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  itemName: { color: COLORS.navy, fontSize: 14, fontWeight: "900", marginTop: 2 },
  itemMeta: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  ownerRow: { alignItems: "flex-start", backgroundColor: "#f8fafc", borderRadius: 11, flexDirection: "row", gap: 8, marginTop: 9, padding: 9 },
  ownerText: { flex: 1 },
  ownerName: { color: COLORS.navy, fontSize: 11, fontWeight: "900" },
  ownerMeta: { color: COLORS.muted, fontSize: 9, marginTop: 2 },
  availableText: { color: "#047857", fontSize: 10, fontWeight: "900", marginTop: 9 },
  unavailableText: { color: "#b45309", fontSize: 10, fontWeight: "800", marginTop: 9 },
  assignmentCard: { backgroundColor: "#fffdf8", borderColor: "#fbbf24", borderRadius: 20, borderWidth: 1, marginTop: 14, padding: 14 },
  assignmentTitle: { color: COLORS.navy, fontSize: 17, fontWeight: "900", marginBottom: 12 },
  quantityRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  quantityLabel: { color: COLORS.navy, fontSize: 12, fontWeight: "800" },
  stepper: { alignItems: "center", flexDirection: "row", gap: 13 },
  stepButton: { alignItems: "center", backgroundColor: "#fef3c7", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  quantityValue: { color: COLORS.navy, fontSize: 18, fontWeight: "900", minWidth: 22, textAlign: "center" },
  observationInput: { backgroundColor: "#fff", borderColor: "#cbd5e1", borderRadius: 15, borderWidth: 1, color: COLORS.navy, minHeight: 72, padding: 12, textAlignVertical: "top" },
  assignButton: { alignItems: "center", backgroundColor: COLORS.orange, borderRadius: 15, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 12, minHeight: 50 },
  assignText: { color: "#fff", fontWeight: "900" },
  permissionCard: { alignItems: "center", flex: 1, justifyContent: "center", padding: 30 },
  permissionTitle: { color: COLORS.navy, fontSize: 22, fontWeight: "900", marginTop: 12 },
  permissionText: { color: COLORS.muted, lineHeight: 20, marginBottom: 18, marginTop: 7, textAlign: "center" },
  primaryButton: { backgroundColor: COLORS.orange, borderRadius: 15, paddingHorizontal: 24, paddingVertical: 13 },
  primaryButtonText: { color: "#fff", fontWeight: "900" },
  backText: { color: COLORS.muted, fontWeight: "800", marginTop: 16 },
});
