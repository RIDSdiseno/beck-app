import { getClienteRegistrosObra, RegistroCliente } from "@/services/api/clienteApi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Chip, Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ClienteObraScreen() {
  const insets = useSafeAreaInsets();
  const { obraId } = useLocalSearchParams<{ obraId: string }>();

  const [registros, setRegistros] = useState<RegistroCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!obraId) return;
    try {
      setError("");
      const data = await getClienteRegistrosObra(obraId);
      setRegistros(data);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar los registros");
    }
  }, [obraId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        setLoading(true);
        await load();
        if (active) setLoading(false);
      };
      init();
      return () => { active = false; };
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 2 }]} edges={["top", "left", "right"]}>
      <View style={styles.fixedHeader}>
        <View style={styles.headerRow}>
          <BrandHeader subtitle="Registros pendientes · BECK" />
          <Button mode="text" onPress={() => router.back()} compact>
            Volver
          </Button>
        </View>
        <Text variant="titleLarge" style={styles.title}>
          Registros pendientes
        </Text>
        <Text style={styles.subtitle}>
          {registros.length === 0
            ? "Esta obra no tiene registros validados por ingeniería disponibles para tu firma."
            : `${registros.length} ${registros.length === 1 ? "registro validado por ingeniería requiere" : "registros validados por ingeniería requieren"} tu firma.`}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={load} style={styles.retryBtn}>Reintentar</Button>
          </View>
        ) : null}

        {registros.length === 0 && !error ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-off-outline" size={52} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Sin registros disponibles</Text>
            <Text style={styles.emptyText}>
              Ingeniería aún no ha validado registros en esta obra o todos ya fueron firmados por ti.
            </Text>
          </View>
        ) : null}

        {registros.map((registro) => {
          const isJunta = registro.tipoRegistro === "junta_lineal_espuma";
          const unidades = isJunta
            ? (registro.metrosLineales != null ? `${registro.metrosLineales} m` : "-")
            : `${registro.cantidadSellos} sellos`;

          return (
            <Pressable
              key={registro.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => router.push(`/cliente/registro/${registro.id}?obraId=${obraId}`)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIconBox}>
                  <MaterialCommunityIcons
                    name={isJunta ? "ruler" : "shield-outline"}
                    size={22}
                    color="#f97316"
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {registro.codigoBeck || `Registro ${registro.id.slice(0, 6).toUpperCase()}`}
                  </Text>
                  <Text style={styles.cardMeta}>{formatDate(registro.fecha)}</Text>
                </View>
                <Chip
                  compact
                  style={styles.pendienteChip}
                  textStyle={styles.pendienteChipText}
                >
                  Pendiente
                </Chip>
              </View>

              <View style={styles.cardDetail}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Tipo</Text>
                  <Text style={styles.detailValue}>{isJunta ? "Junta Lineal" : "Sello Cortafuego"}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Piso</Text>
                  <Text style={styles.detailValue}>{registro.piso}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Módulo</Text>
                  <Text style={styles.detailValue}>{registro.modulo}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Unidades</Text>
                  <Text style={styles.detailValue}>{unidades}</Text>
                </View>
              </View>

              {registro.descripcionMaterial ? (
                <Text style={styles.material} numberOfLines={1}>{registro.descripcionMaterial}</Text>
              ) : null}

              <View style={styles.signRow}>
                <MaterialCommunityIcons name="draw-pen" size={14} color="#2563eb" />
                <Text style={styles.signHint}>Toca para ver el detalle y firmar</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: "#f5f7fb" },
  fixedHeader: { backgroundColor: "#f5f7fb", paddingBottom: 8, paddingHorizontal: 16 },
  headerRow:   { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  content:     { paddingHorizontal: 16, paddingBottom: 88, paddingTop: 4 },
  center:      { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  title:       { color: "#0f172a", marginBottom: 4 },
  subtitle:    { color: "#475569", lineHeight: 20, marginBottom: 14 },
  errorBox:    { backgroundColor: "#fff7ed", borderColor: "#fed7aa", borderRadius: 14, borderWidth: 1, marginBottom: 12, padding: 14 },
  errorText:   { color: "#dc2626", fontWeight: "700", marginBottom: 10 },
  retryBtn:    { backgroundColor: "#f97316", borderRadius: 12 },
  emptyState:  { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle:  { color: "#0f172a", fontSize: 18, fontWeight: "800" },
  emptyText:   { color: "#64748b", fontSize: 14, textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  pressed:         { opacity: 0.85 },
  cardHeader:      { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 12 },
  cardIconBox:     { alignItems: "center", backgroundColor: "#fff7ed", borderRadius: 12, height: 44, justifyContent: "center", width: 44 },
  cardInfo:        { flex: 1 },
  cardTitle:       { color: "#0f172a", fontSize: 15, fontWeight: "800" },
  cardMeta:        { color: "#64748b", fontSize: 12, marginTop: 2 },
  pendienteChip:   { backgroundColor: "#fef3c7", borderRadius: 10 },
  pendienteChipText: { color: "#d97706", fontSize: 11, fontWeight: "800" },
  cardDetail:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  detailItem:      { backgroundColor: "#f8fafc", borderRadius: 8, padding: 8, minWidth: "46%" },
  detailLabel:     { color: "#94a3b8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  detailValue:     { color: "#0f172a", fontSize: 13, fontWeight: "800", marginTop: 2 },
  material:        { color: "#475569", fontSize: 13, lineHeight: 18, marginBottom: 10 },
  signRow:         { alignItems: "center", flexDirection: "row", gap: 6 },
  signHint:        { color: "#2563eb", fontSize: 12, fontWeight: "700" },
});
