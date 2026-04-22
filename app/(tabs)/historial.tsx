import { clearSession } from "@/services/auth/session";
import { router } from "expo-router";
import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Card, Chip, Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";
import { useHistorial } from "../../context/HistorialContext";

const tipoColor = {
  registro: "#22c55e",
  edicion: "#3b82f6",
  borrado: "#ef4444",
  cotizacion: "#f97316",
  reporte: "#8b5cf6",
} as const;

export default function HistorialScreen() {
  const insets = useSafeAreaInsets();
  const { movimientos } = useHistorial();

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
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      edges={["top", "left", "right"]}
    >
      <FlatList
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            <BrandHeader
              subtitle="Bitácora de acciones · BECK"
              onLogout={handleLogout}
            />
            <Text variant="titleLarge" style={styles.title}>
              Historial de acuerdos
            </Text>
            <Text style={styles.subtitle}>
              Registro de movimientos recientes en la app: creación, edición,
              borrado, cotizaciones y reportes.
            </Text>
          </View>
        }
        data={movimientos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Sin movimientos</Text>
            <Text style={styles.itemMeta}>
              Aún no hay acciones registradas.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Text style={styles.itemTitle}>{item.titulo}</Text>
                <Chip
                  compact
                  style={[
                    styles.chip,
                    { backgroundColor: tipoColor[item.tipo] || "#0ea5e9" },
                  ]}
                  textStyle={styles.chipText}
                >
                  {item.tipo}
                </Chip>
              </View>
              <Text style={styles.itemDetail}>{item.detalle}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.itemMeta}>{item.fecha}</Text>
                <Text style={styles.itemMeta}>{item.usuario}</Text>
              </View>
            </Card.Content>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  headerWrapper: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 12,
  },
  card: {
    marginBottom: 10,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
  },
  itemTitle: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 16,
    flex: 1,
    marginRight: 10,
    flexShrink: 1,
    flexWrap: "wrap",
  },
  itemDetail: {
    color: "#0f172a",
    fontSize: 14,
    marginTop: 4,
    marginBottom: 6,
    flexWrap: "wrap",
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  itemMeta: {
    color: "#64748b",
    fontSize: 12,
    flexShrink: 1,
  },
  chip: {
    borderRadius: 14,
    height: 32,
    paddingHorizontal: 10,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  chipText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
    textTransform: "capitalize",
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#0f172a",
    fontWeight: "700",
    marginBottom: 4,
  },
});
