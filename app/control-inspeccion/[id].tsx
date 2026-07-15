import {
  ControlCorreccion,
  enviarCorreccionControlInspeccion,
  getControlCorreccionDetalle,
  uploadCorreccionParametroFotos,
} from "@/services/api/jefeobraApi";
import { formatShortDate } from "@/utils/registroEstado";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const MAX_FOTOS_POR_PARAMETRO = 5;

async function normalizeFoto(asset: ImagePicker.ImagePickerAsset) {
  const maxDim = Math.max(asset.width || 0, asset.height || 0);
  const resizeAction = maxDim > 1600
    ? (asset.width && asset.width >= (asset.height || 0)
      ? { resize: { width: 1600 } }
      : { resize: { height: 1600 } })
    : null;
  const processed = await ImageManipulator.manipulateAsync(
    asset.uri,
    resizeAction ? [resizeAction] : [],
    { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: processed.uri, name: `correccion-${Date.now()}.jpg`, type: "image/jpeg" };
}

export default function ControlInspeccionDetalleScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [control, setControl] = useState<ControlCorreccion | null>(null);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [subiendoFoto, setSubiendoFoto] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getControlCorreccionDetalle(id);
        setControl(data);
        const initialTextos: Record<string, string> = {};
        (data.controles_inspeccion_parametros || []).forEach((p) => {
          initialTextos[p.id] = p.correccion_observacion || "";
        });
        setTextos(initialTextos);
      } catch (err: any) {
        setError(err?.message || "No se pudo cargar el control de inspección");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAgregarFoto = async (parametroId: string, desdeGaleria: boolean) => {
    const parametro = control?.controles_inspeccion_parametros?.find((p) => p.id === parametroId);
    const actuales = parametro?.fotos_correccion_parametro?.length || 0;
    if (actuales >= MAX_FOTOS_POR_PARAMETRO) {
      Alert.alert("Límite alcanzado", `Puedes agregar hasta ${MAX_FOTOS_POR_PARAMETRO} fotografías por parámetro.`);
      return;
    }

    let asset: ImagePicker.ImagePickerAsset | null = null;

    if (desdeGaleria) {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Debes otorgar acceso a la galería.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (!result.canceled && result.assets.length > 0) asset = result.assets[0];
    } else {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Debes otorgar acceso a la cámara.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 1 });
      if (!result.canceled && result.assets.length > 0) asset = result.assets[0];
    }

    if (!asset) return;

    setSubiendoFoto((prev) => new Set(prev).add(parametroId));
    try {
      const foto = await normalizeFoto(asset);
      const fotosSubidas = await uploadCorreccionParametroFotos(parametroId, [foto]);
      setControl((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          controles_inspeccion_parametros: prev.controles_inspeccion_parametros?.map((p) =>
            p.id === parametroId
              ? { ...p, fotos_correccion_parametro: [...(p.fotos_correccion_parametro || []), ...fotosSubidas] }
              : p,
          ),
        };
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message || "No se pudo subir la fotografía");
    } finally {
      setSubiendoFoto((prev) => {
        const next = new Set(prev);
        next.delete(parametroId);
        return next;
      });
    }
  };

  const handleEnviarCorreccion = async () => {
    if (!control) return;
    Alert.alert(
      "Enviar corrección",
      "¿Confirmas que la corrección está lista para enviar a Ingeniería?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar",
          style: "default",
          onPress: async () => {
            try {
              setSaving(true);
              const parametros = Object.entries(textos).map(([parametroId, correccionObservacion]) => ({
                parametroId,
                correccionObservacion: correccionObservacion || undefined,
              }));
              await enviarCorreccionControlInspeccion(control.id, parametros);
              Alert.alert("Enviado", "La corrección fue enviada a Ingeniería.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (err: any) {
              Alert.alert("Error", err?.message || "No se pudo enviar la corrección");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  if (error || !control) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Control no encontrado"}</Text>
        <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 12 }}>
          Volver
        </Button>
      </View>
    );
  }

  const registro = control.registros_terreno;
  const yaEnviada = Boolean(control.correccion_enviada_at);
  const parametros = control.controles_inspeccion_parametros || [];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 8 }]} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.headerTitle}>Corregir control de inspección</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.infoCard}>
          <Text style={styles.obraNombre}>{registro?.obras?.nombre || "Sin obra"}</Text>
          <Text style={styles.infoMeta}>{registro?.obras?.codigo || "—"} · {formatShortDate(control.fecha)}</Text>
          {registro?.codigo_beck ? <Text style={styles.infoMeta}>Código BECK: {registro.codigo_beck}</Text> : null}
          <Text style={styles.ensayo}>{control.ensayo}</Text>
          {control.observacion ? <Text style={styles.infoMeta}>Observación general: {control.observacion}</Text> : null}
          {yaEnviada ? (
            <View style={styles.enviadaBadge}>
              <MaterialCommunityIcons name="check-circle-outline" size={16} color="#16a34a" />
              <Text style={styles.enviadaText}>Corrección ya enviada a Ingeniería</Text>
            </View>
          ) : null}
          {registro?.inspeccion_revision_estado === "rechazado" && registro?.motivo_rechazo_inspeccion ? (
            <View style={styles.rechazoBox}>
              <MaterialCommunityIcons name="alert-outline" size={16} color="#b91c1c" />
              <Text style={styles.rechazoText}>
                Ingeniería rechazó la corrección anterior: {registro.motivo_rechazo_inspeccion}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Parámetros ({parametros.length})</Text>

        {parametros.map((p) => (
          <View key={p.id} style={styles.paramCard}>
            <View style={styles.paramHeaderRow}>
              <Text style={styles.paramLabel} numberOfLines={3}>{p.parametro}</Text>
              <View
                style={[
                  styles.resultadoBadge,
                  p.resultado === "no_cumple" && styles.resultadoBadgeRed,
                  p.resultado === "no_aplica" && styles.resultadoBadgeGray,
                ]}
              >
                <Text style={styles.resultadoBadgeText}>
                  {p.resultado === "cumple" ? "✓ Cumple" : p.resultado === "no_cumple" ? "✗ No cumple" : "N/A"}
                </Text>
              </View>
            </View>

            {p.resultado === "no_cumple" && (
              <>
                {p.observacion ? (
                  <Text style={styles.observacionIngenieria}>
                    Observación de Ingeniería: {p.observacion}
                  </Text>
                ) : null}
                <TextInput
                  label="Cómo se corrigió"
                  value={textos[p.id] ?? ""}
                  onChangeText={(v) => setTextos((prev) => ({ ...prev, [p.id]: v }))}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.textoCorreccion}
                  editable={!yaEnviada}
                />
              </>
            )}

            {(p.fotos_correccion_parametro?.length || 0) > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosRow}>
                {p.fotos_correccion_parametro!.map((f) => (
                  <Image key={f.id} source={{ uri: f.url }} style={styles.fotoThumb} />
                ))}
              </ScrollView>
            )}

            {!yaEnviada && (
              <View style={styles.fotoBtnsRow}>
                <Button
                  mode="outlined"
                  onPress={() => handleAgregarFoto(p.id, true)}
                  icon="image-multiple-outline"
                  compact
                  loading={subiendoFoto.has(p.id)}
                  disabled={subiendoFoto.has(p.id)}
                  labelStyle={{ fontSize: 11 }}
                  style={styles.fotoBtnHalf}
                >
                  Galería
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleAgregarFoto(p.id, false)}
                  icon="camera-outline"
                  compact
                  loading={subiendoFoto.has(p.id)}
                  disabled={subiendoFoto.has(p.id)}
                  labelStyle={{ fontSize: 11 }}
                  style={styles.fotoBtnHalf}
                >
                  Cámara
                </Button>
              </View>
            )}
          </View>
        ))}

        {!yaEnviada && (
          <Button
            mode="contained"
            onPress={handleEnviarCorreccion}
            loading={saving}
            disabled={saving}
            icon="send"
            style={styles.enviarBtn}
          >
            Enviar a Ingeniería
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb", padding: 16 },
  errorText: { color: "#b91c1c", textAlign: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: { fontWeight: "700", color: "#0f172a" },
  scroll: { padding: 16 },
  infoCard: { backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 14 },
  obraNombre: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  infoMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  ensayo: { marginTop: 8, fontSize: 14, color: "#334155", fontWeight: "600" },
  enviadaBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  enviadaText: { color: "#16a34a", fontSize: 12, fontWeight: "600" },
  rechazoBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 10, backgroundColor: "#fef2f2", borderRadius: 8, padding: 8 },
  rechazoText: { flex: 1, color: "#b91c1c", fontSize: 12 },
  sectionTitle: { marginTop: 18, marginBottom: 6, fontSize: 14, fontWeight: "700", color: "#0f172a" },
  paramCard: { backgroundColor: "#ffffff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12, marginBottom: 10 },
  paramHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  paramLabel: { flex: 1, fontSize: 13, color: "#0f172a" },
  resultadoBadge: { backgroundColor: "#dcfce7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  resultadoBadgeRed: { backgroundColor: "#fee2e2" },
  resultadoBadgeGray: { backgroundColor: "#e2e8f0" },
  resultadoBadgeText: { fontSize: 11, fontWeight: "700", color: "#0f172a" },
  observacionIngenieria: { marginTop: 8, fontSize: 12, color: "#b91c1c", fontStyle: "italic" },
  textoCorreccion: { marginTop: 8, backgroundColor: "#ffffff" },
  fotosRow: { marginTop: 8 },
  fotoThumb: { width: 64, height: 64, borderRadius: 8, marginRight: 6 },
  fotoBtnsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  fotoBtnHalf: { flex: 1 },
  enviarBtn: { marginTop: 8, marginBottom: 12 },
});
