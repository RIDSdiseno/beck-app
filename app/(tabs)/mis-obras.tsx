import { getMisObras, ObraApi } from "@/services/api/obrasApi";
import { saveSelectedObra } from "@/services/auth/session";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";

function getEstadoLabel(estado?: string | null) {
  switch (estado) {
    case "activa":
      return "Activa";
    case "pausada":
      return "Pausada";
    case "finalizada":
      return "Finalizada";
    default:
      return "Sin estado";
  }
}

function getEstadoBg(estado?: string | null) {
  switch (estado) {
    case "activa":
      return "#16a34a";
    case "pausada":
      return "#f59e0b";
    case "finalizada":
      return "#64748b";
    default:
      return "#475569";
  }
}

export default function MisObrasScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [obras, setObras] = useState<ObraApi[]>([]);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const loadObras = useCallback(async () => {
    try {
      setError("");
      const data = await getMisObras();
      setObras(data);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar las obras");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadObras();
      setLoading(false);
    };

    init();
  }, [loadObras]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadObras();
    setRefreshing(false);
  };

  const onSelectObra = async (obra: ObraApi) => {
    try {
      setSelectingId(obra.id);

      await saveSelectedObra({
        id: obra.id,
        nombre: obra.nombre,
        codigo: obra.codigo,
        descripcion: obra.descripcion,
        estado: obra.estado,
      });

      router.replace("/registros");
    } catch (err) {
      console.log("SELECT OBRA ERROR", err);
    } finally {
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.helper}>Cargando tus obras...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorTitle}>No se pudieron cargar las obras</Text>
        <Text style={styles.errorText}>{error}</Text>

        <Button
          mode="contained"
          onPress={loadObras}
          style={styles.retryButton}
          contentStyle={styles.retryButtonContent}
          labelStyle={styles.retryButtonLabel}
        >
          Reintentar
        </Button>
      </View>
    );
  }

  if (!obras.length) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyTitle}>No tienes obras asignadas</Text>
        <Text style={styles.helper}>
          Cuando el administrador te asigne una obra, aparecerá aquí.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Mis Obras
      </Text>

      <Text style={styles.subtitle}>
        Selecciona la obra con la que vas a trabajar hoy.
      </Text>

      <FlatList
        data={obras}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.topRow}>
                <Text style={styles.cardTitle}>{item.nombre}</Text>

                <Chip
                  style={[
                    styles.chip,
                    { backgroundColor: getEstadoBg(item.estado) },
                  ]}
                  textStyle={styles.chipText}
                >
                  {getEstadoLabel(item.estado)}
                </Chip>
              </View>

              <Text style={styles.cardLabel}>Código</Text>
              <Text style={styles.cardValue}>{item.codigo}</Text>

              <Text style={styles.cardLabel}>Descripción</Text>
              <Text style={styles.cardValue}>
                {item.descripcion || "Sin descripción"}
              </Text>

              <Button
                mode="contained"
                onPress={() => onSelectObra(item)}
                loading={selectingId === item.id}
                disabled={selectingId === item.id}
                style={styles.selectButton}
                contentStyle={styles.selectButtonContent}
                labelStyle={styles.selectButtonLabel}
              >
                {selectingId === item.id
                  ? "Seleccionando..."
                  : "Usar esta obra"}
              </Button>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    color: "#0f172a",
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
  },
  chip: {
    borderRadius: 14,
  },
  chipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  cardLabel: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardValue: {
    marginTop: 2,
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
  },
  selectButton: {
    marginTop: 16,
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
  selectButtonContent: {
    minHeight: 46,
  },
  selectButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  centerBox: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  helper: {
    marginTop: 12,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  errorTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    color: "#dc2626",
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
  retryButtonContent: {
    minHeight: 46,
  },
  retryButtonLabel: {
    fontWeight: "700",
  },
});
