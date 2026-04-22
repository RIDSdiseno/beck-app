import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Text,
} from "react-native-paper";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getMisObras, Obra } from "../../services/api/obrasApi";


function colorEstado(estado: Obra["estado"]) {
  switch (estado) {
    case "EN_EJECUCION":
      return "#16a34a";
    case "PLANIFICADA":
      return "#2563eb";
    case "PAUSADA":
      return "#f59e0b";
    case "FINALIZADA":
      return "#64748b";
    default:
      return "#0f172a";
  }
}

export default function MisObrasScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState<Obra[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getMisObras();
        setObras(data);
      } catch (err: any) {
        setError(err?.message || "No se pudieron cargar las obras");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const seleccionarObra = async (obra: Obra) => {
    await AsyncStorage.setItem("beck_obra_seleccionada", JSON.stringify(obra));
    router.push("/(tabs)");
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Mis Obras
        </Text>
        <Text style={styles.subtitle}>
          Selecciona la obra asignada para continuar con tus registros.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Cargando obras...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={obras}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.rowTop}>
                  <Text style={styles.cardTitle}>{item.nombre}</Text>
                  <Chip
                    style={[
                      styles.chip,
                      { backgroundColor: colorEstado(item.estado) },
                    ]}
                    textStyle={styles.chipText}
                  >
                    {item.estado.replace("_", " ")}
                  </Chip>
                </View>

                <Text style={styles.cardText}>{item.direccion}</Text>
                <Text style={styles.cardText}>
                  Supervisor: {item.supervisor}
                </Text>

                <Button
                  mode="contained"
                  onPress={() => seleccionarObra(item)}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  Seleccionar obra
                </Button>
              </Card.Content>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    color: "#0f172a",
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
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
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: {
    flex: 1,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "700",
  },
  cardText: {
    color: "#475569",
    fontSize: 14,
    marginBottom: 6,
  },
  chip: {
    borderRadius: 14,
  },
  chipText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  button: {
    marginTop: 12,
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
  buttonContent: {
    minHeight: 46,
  },
  buttonLabel: {
    fontWeight: "700",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#475569",
  },
  errorText: {
    color: "#dc2626",
    textAlign: "center",
    fontWeight: "600",
  },
});
