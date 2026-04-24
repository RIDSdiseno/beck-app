import { getSelectedObra } from "@/services/auth/session";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

type ObraSeleccionada = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  estado?: string | null;
};

export default function RegistrosScreen() {
  const [obra, setObra] = useState<ObraSeleccionada | null>(null);

  useEffect(() => {
    const loadSelectedObra = async () => {
      const currentObra = await getSelectedObra();
      setObra(currentObra);
    };

    loadSelectedObra();
  }, []);

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Registros
      </Text>

      {!obra ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.emptyTitle}>No hay obra seleccionada</Text>
            <Text style={styles.emptyText}>
              Primero debes seleccionar una obra antes de registrar información.
            </Text>

            <Button
              mode="contained"
              onPress={() => router.replace("/mis-obras")}
              style={styles.button}
            >
              Ir a Mis Obras
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.label}>Obra seleccionada</Text>
            <Text style={styles.value}>{obra.nombre}</Text>

            <Text style={styles.label}>Código</Text>
            <Text style={styles.value}>{obra.codigo}</Text>

            <Text style={styles.label}>Estado</Text>
            <Text style={styles.value}>{obra.estado || "Sin estado"}</Text>
          </Card.Content>
        </Card>
      )}
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
    marginBottom: 16,
  },
  card: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  value: {
    marginTop: 4,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
});
