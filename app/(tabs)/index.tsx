import React, { useMemo, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Text, Chip, SegmentedButtons } from "react-native-paper";
import { useRegistros } from "../../context/RegistrosContext";

export default function DashboardScreen() {
  const { registros } = useRegistros();
  const [timeRange, setTimeRange] = useState("hoy");
  const insets = useSafeAreaInsets();

  const pisos = useMemo(() => {
    const mapa = new Map<string, number>();
    registros.forEach((r) => {
      mapa.set(r.piso, (mapa.get(r.piso) || 0) + 1);
    });
    const max = Math.max(...Array.from(mapa.values()), 1);
    return Array.from(mapa.entries()).map(([label, sellos]) => ({
      label,
      sellos,
      progress: Math.round((sellos / max) * 100),
    }));
  }, [registros]);

  const equipos = useMemo(() => {
    const mapa = new Map<
      string,
      { piso?: string; sellos: number; factor: number }
    >();
    registros.forEach((r) => {
      const target = mapa.get(r.equipo) || { piso: r.piso, sellos: 0, factor: 1 };
      target.sellos += 1;
      target.piso = target.piso || r.piso;
      target.factor = 1 + (target.sellos % 4) * 0.06; // mock factor
      mapa.set(r.equipo, target);
    });
    return Array.from(mapa.entries()).map(([nombre, v]) => ({
      nombre,
      piso: v.piso || "-",
      sellos: v.sellos,
      factor: v.factor,
    }));
  }, [registros]);

  const kpis = {
    sellos: registros.length,
    ponderados: registros.length,
    produccionVista: registros.length,
    frentes: equipos.length,
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text variant="titleLarge" style={styles.title}>
          Centro de mando de la obra
        </Text>
        <Text style={styles.subtitle}>
          Controla el avance de sellos y juntas por rango de tiempo, piso y equipo.
        </Text>

        <SegmentedButtons
          value={timeRange}
          onValueChange={setTimeRange}
          buttons={[
            { value: "hoy", label: "Hoy" },
            { value: "semana", label: "Semana" },
            { value: "mes", label: "Mes" },
            { value: "obra", label: "Obra completa" },
          ]}
          style={{ marginBottom: 12 }}
        />

        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Sellos ejecutados</Text>
              <Text style={[styles.kpiValue, { color: "#22c55e" }]}>
                {kpis.sellos}
              </Text>
              <Text style={styles.kpiHelper}>Acumulado ({timeRange})</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "70%", backgroundColor: "#22c55e" }]} />
              </View>
            </Card.Content>
          </Card>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Sellos ponderados</Text>
              <Text style={[styles.kpiValue, { color: "#f97316" }]}>
                {kpis.ponderados}
              </Text>
              <Text style={styles.kpiHelper}>Incluye holgura (mock)</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "60%", backgroundColor: "#f97316" }]} />
              </View>
            </Card.Content>
          </Card>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Producción de la vista</Text>
              <Text style={[styles.kpiValue, { color: "#eab308" }]}>
                {kpis.produccionVista}
              </Text>
              <Text style={styles.kpiHelper}>Registros en la vista</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "40%", backgroundColor: "#eab308" }]} />
              </View>
            </Card.Content>
          </Card>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Frentes activos</Text>
              <Text style={[styles.kpiValue, { color: "#38bdf8" }]}>
                {kpis.frentes}
              </Text>
              <Text style={styles.kpiHelper}>Equipos operando</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: "30%", backgroundColor: "#38bdf8" }]} />
              </View>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.card}>
          <Card.Title title="Mapa rápido de la obra" />
          <Card.Content>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              {pisos.map((p) => (
                <Card key={p.label} style={styles.pisoCard}>
                  <Card.Content>
                    <Text variant="labelSmall" style={{ color: "#f97316" }}>
                      {p.label}
                    </Text>
                    <Text style={styles.metricValue}>{p.sellos} sellos</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${p.progress}%`, backgroundColor: "#f97316" },
                        ]}
                      />
                    </View>
                    <Text style={styles.helperTextSmall}>
                      Avance estimado: {p.progress}%
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Rendimiento por equipo" />
          <Card.Content>
            {equipos.map((eq) => (
              <View key={eq.nombre} style={styles.equipoRow}>
                <View>
                  <Text style={styles.equipoNombre}>{eq.nombre}</Text>
                  <Text style={styles.helperTextSmall}>
                    {eq.piso} · {eq.sellos} sellos
                  </Text>
                </View>
                <Chip style={styles.chipSecondary} compact>
                  F prom: {eq.factor.toFixed(2)}
                </Chip>
              </View>
            ))}
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
  title: {
    color: "#0f172a",
    marginBottom: 4,
    paddingHorizontal: 0,
  },
  subtitle: {
    color: "#0f172a",
    marginBottom: 14,
    fontWeight: "500",
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    flexBasis: "48%",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  kpiLabel: {
    color: "#475569",
    fontSize: 12,
  },
  kpiValue: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "700",
  },
  kpiHelper: {
    color: "#475569",
    fontSize: 12,
    marginBottom: 6,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  chipSecondary: {
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    alignSelf: "center",
  },
  card: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  pisoCard: {
    width: 180,
    marginRight: 10,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  progressBar: {
    height: 6,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  equipoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  equipoNombre: {
    color: "#0f172a",
    fontWeight: "700",
  },
  helperTextSmall: {
    color: "#64748b",
    fontSize: 11,
  },
});
