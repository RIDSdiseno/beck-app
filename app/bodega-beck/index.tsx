import React, { useCallback, useRef, useState } from "react";
import {
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { bodegaRequest, revisionBodega } from "@/services/api/bodegaBeckApi";
import { BodegaListFooter, bodegaStyles as s } from "@/components/BodegaBeckUI";

const indicadores = [
  {
    key: "epp",
    label: "EPP disponibles",
    icon: "hard-hat",
    color: "#a67400",
    bg: "#fffbeb",
    border: "#ffc400",
  },
  {
    key: "implementos",
    label: "Implementos disponibles",
    icon: "toolbox-outline",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#60a5fa",
  },
  {
    key: "herramientas",
    label: "Herramientas disponibles",
    icon: "tools",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#a78bfa",
  },
  {
    key: "pendientes",
    label: "Devoluciones por recibir",
    icon: "clock-outline",
    color: "#c2410c",
    bg: "#fff7ed",
    border: "#fb923c",
  },
] as const;

export default function BodegaInicio() {
  const [data, setData] = useState<Record<string, number>>({}),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const revision = useRef(-1),
    busy = useRef(false);
  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      setData(await bodegaRequest("/resumen"));
      revision.current = revisionBodega();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (revision.current !== revisionBodega()) void load();
    }, [load]),
  );
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} />
        }
        contentContainerStyle={s.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="warehouse"
              size={32}
              color="#0f172a"
            />
          </View>
          <View style={styles.grow}>
            <Text style={styles.eyebrow}>BECK · BODEGA CENTRAL</Text>
            <Text style={styles.heroTitle}>Control de bodega</Text>
            <Text style={styles.heroText}>
              Existencias, entregas y devoluciones en un solo lugar.
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/bodega-beck/escanear")}
          style={({ pressed }) => [
            styles.scanButton,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            name="barcode-scan"
            size={28}
            color="#0f172a"
          />
          <View style={styles.grow}>
            <Text style={styles.scanTitle}>Escanear un artículo</Text>
            <Text style={styles.scanHint}>
              Consulta su ubicación y responsable
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={23}
            color="#0f172a"
          />
        </Pressable>
        <Text style={styles.sectionTitle}>Resumen de existencias</Text>
        <View style={styles.grid}>
          {indicadores.map((indicator) => (
            <View
              key={indicator.key}
              style={[
                styles.stat,
                {
                  backgroundColor: indicator.bg,
                  borderTopColor: indicator.border,
                },
              ]}
            >
              <View style={styles.statIcon}>
                <MaterialCommunityIcons
                  name={indicator.icon}
                  size={24}
                  color={indicator.color}
                />
              </View>
              <Text
                style={[
                  styles.statValue,
                  {
                    color:
                      indicator.key === "pendientes"
                        ? indicator.color
                        : "#0f172a",
                  },
                ]}
              >
                {data[indicator.key] ?? "—"}
              </Text>
              <Text style={styles.statLabel}>{indicator.label}</Text>
            </View>
          ))}
        </View>
        {!!data.pendientes && (
          <View style={styles.notice}>
            <MaterialCommunityIcons
              name="information-outline"
              size={22}
              color="#c2410c"
            />
            <Text style={styles.noticeText}>
              Hay devoluciones pendientes. Confirma su recepción física desde
              Asignaciones para reintegrar el stock.
            </Text>
          </View>
        )}
        <Text style={styles.sectionTitle}>Gestionar bodega</Text>
        <View style={styles.grid}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/bodega-beck/inventario")}
            style={({ pressed }) => [
              styles.shortcut,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={27}
              color="#9a7100"
            />
            <Text style={styles.shortcutTitle}>Inventario</Text>
            <Text style={styles.shortcutHint}>
              Artículos y ajustes de stock
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={21}
              color="#0f172a"
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/bodega-beck/asignaciones")}
            style={({ pressed }) => [
              styles.shortcut,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons
              name="account-hard-hat"
              size={27}
              color="#9a7100"
            />
            <Text style={styles.shortcutTitle}>Asignaciones</Text>
            <Text style={styles.shortcutHint}>
              Entregas, devoluciones y trazabilidad
            </Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={21}
              color="#0f172a"
            />
          </Pressable>
        </View>
        {(loading || !!error) && (
          <BodegaListFooter
            loading={loading && !Object.keys(data).length}
            error={error}
            retry={() => void load()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#0f172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ffc400",
    padding: 20,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffc400",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#ffc400",
  },
  heroTitle: { color: "#fff", fontSize: 23, fontWeight: "800", marginTop: 5 },
  heroText: { color: "#cbd5e1", fontSize: 12, lineHeight: 18, marginTop: 6 },
  scanButton: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 16,
    borderRadius: 19,
    backgroundColor: "#ffc400",
  },
  scanTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  scanHint: { fontSize: 11, color: "#574500", lineHeight: 16, marginTop: 3 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    flexBasis: "46%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderTopWidth: 4,
    borderRadius: 19,
    padding: 14,
    gap: 7,
  },
  statIcon: {
    width: 38,
    height: 38,
    backgroundColor: "#ffffffb3",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  statValue: { fontSize: 30, fontWeight: "900" },
  statLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    lineHeight: 18,
  },
  notice: {
    flexDirection: "row",
    gap: 9,
    padding: 14,
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
  },
  noticeText: { flex: 1, color: "#9a3412", fontSize: 12, lineHeight: 18 },
  shortcut: {
    flexBasis: "46%",
    flexGrow: 1,
    padding: 15,
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#e6dfc5",
  },
  shortcutTitle: { color: "#0f172a", fontSize: 15, fontWeight: "800" },
  shortcutHint: { color: "#64748b", fontSize: 12, lineHeight: 18, flexGrow: 1 },
  pressed: { opacity: 0.75 },
});
