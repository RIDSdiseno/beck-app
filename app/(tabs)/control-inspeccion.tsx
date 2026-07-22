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
      <BrandHeader subtitle="Control de inspección · Correcciones" />
      <Text variant="titleLarge" style={styles.title}>
        Correcciones pendientes
      </Text>
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
        <Card.Content>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTitleGroup}>
              <Text style={styles.obraNombre} numberOfLines={1}>
                {registro?.obras?.nombre || "Sin obra"}
              </Text>
              <Text style={styles.obraMeta}>
                {registro?.obras?.codigo || "—"} · {formatShortDate(control.fecha)}
              </Text>
            </View>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#dc2626" />
          </View>
          <Text style={styles.cardEnsayo} numberOfLines={2}>
            {control.ensayo}
          </Text>
          {registro?.codigo_beck ? (
            <Text style={styles.obraMeta}>Código BECK: {registro.codigo_beck}</Text>
          ) : null}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f5f7fb" },
  helper: { marginTop: 8, color: "#64748b" },
  title: { marginTop: 12, marginHorizontal: 16, fontWeight: "700", color: "#0f172a" },
  subtitle: { marginTop: 4, marginHorizontal: 16, color: "#64748b", fontSize: 13 },
  countLabel: { marginTop: 14, marginHorizontal: 16, marginBottom: 6, color: "#475569", fontSize: 12, fontWeight: "600" },
  listContent: { paddingBottom: 24 },
  card: { marginHorizontal: 16, marginTop: 10, borderRadius: 14, backgroundColor: "#ffffff" },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardTitleGroup: { flex: 1, marginRight: 8 },
  obraNombre: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  obraMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardEnsayo: { marginTop: 8, fontSize: 13, color: "#334155" },
  errorCard: { marginHorizontal: 16, marginTop: 10, backgroundColor: "#fef2f2" },
  errorText: { color: "#b91c1c", marginBottom: 8 },
  retryBtn: { alignSelf: "flex-start" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { marginTop: 10, fontWeight: "700", color: "#334155" },
  emptyText: { marginTop: 4, textAlign: "center", color: "#94a3b8", fontSize: 13 },
});
