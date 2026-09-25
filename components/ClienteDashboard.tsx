import React from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ObraCliente } from "@/services/api/clienteApi";
import {
  resumirObrasCliente,
  sumarSellosCliente,
  type ClienteObraFiltro,
} from "@/utils/clienteObras";

type Props = {
  name: string;
  obras: ObraCliente[] | null;
  refreshing: boolean;
  error: string;
  onRefresh: () => void;
};

const openObras = (filtro: ClienteObraFiltro = "todas") =>
  router.navigate({ pathname: "/(tabs)/cliente", params: { filtro } });

export function ClienteDashboard({
  name,
  obras,
  refreshing,
  error,
  onRefresh,
}: Props) {
  const summary = resumirObrasCliente(obras || []);
  const available = obras !== null;
  const cantidadSellos = obras === null ? null : sumarSellosCliente(obras);
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="account-check-outline"
              size={26}
              color="#0f172a"
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>Panel del cliente</Text>
            <Text style={styles.greeting}>
              Hola, {name.trim().split(/\s+/)[0] || "Cliente"}
            </Text>
            <Text style={styles.heroHint}>
              Revisa el avance y las validaciones de tus obras.
            </Text>
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f97316"
            colors={["#f97316"]}
          />
        }
      >
        {!!error && (
          <View style={styles.error} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
            {available && (
              <Text style={styles.muted}>
                Se muestra la última información cargada.
              </Text>
            )}
            <Button
              onPress={onRefresh}
              disabled={refreshing}
              textColor="#c2410c"
            >
              Reintentar
            </Button>
          </View>
        )}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => openObras()}
            style={({ pressed }) => [
              styles.quickAction,
              styles.darkAction,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="office-building-outline"
              size={22}
              color="#FDC10B"
            />
            <Text style={styles.whiteActionText}>Mis obras</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/historial")}
            style={({ pressed }) => [
              styles.quickAction,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons name="history" size={22} color="#0f172a" />
            <Text style={styles.actionText}>Historial</Text>
          </Pressable>
        </View>
        <View style={[styles.metric, styles.sealsMetric]}>
          <View style={styles.sectionHeading}>
            <View style={[styles.metricIcon, styles.sealsIcon]}>
              <MaterialCommunityIcons name="fire" size={26} color="#7c3aed" />
            </View>
            <View style={styles.flex}>
              <Text style={styles.metricLabel}>Cantidad de sellos</Text>
            </View>
          </View>
          <Text style={styles.metricValue} accessibilityLabel={cantidadSellos === null ? "Cantidad de sellos no disponible" : `${cantidadSellos} sellos aprobados por Ingeniería`}>
            {cantidadSellos === null ? "—" : cantidadSellos.toLocaleString("es-CL")}
          </Text>
          {obras && obras.length > 0 && (
            <Text style={styles.metricHint}>
              {obras.length === 1
                ? `Correspondientes de la obra "${obras[0].nombre}"`
                : `Correspondientes de las obras ${obras.map((obra) => `"${obra.nombre}"`).join(", ")}`}
            </Text>
          )}
          {available && cantidadSellos === null && (
            <Text style={styles.metricHint}>Este indicador requiere la actualización del backend.</Text>
          )}
        </View>

        <View style={styles.metrics}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${available ? summary.pendientes : "Sin datos"} registros pendientes de validación. Ver obras.`}
            onPress={() => openObras("pendientes")}
            style={({ pressed }) => [
              styles.metric,
              styles.pendingMetric,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIcon, styles.pendingIcon]}>
                <MaterialCommunityIcons
                  name="clipboard-clock-outline"
                  size={23}
                  color="#0f172a"
                />
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9a7100"
              />
            </View>
            <Text style={styles.metricValue}>
              {available ? summary.pendientes : "—"}
            </Text>
            <Text style={styles.metricLabel}>Registros Pendientes</Text>
            <Text style={styles.metricHint}>De validación del cliente</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${available ? summary.validados : "Sin datos"} registros validados por el cliente. Ver obras.`}
            onPress={() => openObras("validadas")}
            style={({ pressed }) => [
              styles.metric,
              styles.validatedMetric,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.metricTop}>
              <View style={[styles.metricIcon, styles.validatedIcon]}>
                <MaterialCommunityIcons
                  name="check-decagram-outline"
                  size={23}
                  color="#16a34a"
                />
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#16a34a"
              />
            </View>
            <Text style={styles.metricValue}>
              {available ? summary.validados : "—"}
            </Text>
            <Text style={styles.metricLabel}>Validados</Text>
            <Text style={styles.metricHint}>Con validación del cliente</Text>
          </Pressable>
        </View>

        {available && (
          <>
            <View style={styles.progressCard}>
              <View style={styles.sectionHeading}>
                <View style={[styles.metricIcon, styles.pendingIcon]}>
                  <MaterialCommunityIcons
                    name="chart-donut"
                    size={23}
                    color="#0f172a"
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.sectionTitle}>Avance de validación</Text>
                  <Text style={styles.muted}>
                    {summary.total
                      ? `${summary.validados} de ${summary.total} registros validados por el cliente`
                      : "Aún no hay registros disponibles para validar."}
                  </Text>
                </View>
              </View>
              <View
                style={styles.progressTrack}
                accessibilityRole="progressbar"
                accessibilityLabel="Avance de validación del cliente"
                accessibilityValue={{ min: 0, max: 100, now: summary.avance }}
              >
                <View
                  style={[styles.progressFill, { width: `${summary.avance}%` }]}
                />
              </View>
              <View style={styles.progressBottom}>
                <Text style={styles.progressCaption}>
                  {summary.obras}{" "}
                  {summary.obras === 1 ? "obra asignada" : "obras asignadas"}
                </Text>
                <Text style={styles.percentage}>{summary.avance}%</Text>
              </View>
            </View>
            <View style={styles.focusCard}>
              <MaterialCommunityIcons
                name={
                  summary.pendientes
                    ? "clipboard-search-outline"
                    : "information-outline"
                }
                size={25}
                color="#c2410c"
              />
              <View style={styles.flex}>
                <Text style={styles.sectionTitle}>
                  {summary.pendientes
                    ? "Por revisar"
                    : "Seguimiento de tus obras"}
                </Text>
                <Text style={styles.muted}>
                  {summary.pendientes
                    ? `Tienes registros pendientes en ${summary.obrasPendientes} ${summary.obrasPendientes === 1 ? "obra" : "obras"}. Revisa su información y fotografías antes de validar.`
                    : summary.obras === 0
                      ? "Cuando te asignen una obra, podrás consultar sus registros desde Mis obras."
                      : "No hay registros pendientes de tu validación. Puedes consultar los anteriores en el historial."}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb", paddingTop: 2 },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 8 : 0,
    paddingBottom: 12,
  },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  flex: { flex: 1, minWidth: 0 },
  hero: {
    backgroundColor: "#0f172a",
    borderColor: "#FDC10B",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#FDC10B",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: "#FDC10B",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  greeting: { color: "#fff", fontWeight: "900", fontSize: 21, marginTop: 3 },
  heroHint: { color: "#cbd5e1", fontSize: 12, lineHeight: 17, marginTop: 4 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickAction: {
    flex: 1,
    minWidth: 125,
    minHeight: 48,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#FDC10B",
  },
  darkAction: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  actionText: { color: "#0f172a", fontWeight: "800", fontSize: 14 },
  whiteActionText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    flex: 1,
    minWidth: 130,
    borderRadius: 18,
    borderWidth: 1,
    borderTopWidth: 5,
    padding: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  pendingMetric: { backgroundColor: "#fffaf0", borderColor: "#FDC10B" },
  sealsMetric: { flex: 0, backgroundColor: "#faf5ff", borderColor: "#d8b4fe", borderTopColor: "#7c3aed" },
  sealsIcon: { backgroundColor: "#ede9fe" },
  validatedMetric: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    borderTopColor: "#16a34a",
  },
  metricTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingIcon: { backgroundColor: "#FDC10B" },
  validatedIcon: { backgroundColor: "#dcfce7" },
  metricValue: {
    color: "#0f172a",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 12,
  },
  metricLabel: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  metricHint: { color: "#64748b", fontSize: 11, lineHeight: 16, marginTop: 4 },
  progressCard: {
    borderRadius: 18,
    borderColor: "#FDC10B",
    borderWidth: 1,
    borderLeftWidth: 4,
    backgroundColor: "#fffdf7",
    padding: 16,
    gap: 14,
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  muted: { color: "#64748b", fontSize: 12, lineHeight: 18 },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#16a34a", borderRadius: 5 },
  progressBottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressCaption: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  percentage: { color: "#15803d", fontSize: 18, fontWeight: "900" },
  focusCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  error: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  errorText: { color: "#b91c1c", fontWeight: "700" },
  pressed: { opacity: 0.75 },
});
