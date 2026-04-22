import { clearSession } from "@/services/auth/session";
import { router } from "expo-router";
import { MotiView } from "moti";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, SegmentedButtons, Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";
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
      const target = mapa.get(r.equipo) || {
        piso: r.piso,
        sellos: 0,
        factor: 1,
      };
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

  const handleLogout = async () => {
    try {
      await clearSession();
      router.replace("/login");
    } catch (error) {
      console.log("LOGOUT ERROR", error);
    }
  };

  const fadeIn = (delay = 0) => ({
    from: { opacity: 0, translateY: 12 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: "timing", duration: 280, delay },
  });

  const kpiCards = [
    {
      label: "Sellos ejecutados",
      value: kpis.sellos,
      color: "#22c55e",
      helper: `Acumulado (${timeRange})`,
      progress: "70%",
    },
    {
      label: "Sellos ponderados",
      value: kpis.ponderados,
      color: "#f97316",
      helper: "Incluye holgura (mock)",
      progress: "60%",
    },
    {
      label: "Produccion de la vista",
      value: kpis.produccionVista,
      color: "#eab308",
      helper: "Registros en la vista",
      progress: "40%",
    },
    {
      label: "Frentes activos",
      value: kpis.frentes,
      color: "#38bdf8",
      helper: "Equipos operando",
      progress: "30%",
    },
  ];

  return (
    <SafeAreaView
      className="bg-[#f5f7fb]"
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <MotiView {...fadeIn(0)}>
          <BrandHeader
            subtitle="Obra demo - CRM BECK"
            onLogout={handleLogout}
          />
        </MotiView>

        <MotiView {...fadeIn(60)}>
          <Text variant="titleLarge" style={styles.title}>
            Centro de mando de la obra
          </Text>
          <Text style={styles.subtitle}>
            Controla el avance de sellos y juntas por rango de tiempo, piso y
            equipo.
          </Text>
        </MotiView>

        <MotiView {...fadeIn(90)}>
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
        </MotiView>

        <View style={styles.kpiGrid}>
          {kpiCards.map((item, idx) => (
            <MotiView key={item.label} {...fadeIn(120 + idx * 60)}>
              <Card style={[styles.kpiCard, styles.cardShadow]}>
                <Card.Content>
                  <Text style={styles.kpiLabel}>{item.label}</Text>
                  <Text style={[styles.kpiValue, { color: item.color }]}>
                    {item.value}
                  </Text>
                  <Text style={styles.kpiHelper}>{item.helper}</Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: item.progress, backgroundColor: item.color },
                      ]}
                    />
                  </View>
                </Card.Content>
              </Card>
            </MotiView>
          ))}
        </View>

        <MotiView {...fadeIn(180)}>
          <Card style={[styles.card, styles.cardShadow]}>
            <Card.Title title="Mapa rapido de la obra" />
            <Card.Content>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                {pisos.map((p) => (
                  <Card
                    key={p.label}
                    style={[styles.pisoCard, styles.cardShadow]}
                  >
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: "#f97316" }}>
                        {p.label}
                      </Text>
                      <Text style={styles.metricValue}>{p.sellos} sellos</Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${p.progress}%`,
                              backgroundColor: "#f97316",
                            },
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
        </MotiView>

        <MotiView {...fadeIn(220)}>
          <Card style={[styles.card, styles.cardShadow]}>
            <Card.Title title="Rendimiento por equipo" />
            <Card.Content>
              {equipos.map((eq, idx) => (
                <MotiView key={eq.nombre} {...fadeIn(240 + idx * 40)}>
                  <View style={styles.equipoRow}>
                    <View>
                      <Text style={styles.equipoNombre}>{eq.nombre}</Text>
                      <Text style={styles.helperTextSmall}>
                        {eq.piso} ・ {eq.sellos} sellos
                      </Text>
                    </View>
                    <Chip style={styles.chipSecondary} compact>
                      F prom: {eq.factor.toFixed(2)}
                    </Chip>
                  </View>
                </MotiView>
              ))}
            </Card.Content>
          </Card>
        </MotiView>
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
    borderRadius: 12,
  },
  cardShadow: {
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
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
    borderRadius: 16,
  },
  pisoCard: {
    width: 180,
    marginRight: 10,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 12,
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
