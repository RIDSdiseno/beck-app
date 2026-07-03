import { getClienteRegistrosObra, RegistroCliente, validarRegistroCliente } from "@/services/api/clienteApi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Chip, Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { BrandHeader } from "../../../components/BrandHeader";

// ── Helpers ──────────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
}

function SectionTitle({ title }: { title: string }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text></View>;
}

function FieldRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

// ── Canvas de firma ───────────────────────────────────────────────────────────────

type SignatureCanvasProps = {
  onPathChange: (pathData: string, w: number, h: number) => void;
};

function SignatureCanvas({ onPathChange }: SignatureCanvasProps) {
  const [completedPaths, setCompletedPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const currentPathRef = useRef<string>("");
  const isDrawing = useRef(false);

  const notifyChange = useCallback((paths: string[], w: number, h: number) => {
    const combined = paths.join(" ").trim();
    onPathChange(combined, w, h);
  }, [onPathChange]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder:       () => true,
    onMoveShouldSetPanResponder:        () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture:  () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      currentPathRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
      setCurrentPath(currentPathRef.current);
      isDrawing.current = true;
    },
    onPanResponderMove: (evt) => {
      if (!isDrawing.current) return;
      const { locationX, locationY } = evt.nativeEvent;
      currentPathRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
      setCurrentPath(currentPathRef.current);
    },
    onPanResponderRelease: () => {
      if (currentPathRef.current) {
        setCompletedPaths((prev) => {
          const newPaths = [...prev, currentPathRef.current];
          notifyChange(newPaths, dimensions.width, dimensions.height);
          return newPaths;
        });
      }
      currentPathRef.current = "";
      setCurrentPath("");
      isDrawing.current = false;
    },
    onPanResponderTerminate: () => {
      if (currentPathRef.current) {
        setCompletedPaths((prev) => {
          const newPaths = [...prev, currentPathRef.current];
          notifyChange(newPaths, dimensions.width, dimensions.height);
          return newPaths;
        });
      }
      currentPathRef.current = "";
      setCurrentPath("");
      isDrawing.current = false;
    },
  });

  const handleClear = () => {
    setCompletedPaths([]);
    setCurrentPath("");
    currentPathRef.current = "";
    notifyChange([], dimensions.width, dimensions.height);
  };

  const isEmpty = completedPaths.length === 0 && currentPath === "";

  return (
    <View>
      <View
        style={styles.signatureBox}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setDimensions({ width, height });
        }}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          {completedPaths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke="#111827"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={currentPath}
              stroke="#111827"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
        {isEmpty ? (
          <View style={styles.signaturePlaceholder}>
            <MaterialCommunityIcons name="draw-pen" size={28} color="#cbd5e1" />
            <Text style={styles.signaturePlaceholderText}>Firme aquí con el dedo</Text>
          </View>
        ) : null}
      </View>

      {!isEmpty ? (
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <MaterialCommunityIcons name="eraser" size={16} color="#64748b" />
          <Text style={styles.clearBtnText}>Limpiar firma</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────────

export default function ClienteRegistroScreen() {
  const insets = useSafeAreaInsets();
  const { id, obraId } = useLocalSearchParams<{ id: string; obraId: string }>();

  const [registro, setRegistro] = useState<RegistroCliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Firma
  const [showSignModal, setShowSignModal] = useState(false);
  const [pathData, setPathData] = useState("");
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);

  // Validación
  const [validando, setValidando] = useState(false);
  const [validado, setValidado] = useState(false);

  // Galería de fotos
  const [fotoIdx, setFotoIdx] = useState(0);
  const [showFotos, setShowFotos] = useState(false);

  useEffect(() => {
    if (!id || !obraId) {
      setError("Faltan parámetros de navegación");
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const registros = await getClienteRegistrosObra(obraId);
        const found = registros.find((r) => r.id === id);
        if (found) {
          setRegistro(found);
        } else {
          setError("Registro no encontrado o ya fue validado");
        }
      } catch (err: any) {
        setError(err?.message || "No se pudo cargar el registro");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, obraId]);

  const handleSignatureChange = (path: string, w: number, h: number) => {
    setPathData(path);
    setCanvasWidth(w);
    setCanvasHeight(h);
  };

  const handleConfirmSign = async () => {
    if (!registro || !pathData.trim()) {
      Alert.alert("Firma requerida", "Por favor dibuja tu firma antes de confirmar.");
      return;
    }

    Alert.alert(
      "Confirmación irreversible",
      "¿Estás seguro de validar este registro?\n\nUna vez validado con tu firma, no se podrá deshacer. Se generará el PDF final firmado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, validar",
          style: "destructive",
          onPress: async () => {
            setValidando(true);
            setShowSignModal(false);
            try {
              await validarRegistroCliente(registro.id, {
                pathData,
                canvasWidth,
                canvasHeight,
              });
              setValidado(true);
              Alert.alert(
                "¡Registro validado!",
                "El registro fue firmado y el PDF final fue generado exitosamente.",
                [{ text: "Volver a obras", onPress: () => router.back() }],
              );
            } catch (err: any) {
              Alert.alert("Error", err?.message || "No se pudo validar el registro");
            } finally {
              setValidando(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (error || !registro) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top + 14 }]} edges={["top"]}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error || "Registro no encontrado"}</Text>
          <Button mode="contained" onPress={() => router.back()}>Volver</Button>
        </View>
      </SafeAreaView>
    );
  }

  const isJunta     = registro.tipoRegistro === "junta_lineal_espuma";
  const fotos       = registro.fotos || [];
  const codigoBeck  = registro.codigoBeck || `REG-${registro.id.slice(0, 6).toUpperCase()}`;

  return (
    <>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top + 2 }]} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <BrandHeader subtitle="Detalle · BECK" />
            <Button mode="text" onPress={() => router.back()} compact>Volver</Button>
          </View>
          <Text variant="titleMedium" style={styles.title}>{codigoBeck}</Text>
          <Text style={styles.subtitle}>{isJunta ? "Junta Lineal Espuma" : "Sello Cortafuego"} · {formatDate(registro.fecha)}</Text>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>

          {/* Badge estado validación */}
          <View style={styles.badgeRow}>
            <Chip
              style={styles.validadoBadge}
              icon="check-decagram"
              textStyle={styles.validadoBadgeText}
            >
              Validado por Ingeniería
            </Chip>
            {registro.validadoCliente ? (
              <Chip
                style={styles.clienteBadge}
                icon="draw-pen"
                textStyle={styles.clienteBadgeText}
              >
                Firmado por cliente
              </Chip>
            ) : null}
          </View>

          {/* Información general */}
          <SectionTitle title="INFORMACIÓN GENERAL" />
          <View style={styles.section}>
            <FieldRow label="Código BECK"   value={codigoBeck} />
            <FieldRow label="Fecha"         value={formatDate(registro.fecha)} />
            <FieldRow label="Día semana"    value={registro.diaSemana} />
            <FieldRow label="Folio"         value={registro.folio} />
            <FieldRow label="Observaciones" value={registro.observaciones} />
          </View>

          {/* Datos técnicos */}
          <SectionTitle title="DATOS TÉCNICOS" />
          <View style={styles.section}>
            <FieldRow label="Material"        value={registro.descripcionMaterial} />
            <FieldRow label="Recinto"         value={registro.recinto} />
            <FieldRow label="Módulo"          value={registro.modulo} />
            <FieldRow label="Piso"            value={registro.piso} />
            <FieldRow label="Eje"             value={registro.eje} />
            {!isJunta && <FieldRow label="N° de sello"   value={registro.numeroSello} />}
            <FieldRow
              label={isJunta ? "Longitud (m)" : "Cant. sellos"}
              value={isJunta ? registro.metrosLineales : registro.cantidadSellos}
            />
            {registro.cantidadFinal != null && (
              <FieldRow label="Cantidad final" value={registro.cantidadFinal} />
            )}
            <FieldRow label="Sellador"        value={registro.nombreSellador} />
            <FieldRow label="Holgura (cm)"    value={registro.holgura} />
            <FieldRow label="Factor holgura"  value={registro.factorPorHolguras} />
            <FieldRow label="Accesibilidad"   value={registro.accesibilidad} />
            <FieldRow label="Itemizado BECK"     value={registro.itemizadoBeck} />
            <FieldRow label="Itemizado mandante" value={registro.itemizadoMandante} />
          </View>

          {/* Fotografías */}
          {fotos.length > 0 ? (
            <>
              <SectionTitle title={`FOTOGRAFÍAS (${fotos.length})`} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.fotosScroll}
                contentContainerStyle={styles.fotosContainer}
              >
                {fotos.map((foto, idx) => (
                  <TouchableOpacity
                    key={foto.id}
                    onPress={() => { setFotoIdx(idx); setShowFotos(true); }}
                  >
                    <Image source={{ uri: foto.url }} style={styles.fotoThumb} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Aviso irreversible */}
          {!registro.validadoCliente && !validado ? (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#d97706" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Acción irreversible</Text>
                <Text style={styles.warningText}>
                  Al validar este registro con tu firma, confirmas que el trabajo fue realizado correctamente. Esta acción no puede deshacerse.
                </Text>
              </View>
            </View>
          ) : null}


        </ScrollView>

        {/* Botón de validación */}
        {!registro.validadoCliente && !validado ? (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
            <Button
              mode="contained"
              icon="draw-pen"
              onPress={() => setShowSignModal(true)}
              loading={validando}
              disabled={validando}
              style={styles.signBtn}
              contentStyle={styles.signBtnContent}
              labelStyle={styles.signBtnLabel}
            >
              Validar con firma
            </Button>
          </View>
        ) : null}
      </SafeAreaView>

      {/* Modal de firma */}
      <Modal
        visible={showSignModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSignModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "left", "right", "bottom"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Firma digital</Text>
            <TouchableOpacity onPress={() => setShowSignModal(false)} style={styles.modalClose}>
              <MaterialCommunityIcons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Dibuja tu firma en el recuadro con el dedo para validar el registro{" "}
              <Text style={{ fontWeight: "900" }}>{codigoBeck}</Text>.
            </Text>

            {/* Warning en el modal también */}
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#d97706" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Acción irreversible</Text>
                <Text style={styles.warningText}>
                  Una vez confirmada, la validación no puede deshacerse y se generará el PDF final firmado.
                </Text>
              </View>
            </View>

            <SignatureCanvas onPathChange={handleSignatureChange} />

            <Button
              mode="contained"
              icon="check-circle"
              onPress={handleConfirmSign}
              disabled={!pathData.trim() || validando}
              loading={validando}
              style={[styles.signBtn, { marginTop: 20 }]}
              contentStyle={styles.signBtnContent}
              labelStyle={styles.signBtnLabel}
            >
              Confirmar y validar
            </Button>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal galería de fotos */}
      <Modal
        visible={showFotos}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFotos(false)}
      >
        <TouchableOpacity style={styles.fotoModal} activeOpacity={1} onPress={() => setShowFotos(false)}>
          {fotos[fotoIdx] ? (
            <Image source={{ uri: fotos[fotoIdx].url }} style={styles.fotoFull} resizeMode="contain" />
          ) : null}
          <TouchableOpacity style={styles.fotoModalClose} onPress={() => setShowFotos(false)}>
            <MaterialCommunityIcons name="close-circle" size={34} color="#ffffff" />
          </TouchableOpacity>
          {fotos.length > 1 ? (
            <View style={styles.fotoNav}>
              <TouchableOpacity
                onPress={() => setFotoIdx((i) => Math.max(0, i - 1))}
                disabled={fotoIdx === 0}
              >
                <MaterialCommunityIcons name="chevron-left" size={36} color={fotoIdx === 0 ? "#64748b" : "#ffffff"} />
              </TouchableOpacity>
              <Text style={styles.fotoNavText}>{fotoIdx + 1} / {fotos.length}</Text>
              <TouchableOpacity
                onPress={() => setFotoIdx((i) => Math.min(fotos.length - 1, i + 1))}
                disabled={fotoIdx === fotos.length - 1}
              >
                <MaterialCommunityIcons name="chevron-right" size={36} color={fotoIdx === fotos.length - 1 ? "#64748b" : "#ffffff"} />
              </TouchableOpacity>
            </View>
          ) : null}
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f5f7fb" },
  center:         { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  header:         { backgroundColor: "#f5f7fb", paddingBottom: 8, paddingHorizontal: 16 },
  headerRow:      { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  title:          { color: "#0f172a", fontWeight: "900", marginBottom: 2 },
  subtitle:       { color: "#64748b", fontSize: 13, marginBottom: 8 },
  content:        { paddingHorizontal: 16, paddingTop: 4 },
  badgeRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  validadoBadge:  { backgroundColor: "#dcfce7", borderRadius: 10 },
  validadoBadgeText: { color: "#16a34a", fontSize: 11, fontWeight: "800" },
  clienteBadge:   { backgroundColor: "#dbeafe", borderRadius: 10 },
  clienteBadgeText: { color: "#2563eb", fontSize: 11, fontWeight: "800" },
  sectionHeader:  { backgroundColor: "#0f172a", borderRadius: 8, marginBottom: 8, marginTop: 12, paddingHorizontal: 10, paddingVertical: 6 },
  sectionTitle:   { color: "#ffffff", fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  section:        { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  fieldRow:       { borderBottomColor: "#f1f5f9", borderBottomWidth: 1, flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10 },
  fieldLabel:     { color: "#64748b", flex: 1, fontSize: 13, fontWeight: "700" },
  fieldValue:     { color: "#0f172a", flex: 2, fontSize: 13 },
  fotosScroll:    { marginTop: 8 },
  fotosContainer: { gap: 8, paddingRight: 16 },
  fotoThumb:      { borderRadius: 10, height: 120, width: 160 },
  warningBox:     {
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 14,
  },
  warningContent: { flex: 1 },
  warningTitle:   { color: "#92400e", fontWeight: "800", fontSize: 13, marginBottom: 4 },
  warningText:    { color: "#78350f", fontSize: 12, lineHeight: 18 },
  bottomBar: {
    backgroundColor: "#f5f7fb",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  signBtn:        { backgroundColor: "#0f172a", borderRadius: 14 },
  signBtnContent: { minHeight: 50 },
  signBtnLabel:   { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  errorState:     { alignItems: "center", flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  errorText:      { color: "#dc2626", fontSize: 15, fontWeight: "700", textAlign: "center" },

  // Modal firma
  modalContainer: { backgroundColor: "#f5f7fb", flex: 1 },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    backgroundColor: "#ffffff",
  },
  modalTitle:     { color: "#0f172a", fontSize: 18, fontWeight: "900" },
  modalClose:     { padding: 4 },
  modalContent:   { padding: 16, paddingBottom: 40 },
  modalSubtitle:  { color: "#475569", fontSize: 14, lineHeight: 22, marginBottom: 16 },

  // Canvas de firma
  signatureBox: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 16,
    borderWidth: 1.5,
    height: 200,
    overflow: "hidden",
    marginTop: 8,
  },
  signaturePlaceholder: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  signaturePlaceholderText: { color: "#cbd5e1", fontSize: 14 },
  clearBtn: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
  },
  clearBtnText:   { color: "#64748b", fontSize: 13, fontWeight: "700" },

  // Galería de fotos
  fotoModal: {
    backgroundColor: "rgba(0,0,0,0.95)",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fotoFull:       { width: "100%", height: "70%" },
  fotoModalClose: { position: "absolute", top: 52, right: 16 },
  fotoNav: {
    alignItems: "center",
    flexDirection: "row",
    gap: 20,
    position: "absolute",
    bottom: 52,
  },
  fotoNavText:    { color: "#ffffff", fontSize: 14, fontWeight: "700" },
});
