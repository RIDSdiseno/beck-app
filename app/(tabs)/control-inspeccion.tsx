import { ControlCorreccion, getControlesPendientesCorreccion } from "@/services/api/jefeobraApi";
import { formatShortDate } from "@/utils/registroEstado";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";

export default function ControlInspeccionScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [controles, setControles] = useState<ControlCorreccion[]>([]);

  const loadData = useCallback(async () => {
    try {
      setError("");
      const data = await getControlesPendientesCorreccion();
      setControles(data);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el módulo de control de inspección");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        setLoading(true);
        await loadData();
        if (active) setLoading(false);
      };
      init();
      return () => {
        active = false;
      };
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.helper}>Cargando controles...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      <View style={styles.brandHeader}>
        <BrandHeader subtitle="Control de inspección · Correcciones" />
      </View>
      <Text style={styles.subtitle}>
        Controles de inspección marcados &quot;No conforme&quot; por Ingeniería que necesitan corrección.
      </Text>

      {error ? (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={loadData} style={styles.retryBtn}>
              Reintentar
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      <Text style={styles.countLabel}>
        {controles.length} {controles.length === 1 ? "control pendiente" : "controles pendientes"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <FlatList
        ListHeaderComponent={renderHeader}
        data={controles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Sin correcciones pendientes</Text>
            <Text style={styles.emptyText}>
              No hay controles de inspección esperando corrección en este momento.
            </Text>
          </View>
        }
        renderItem={({ item }) => <ControlCard control={item} />}
      />
    </SafeAreaView>
  );
}

function ControlCard({ control }: { control: ControlCorreccion }) {
  const registro = control.registros_terreno;

  return (
    <TouchableOpacity
      onPress={() => router.push(`/control-inspeccion/${control.registro_terreno_id}` as any)}
      activeOpacity={0.85}
    >
      <Card style={styles.card}>
        <View style={styles.cardAccent} />
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="clipboard-alert-outline" size={22} color="#0f172a" />
            </View>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.obraNombre} numberOfLines={1}>
                {registro?.obras?.nombre || "Sin obra"}
              </Text>
              <View style={styles.badgeRow}>
                <Text style={styles.codeBadge}>{registro?.obras?.codigo || "Sin código"}</Text>
                <Text style={styles.warningBadge}>Requiere corrección</Text>
              </View>
            </View>
          </View>
          <Text style={styles.cardEnsayo} numberOfLines={2}>
            {control.ensayo}
          </Text>
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fecha</Text>
              <Text style={styles.detailValue}>{formatShortDate(control.fecha)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Piso</Text>
              <Text style={styles.detailValue}>{registro?.piso || "—"}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Nº sello</Text>
              <Text style={styles.detailValue}>{registro?.numero_sello || "—"}</Text>
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterText}>
              {registro?.codigo_beck ? `Código BECK: ${registro.codigo_beck}` : "Abrir detalle de corrección"}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#0f172a" />
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  helper: { marginTop: 8, color: "#64748b" },
  brandHeader: { marginHorizontal: 16 },
  title: { marginTop: 12, marginHorizontal: 16, fontWeight: "700", color: "#0f172a" },
  subtitle: { marginTop: 4, marginHorizontal: 16, color: "#64748b", fontSize: 13 },
  countLabel: { marginTop: 14, marginHorizontal: 16, marginBottom: 6, color: "#475569", fontSize: 12, fontWeight: "600" },
  listContent: { paddingBottom: 24 },
  card: { marginHorizontal: 16, marginTop: 10, borderRadius: 16, backgroundColor: "#fffaf0", borderColor: "#FDC10B", borderWidth: 1, overflow: "hidden" },
  cardAccent: { position: "absolute", top: 0, bottom: 0, left: 0, width: 5, backgroundColor: "#dc2626" },
  cardContent: { paddingHorizontal: 14, paddingVertical: 12 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FDC10B", alignItems: "center", justifyContent: "center" },
  cardTitleGroup: { flex: 1 },
  obraNombre: { fontSize: 15, fontWeight: "900", color: "#0f172a" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 5 },
  codeBadge: { overflow: "hidden", borderRadius: 999, backgroundColor: "#0f172a", color: "#ffffff", fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 3 },
  warningBadge: { overflow: "hidden", borderRadius: 999, backgroundColor: "#fee2e2", color: "#dc2626", fontSize: 10, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 3 },
  cardEnsayo: { marginTop: 10, fontSize: 13, fontWeight: "700", color: "#334155" },
  detailsRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  detailItem: { flex: 1, backgroundColor: "rgba(253, 193, 11, 0.14)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 },
  detailLabel: { color: "#92400e", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  detailValue: { color: "#0f172a", fontSize: 12, fontWeight: "800", marginTop: 2 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopColor: "#fde68a", borderTopWidth: 1, marginTop: 10, paddingTop: 8 },
  cardFooterText: { flex: 1, color: "#475569", fontSize: 11, fontWeight: "600" },
  errorCard: { marginHorizontal: 16, marginTop: 10, backgroundColor: "#fef2f2" },
  errorText: { color: "#b91c1c", marginBottom: 8 },
  retryBtn: { alignSelf: "flex-start" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { marginTop: 10, fontWeight: "700", color: "#334155" },
  emptyText: { marginTop: 4, textAlign: "center", color: "#94a3b8", fontSize: 13 },
});
