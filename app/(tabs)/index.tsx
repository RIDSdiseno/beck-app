import {
  getMisRegistros,
  RegistroHistorialApi,
} from "@/services/api/registrosApi";
import { getSession } from "@/services/auth/session";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
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
import { BrandHeader } from "../../components/BrandHeader";

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
}

function getRegistroKind(registro: RegistroHistorialApi) {
  return registro.tipo_registro === "junta_lineal_espuma"
    ? "Junta Lineal"
    : "Sello";
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [registros, setRegistros] = useState<RegistroHistorialApi[]>([]);

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    try {
      setError("");
      const [session, data] = await Promise.all([
        getSession(),
        getMisRegistros(forceRefresh),
      ]);
      setUserName(session.user?.nombre || "Usuario Beck");
      setRegistros(data);
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el inicio");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const init = async () => {
        setLoading(true);
        await loadDashboard();
        if (isActive) setLoading(false);
      };

      init();

      return () => {
        isActive = false;
      };
    }, [loadDashboard]),
  );

  const metrics = useMemo(() => {
    const sellos = registros
      .filter((registro) => registro.tipo_registro !== "junta_lineal_espuma")
      .reduce((total, registro) => total + (registro.cantidad_sellos || 0), 0);
    const enRevision = registros.filter(
      (registro) => registro.estado === "en_revision",
    ).length;
    const validados = registros.filter(
      (registro) => registro.estado === "validado",
    ).length;
    const pendientes = registros.filter(
      (registro) => registro.estado === "pendiente",
    ).length;
    const rechazados = registros.filter(
      (registro) => registro.estado === "rechazado",
    ).length;
    const total = registros.length;
    const avance = total ? Math.round((validados / total) * 100) : 0;

    const obraMap = new Map<string, number>();
    registros.forEach((registro) => {
      const obra = registro.obras?.nombre || "Sin obra";
      obraMap.set(obra, (obraMap.get(obra) || 0) + 1);
    });
    const obraPrincipal =
      Array.from(obraMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Sin actividad";

    return {
      sellos,
      enRevision,
      validados,
      pendientes,
      rechazados,
      total,
      avance,
      obraPrincipal,
    };
  }, [registros]);

  const recientes = useMemo(() => registros.slice(0, 4), [registros]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard(true);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.helper}>Cargando inicio...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <BrandHeader subtitle="Inicio · BECK" />

        <Text variant="titleLarge" style={styles.title}>
          Hola, {userName.split(" ")[0] || "equipo"}
        </Text>
        <Text style={styles.subtitle}>
          Resumen de tus registros en terreno y el avance validado por
          ingeniería.
        </Text>

        {error ? (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
              <Button
                mode="contained"
                onPress={() => loadDashboard(true)}
                style={styles.button}
              >
                Reintentar
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={24}
                color="#f97316"
              />
              <Text style={styles.kpiValue}>{metrics.sellos}</Text>
              <Text style={styles.kpiLabel}>Sellos realizados</Text>
            </Card.Content>
          </Card>

          <Card style={styles.kpiCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="timer-sand"
                size={24}
                color="#3b82f6"
              />
              <Text style={styles.kpiValue}>{metrics.enRevision}</Text>
              <Text style={styles.kpiLabel}>En revisión</Text>
            </Card.Content>
          </Card>

          <Card style={styles.kpiCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="check-decagram-outline"
                size={24}
                color="#16a34a"
              />
              <Text style={styles.kpiValue}>{metrics.validados}</Text>
              <Text style={styles.kpiLabel}>Validados</Text>
            </Card.Content>
          </Card>

          <Card style={styles.kpiCard}>
            <Card.Content>
              <MaterialCommunityIcons
                name="close-octagon-outline"
                size={24}
                color="#dc2626"
              />
              <Text style={styles.kpiValue}>{metrics.rechazados}</Text>
              <Text style={styles.kpiLabel}>Rechazados</Text>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Pulso de avance</Text>
                <Text style={styles.helperText}>
                  {metrics.avance}% de tus registros ya fue validado.
                </Text>
              </View>
              <Chip style={styles.orangeChip} textStyle={styles.chipText}>
                {metrics.total} registros
              </Chip>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(metrics.avance, 4)}%` },
                ]}
              />
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusItem}>Pendientes: {metrics.pendientes}</Text>
              <Text style={styles.statusItem}>Rechazados: {metrics.rechazados}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Foco sugerido</Text>
            <Text style={styles.focusText}>
              Tu obra con más actividad es {metrics.obraPrincipal}. Prioriza
              revisar los registros en revisión para acelerar validaciones.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Últimos movimientos</Text>
              <Button mode="text" onPress={() => router.push("/historial")}>
                Ver historial
              </Button>
            </View>

            {recientes.length ? (
              recientes.map((registro) => (
                <View key={registro.id} style={styles.recentRow}>
                  <View style={styles.recentIcon}>
                    <MaterialCommunityIcons
                      name={
                        registro.tipo_registro === "junta_lineal_espuma"
                          ? "ruler"
                          : "shield-outline"
                      }
                      size={20}
                      color="#f97316"
                    />
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentTitle}>
                      {getRegistroKind(registro)} · {registro.obras?.nombre || "Sin obra"}
                    </Text>
                    <Text style={styles.helperText}>
                      {formatDate(registro.fecha)} · {registro.estado.replace("_", " ")}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.helperText}>
                Aún no tienes registros. Cuando envíes uno, aparecerá aquí.
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 88,
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 14,
    lineHeight: 20,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiValue: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 8,
  },
  kpiLabel: {
    color: "#475569",
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  errorCard: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  helperText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
  },
  focusText: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  orangeChip: {
    backgroundColor: "#f97316",
  },
  chipText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  progressTrack: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    height: 10,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: "#16a34a",
    height: "100%",
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  statusItem: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  recentRow: {
    alignItems: "center",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 12,
  },
  recentIcon: {
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    color: "#0f172a",
    fontWeight: "700",
  },
  centerBox: {
    alignItems: "center",
    backgroundColor: "#f5f7fb",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  helper: {
    color: "#475569",
    marginTop: 12,
  },
  errorText: {
    color: "#dc2626",
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#f97316",
    borderRadius: 14,
    marginTop: 12,
  },
});
