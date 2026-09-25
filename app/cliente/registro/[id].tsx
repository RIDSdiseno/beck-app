import {
  compartirPdfCliente,
  getClienteRegistrosObra,
  RegistroCliente,
  validarRegistroCliente,
} from "@/services/api/clienteApi";
import {
  CampoConfiguracionRegistro,
  getConfiguracionRegistro,
} from "@/services/api/obrasApi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { BrandHeader } from "../../../components/BrandHeader";
import { ExpandableImage } from "../../../components/ExpandableImage";
import { getAccesibilidadLabel, getAislacionLabel, getAplicacionLabel } from "../../../utils/factoresRegistro";
import { formatDateOnly } from "../../../utils/dateTime";

// ── Helpers ──────────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  return formatDateOnly(value, { day: "2-digit", month: "long", year: "numeric" });
}

function SectionTitle({ title, icon }: {
  title: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <MaterialCommunityIcons name={icon} size={19} color="#0f172a" />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
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
  onScrollLock?: (locked: boolean) => void;
};

function SignatureCanvas({ onPathChange, onScrollLock }: SignatureCanvasProps) {
  const [completedPaths, setCompletedPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const currentPathRef = useRef<string>("");
  const completedPathsRef = useRef<string[]>([]);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const isDrawing = useRef(false);

  const notifyChange = useCallback((paths: string[], w: number, h: number) => {
    const combined = paths.join(" ").trim();
    onPathChange(combined, w, h);
  }, [onPathChange]);

  // PanResponder conserva estos callbacks y solo accede a los refs durante los gestos.
  // eslint-disable-next-line react-hooks/refs
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder:       () => true,
    onMoveShouldSetPanResponder:        () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture:  () => true,
    onPanResponderGrant: (evt) => {
      onScrollLock?.(true);
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
      onScrollLock?.(false);
      if (currentPathRef.current) {
        const newPaths = [...completedPathsRef.current, currentPathRef.current];
        completedPathsRef.current = newPaths;
        setCompletedPaths(newPaths);
        notifyChange(newPaths, dimensionsRef.current.width, dimensionsRef.current.height);
      }
      currentPathRef.current = "";
      setCurrentPath("");
      isDrawing.current = false;
    },
    onPanResponderTerminate: () => {
      onScrollLock?.(false);
      if (currentPathRef.current) {
        const newPaths = [...completedPathsRef.current, currentPathRef.current];
        completedPathsRef.current = newPaths;
        setCompletedPaths(newPaths);
        notifyChange(newPaths, dimensionsRef.current.width, dimensionsRef.current.height);
      }
      currentPathRef.current = "";
      setCurrentPath("");
      isDrawing.current = false;
    },
  }), [notifyChange, onScrollLock]);

  const handleClear = () => {
    completedPathsRef.current = [];
    setCompletedPaths([]);
    setCurrentPath("");
    currentPathRef.current = "";
    notifyChange([], dimensionsRef.current.width, dimensionsRef.current.height);
  };

  const isEmpty = completedPaths.length === 0 && currentPath === "";

  return (
    <View>
      <View
        style={styles.signatureBox}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          dimensionsRef.current = { width, height };
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
          <View pointerEvents="none" style={styles.signaturePlaceholder}>
            <MaterialCommunityIcons name="draw-pen" size={28} color="#94a3b8" />
            <Text style={styles.signaturePlaceholderText}>Firme aquí con el dedo</Text>
          </View>
        ) : null}
      </View>

      {!isEmpty ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar firma" style={styles.clearBtn} onPress={handleClear}>
          <MaterialCommunityIcons name="eraser" size={16} color="#64748b" />
          <Text style={styles.clearBtnText}>Limpiar firma</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────────

const DEFAULT_CAMPOS_CLIENTE: Partial<Record<CampoConfiguracionRegistro, boolean>> = {
  codigoBeck: true,
  itemizadoBeck: true,
  dimensiones: true,
  itemizadoMandante: true,
  diaSemana: true,
  folio: true,
  recinto: true,
  modulo: true,
  piso: true,
  eje: true,
  numeroSello: true,
  cantidadSellos: true,
  cantidadFinal: true,
  nombreSellador: true,
  holgura: true,
  factorPorHolguras: true,
  cieloModular: true,
  fechaEjecucionSello: true,
  foto: true,
  ejeAlfabetico: true,
  ejeNumerico: true,
  cantidadSellosConFactores: true,
  aislacion: true,
  cantidadSellosAislacion: true,
  reparacionTabique: true,
};

export default function ClienteRegistroScreen() {
  const insets = useSafeAreaInsets();
  const { id, obraId } = useLocalSearchParams<{ id: string; obraId: string }>();

  const [registro, setRegistro] = useState<RegistroCliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [camposConfigurables, setCamposConfigurables] = useState(DEFAULT_CAMPOS_CLIENTE);

  // Firma
  const [showSignModal, setShowSignModal] = useState(false);
  const [pathData, setPathData] = useState("");
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [scrollLocked, setScrollLocked] = useState(false);

  // Validación
  const [validando, setValidando] = useState(false);
  const [validado, setValidado] = useState(false);
  const [pdfDisponible, setPdfDisponible] = useState(false);
  const [sharing, setSharing] = useState(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/cliente");
  };

  const openSignature = () => {
    // El lienzo se monta vacío cada vez que se abre el modal.
    setPathData("");
    setCanvasWidth(0);
    setCanvasHeight(0);
    setScrollLocked(false);
    setShowSignModal(true);
  };

  useEffect(() => {
    if (!id || !obraId) return;
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
    void load();
  }, [id, obraId]);

  useEffect(() => {
    if (!obraId) return;
    let active = true;

    const loadConfiguracion = async () => {
      try {
        const configuracion = await getConfiguracionRegistro(obraId, "cliente");
        if (!active) return;
        setCamposConfigurables({
          ...DEFAULT_CAMPOS_CLIENTE,
          ...Object.fromEntries(configuracion.map((campo) => [campo.campo, campo.visible])),
        });
      } catch {
        // Si falla, se mantiene la configuracion por defecto (todo visible).
      }
    };

    loadConfiguracion();
    return () => {
      active = false;
    };
  }, [obraId]);

  const campoVisible = (campo: CampoConfiguracionRegistro) =>
    camposConfigurables[campo] ?? true;

  const handleSignatureChange = useCallback((path: string, w: number, h: number) => {
    setPathData(path);
    setCanvasWidth(w);
    setCanvasHeight(h);
  }, []);

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
              const updated = await validarRegistroCliente(registro.id, {
                pathData,
                canvasWidth,
                canvasHeight,
              });
              setValidado(true);
              setPdfDisponible(updated.pdfDisponible);
              Alert.alert(
                "¡Registro validado!",
                "El registro fue firmado y el PDF final fue generado. Puedes compartirlo desde esta pantalla.",
                [{ text: "Entendido" }],
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

  const handleSharePdf = async () => {
    if (!registro || (!pdfDisponible && !registro.pdfDisponible)) return;
    try {
      setSharing(true);
      await compartirPdfCliente(registro.id, codigoBeck);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message ||
          "No se pudo descargar el PDF. Verifica tu conexión e intenta nuevamente.",
      );
    } finally {
      setSharing(false);
    }
  };

  if (!id || !obraId) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: 14 }]} edges={["top"]}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Faltan parámetros de navegación</Text>
          <Button mode="contained" buttonColor="#0f172a" onPress={goBack}>Volver</Button>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (error || !registro) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: 14 }]} edges={["top"]}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error || "Registro no encontrado"}</Text>
          <Button mode="contained" buttonColor="#0f172a" onPress={goBack}>Volver</Button>
        </View>
      </SafeAreaView>
    );
  }

  const isJunta     = registro.tipoRegistro === "junta_lineal_espuma";
  const fotos       = registro.fotos || [];
  const codigoBeck  = registro.codigoBeck || `REG-${registro.id.slice(0, 6).toUpperCase()}`;
  const registroCodigo = `REG-${registro.id.slice(0, 6).toUpperCase()}`;
  const firmado = registro.validadoCliente || validado;

  return (
    <>
      <SafeAreaView style={[styles.container, { paddingTop: 2 }]} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.brand}><BrandHeader subtitle="Detalle · Cliente" /></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver a registros" onPress={goBack} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={18} color="#ea580c" />
              <Text style={styles.backText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: firmado ? insets.bottom + 24 : 24 }]}>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeading}>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons name={isJunta ? "ruler" : "fire"} size={26} color="#0f172a" />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.eyebrow}>{registroCodigo}</Text>
                <Text style={styles.title}>{isJunta ? "Junta lineal espuma" : "Sello cortafuego"}</Text>
              </View>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.validadoBadge}>
                <MaterialCommunityIcons name="check-decagram" size={15} color="#15803d" />
                <Text style={styles.validadoBadgeText}>Validado por Ingeniería</Text>
              </View>
              <View style={[styles.clienteBadge, firmado && styles.signedBadge]}>
                <MaterialCommunityIcons name={firmado ? "check-circle-outline" : "draw-pen"} size={15} color="#0f172a" />
                <Text style={styles.clienteBadgeText}>{firmado ? "Firmado por cliente" : "Pendiente de tu firma"}</Text>
              </View>
            </View>
            <Text style={styles.summaryHint}>{firmado ? "Registro firmado. Puedes consultar sus datos y compartir el PDF disponible." : "Revisa los datos y las fotografías antes de confirmar con tu firma."}</Text>
          </View>

          {/* Información general */}
          <SectionTitle title="Información del registro" icon="clipboard-text-outline" />
          <View style={styles.section}>
            <FieldRow label="Código BECK"   value={campoVisible("codigoBeck") ? codigoBeck : null} />
            <FieldRow label="Fecha"         value={campoVisible("fechaEjecucionSello") ? formatDate(registro.fecha) : null} />
            <FieldRow label="Día semana"    value={campoVisible("diaSemana") ? registro.diaSemana : null} />
            <FieldRow label="Folio"         value={campoVisible("folio") ? registro.folio : null} />
            <FieldRow label="Observaciones" value={registro.observaciones} />
          </View>

          {/* Datos técnicos */}
          <SectionTitle title="Ubicación y trabajo realizado" icon="map-marker-outline" />
          <View style={styles.section}>
            <FieldRow label="Material"        value={campoVisible("itemizadoBeck") ? registro.descripcionMaterial : null} />
            <FieldRow label="Recinto"         value={campoVisible("recinto") ? registro.recinto : null} />
            <FieldRow label="Módulo"          value={campoVisible("modulo") ? registro.modulo : null} />
            <FieldRow label="Piso"            value={campoVisible("piso") ? registro.piso : null} />
            <FieldRow
              label="Eje"
              value={
                campoVisible("ejeAlfabetico") || campoVisible("ejeNumerico")
                  ? [
                      campoVisible("ejeAlfabetico") ? registro.ejeAlfabetico : null,
                      campoVisible("ejeNumerico") ? registro.ejeNumerico : null,
                    ].filter(Boolean).join("-")
                  : null
              }
            />
            {!isJunta && campoVisible("numeroSello") && (
              <FieldRow label="N° de sello" value={registro.numeroSello} />
            )}
            {campoVisible("cantidadSellos") && (
              <FieldRow
                label={isJunta ? "Longitud (m)" : "Cantidad de sellos (Sin Factor)"}
                value={isJunta ? registro.metrosLineales : registro.cantidadSellos}
              />
            )}
            {registro.cantidadFinal != null && campoVisible("cantidadFinal") && (
              <FieldRow label="Cantidad Final (Con Factor)" value={registro.cantidadFinal} />
            )}
            <FieldRow label="Responsable" value={campoVisible("nombreSellador") ? registro.nombreSellador || registro.sellador : null} />
          </View>

          <SectionTitle title="Factores y cantidades" icon="calculator-variant-outline" />
          <View style={styles.section}>
            <FieldRow label="Holgura (cm)"    value={campoVisible("holgura") ? registro.holgura : null} />
            <FieldRow label="Factor holgura"  value={campoVisible("factorPorHolguras") ? registro.factorPorHolguras : null} />
            <FieldRow label="Accesibilidad" value={campoVisible("cieloModular") ? getAccesibilidadLabel(registro) : null} />
            <FieldRow label="Sellos con factores" value={campoVisible("cantidadSellosConFactores") ? registro.cantidadSellosConFactores : null} />
            <FieldRow label="Aislación" value={campoVisible("aislacion") ? getAislacionLabel(registro) : null} />
            <FieldRow label="Sellos aislación" value={campoVisible("cantidadSellosAislacion") ? registro.cantidadSellosAislacion : null} />
            <FieldRow label="Reparación tabique" value={campoVisible("reparacionTabique") ? getAplicacionLabel(registro.reparacionTabique) : null} />
          </View>

          <SectionTitle title="Itemizado y dimensiones" icon="format-list-bulleted" />
          <View style={styles.section}>
            <FieldRow label="Itemizado BECK"     value={campoVisible("itemizadoBeck") ? registro.itemizadoBeck : null} />
            <FieldRow label="Dimensiones" value={campoVisible("dimensiones") ? registro.dimensiones : null} />
            <FieldRow label="Itemizado mandante" value={campoVisible("itemizadoMandante") ? registro.itemizadoMandante : null} />
          </View>

          {/* Fotografías */}
          {campoVisible("foto") && fotos.length > 0 ? (
            <>
              <SectionTitle title={`Evidencia fotográfica · ${fotos.length}`} icon="camera-outline" />
              <Text style={styles.photoHint}>Toca una foto para ampliarla y hacer zoom con los dedos.</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.fotosScroll}
                contentContainerStyle={styles.fotosContainer}
              >
                {fotos.map((foto, idx) => (
                  <View key={foto.id} style={styles.photoCard}>
                    <ExpandableImage uri={foto.url} style={styles.fotoThumb} accessibilityLabel={`Ampliar fotografía ${idx + 1} del registro`} />
                    <View style={styles.photoCaption}>
                      <Text style={styles.photoCaptionText}>Fotografía {idx + 1}</Text>
                      <MaterialCommunityIcons name="magnify-plus-outline" size={19} color="#ea580c" />
                    </View>
                  </View>
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

          {/* PDF firmado disponible */}
          {(registro.validadoCliente || validado) &&
          (pdfDisponible || registro.pdfDisponible) ? (
            <TouchableOpacity
              style={styles.pdfBox}
              onPress={handleSharePdf}
              disabled={sharing}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="file-pdf-box" size={22} color="#16a34a" />
              <Text style={styles.pdfText}>
                {sharing ? "Descargando PDF..." : "PDF firmado listo · toca para compartir"}
              </Text>
              {sharing
                ? <ActivityIndicator size="small" color="#16a34a" />
                : <MaterialCommunityIcons name="share-variant" size={20} color="#16a34a" />
              }
            </TouchableOpacity>
          ) : null}

        </ScrollView>

        {/* Botón de validación */}
        {!registro.validadoCliente && !validado ? (
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
            <Button
              mode="contained"
              icon="draw-pen"
              onPress={openSignature}
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
            <View style={styles.modalHeading}>
              <Text style={styles.eyebrow}>CONFIRMACIÓN DEL CLIENTE</Text>
              <Text style={styles.modalTitle}>Firma del registro</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar firma" onPress={() => setShowSignModal(false)} style={styles.modalClose}>
              <MaterialCommunityIcons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalContent}
            scrollEnabled={!scrollLocked}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.signatureSummary}>
              <MaterialCommunityIcons name={isJunta ? "ruler" : "fire"} size={24} color="#ea580c" />
              <View style={styles.summaryCopy}>
                <Text style={styles.signatureRecord}>{registroCodigo}</Text>
                <Text style={styles.summaryHint}>{isJunta ? "Junta lineal espuma" : "Sello cortafuego"}</Text>
              </View>
            </View>

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

            <SectionTitle title="Tu firma" icon="draw-pen" />
            <Text style={styles.modalSubtitle}>Dibuja con el dedo dentro del recuadro. Puedes limpiar la firma y volver a intentarlo antes de confirmar.</Text>
            {showSignModal && <SignatureCanvas
              onPathChange={handleSignatureChange}
              onScrollLock={setScrollLocked}
            />}

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

    </>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: "#f5f7fb" },
  center:         { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  header:         { backgroundColor: "#f5f7fb", paddingBottom: 4, paddingHorizontal: 16 },
  headerRow:      { alignItems: "center", flexDirection: "row", gap: 8 },
  brand:          { flex: 1, minWidth: 0 },
  backButton:     { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 4 },
  backText:       { color: "#ea580c", fontWeight: "700", fontSize: 13 },
  title:          { color: "#0f172a", fontWeight: "900", fontSize: 20, lineHeight: 25 },
  eyebrow:        { color: "#b45309", fontWeight: "800", fontSize: 11, letterSpacing: 0.8, marginBottom: 4 },
  content:        { paddingHorizontal: 16, paddingTop: 4 },
  summaryCard:    { backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#FDC10B", borderLeftWidth: 4, borderLeftColor: "#f97316", borderRadius: 20, padding: 16, gap: 12 },
  summaryHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryIcon:    { width: 48, height: 48, borderRadius: 15, backgroundColor: "#FDC10B", alignItems: "center", justifyContent: "center" },
  summaryCopy:    { flex: 1, minWidth: 0 },
  summaryHint:    { color: "#64748b", fontSize: 13, lineHeight: 19 },
  badgeRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  validadoBadge:  { backgroundColor: "#dcfce7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "100%" },
  validadoBadgeText: { color: "#15803d", fontSize: 11, fontWeight: "800", flexShrink: 1 },
  clienteBadge:   { backgroundColor: "#fef3c7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "100%" },
  signedBadge:    { backgroundColor: "#e2e8f0" },
  clienteBadgeText: { color: "#0f172a", fontSize: 11, fontWeight: "800", flexShrink: 1 },
  sectionHeader:  { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10, marginTop: 22 },
  sectionIcon:    { width: 32, height: 32, borderRadius: 10, backgroundColor: "#fff0bd", alignItems: "center", justifyContent: "center" },
  sectionTitle:   { color: "#0f172a", fontSize: 16, fontWeight: "800", flex: 1 },
  section:        { backgroundColor: "#ffffff", borderColor: "#f8df8b", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  fieldRow:       { borderBottomColor: "#f1f5f9", borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 11, gap: 4 },
  fieldLabel:     { color: "#64748b", fontSize: 12, fontWeight: "600" },
  fieldValue:     { color: "#0f172a", fontSize: 14, fontWeight: "700", lineHeight: 20 },
  fotosScroll:    { marginTop: 10 },
  fotosContainer: { gap: 12 },
  photoCard:      { backgroundColor: "#ffffff", borderRadius: 18, borderWidth: 1, borderColor: "#f8df8b", padding: 8 },
  fotoThumb:      { borderRadius: 12, height: 170, width: 240 },
  photoHint:      { color: "#64748b", fontSize: 13, lineHeight: 19 },
  photoCaption:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingTop: 8, paddingBottom: 3 },
  photoCaptionText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  warningBox:     {
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 14,
  },
  warningContent: { flex: 1 },
  warningTitle:   { color: "#92400e", fontWeight: "800", fontSize: 13, marginBottom: 4 },
  warningText:    { color: "#78350f", fontSize: 12, lineHeight: 18 },
  pdfBox: {
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    padding: 14,
  },
  pdfText: { color: "#166534", flex: 1, fontWeight: "700" },
  bottomBar: {
    backgroundColor: "#ffffff",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  signBtn:        { backgroundColor: "#0f172a", borderRadius: 28 },
  signBtnContent: { minHeight: 54 },
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
  modalHeading:   { flex: 1, minWidth: 0, paddingRight: 10 },
  modalTitle:     { color: "#0f172a", fontSize: 21, fontWeight: "900" },
  modalClose:     { width: 44, height: 44, borderRadius: 22, backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center" },
  modalContent:   { padding: 16, paddingBottom: 24 },
  modalSubtitle:  { color: "#475569", fontSize: 13, lineHeight: 20, marginBottom: 8 },
  signatureSummary: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "#FDC10B", backgroundColor: "#fffaf0" },
  signatureRecord: { color: "#0f172a", fontWeight: "800", fontSize: 16, marginBottom: 4 },

  // Canvas de firma
  signatureBox: {
    backgroundColor: "#ffffff",
    borderColor: "#FDC10B",
    borderRadius: 20,
    borderWidth: 1.5,
    height: 220,
    overflow: "hidden",
    marginTop: 8,
  },
  signaturePlaceholder: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  signaturePlaceholderText: { color: "#64748b", fontSize: 14 },
  clearBtn: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: "#e2e8f0",
  },
  clearBtnText:   { color: "#64748b", fontSize: 13, fontWeight: "700" },
});
