import { clearSession } from "@/services/auth/session";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { Card, Chip, DataTable, Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";
import { useRegistros } from "../../context/RegistrosContext";

type TramoEspuma = {
  id: string;
  tramo: string;
  piso: string;
  metros: number;
  cuadrilla: string;
  fecha: string;
};

const TRAMOS_ESPUMA: TramoEspuma[] = [
  {
    id: "1",
    tramo: "JL-ESP-001",
    piso: "Piso 1",
    metros: 12.5,
    cuadrilla: "Equipo espuma 1",
    fecha: "30-11-2025",
  },
  {
    id: "2",
    tramo: "JL-ESP-010",
    piso: "Piso 2",
    metros: 8.3,
    cuadrilla: "Equipo espuma 2",
    fecha: "02-12-2025",
  },
  {
    id: "3",
    tramo: "JL-ESP-020",
    piso: "Subterráneo -1",
    metros: 15.1,
    cuadrilla: "Equipo espuma 1",
    fecha: "03-12-2025",
  },
];

const screenWidth = Dimensions.get("window").width - 48;

export default function ReportesScreen() {
  const { registros } = useRegistros();
  const insets = useSafeAreaInsets();

  const stats = useMemo(() => {
    const totalSellos = registros.length;
    const equipos = new Set(registros.map((r) => r.equipo)).size;
    const pisos = new Set(registros.map((r) => r.piso)).size;
    const promedio =
      totalSellos === 0 ? 0 : totalSellos / Math.max(1, registros.length);

    const agrupadoPorSellador: Record<string, number> = {};
    registros.forEach((r) => {
      agrupadoPorSellador[r.equipo] = (agrupadoPorSellador[r.equipo] || 0) + 1;
    });

    const chartSelladores = Object.entries(agrupadoPorSellador).map(
      ([name, value]) => ({ name, value }),
    );

    const agrupadoPorPiso: Record<string, number> = {};
    registros.forEach((r) => {
      agrupadoPorPiso[r.piso] = (agrupadoPorPiso[r.piso] || 0) + 1;
    });

    const chartPisos = Object.entries(agrupadoPorPiso).map(
      ([name, value], idx) => ({
        name,
        value,
        color: ["#22c55e", "#3b82f6", "#f97316", "#a855f7"][idx % 4],
        legendFontColor: "#1f2937",
        legendFontSize: 12,
      }),
    );

    const metrosEspuma = TRAMOS_ESPUMA.reduce((acc, t) => acc + t.metros, 0);
    const cuadrillasEspuma = new Set(TRAMOS_ESPUMA.map((t) => t.cuadrilla))
      .size;

    return {
      totalSellos,
      equipos,
      pisos,
      promedio,
      chartSelladores,
      chartPisos,
      metrosEspuma,
      cuadrillasEspuma,
      tramos: TRAMOS_ESPUMA,
    };
  }, [registros]);

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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        <BrandHeader
          subtitle="Analítica de obra · BECK"
          onLogout={handleLogout}
        />
        <Text variant="titleLarge" style={styles.title}>
          Reportes de obra · Sellos y junta lineal ESPUMA
        </Text>
        <Text style={styles.subtitle}>
          KPIs rápidos, barras y distribución por piso; incluye cubicación de
          junta lineal espuma.
        </Text>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Sellos totales</Text>
              <Text style={styles.kpiValue}>{stats.totalSellos}</Text>
              <Text style={styles.kpiHelper}>Puntos registrados</Text>
            </Card.Content>
          </Card>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Selladores / equipos</Text>
              <Text style={styles.kpiValue}>{stats.equipos}</Text>
              <Text style={styles.kpiHelper}>Con registros asignados</Text>
            </Card.Content>
          </Card>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Pisos con avance</Text>
              <Text style={styles.kpiValue}>{stats.pisos}</Text>
              <Text style={styles.kpiHelper}>Ya intervenidos</Text>
            </Card.Content>
          </Card>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Promedio sellos / registro</Text>
              <Text style={[styles.kpiValue, { color: "#22c55e" }]}>
                {stats.promedio.toFixed(1)}
              </Text>
              <Text style={styles.kpiHelper}>Eficiencia operativa</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Gráficos selladores/pisos */}
        <View style={styles.chartGrid}>
          <Card style={styles.card}>
            <Card.Title title="Sellos por sellador / equipo" />
            <Card.Content style={styles.chartContainer}>
              <BarChart
                data={{
                  labels: stats.chartSelladores.map((c) => c.name),
                  datasets: [
                    { data: stats.chartSelladores.map((c) => c.value) },
                  ],
                }}
                width={screenWidth}
                height={220}
                fromZero
                showBarTops
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Title title="Distribución de sellos por piso" />
            <Card.Content style={styles.chartContainer}>
              <PieChart
                data={stats.chartPisos.map((p) => ({
                  name: p.name,
                  population: p.value,
                  color: p.color,
                  legendFontColor: p.legendFontColor,
                  legendFontSize: p.legendFontSize,
                }))}
                width={screenWidth}
                height={220}
                accessor="population"
                backgroundColor="transparent"
                chartConfig={chartConfig}
                paddingLeft="12"
              />
            </Card.Content>
          </Card>
        </View>

        {/* Junta espuma */}
        <Card style={styles.card}>
          <Card.Title
            title="Junta lineal · ESPUMA"
            left={() => <Chip style={styles.chip}>JL</Chip>}
          />
          <Card.Content>
            <View style={styles.kpiRow}>
              <View style={styles.kpiMini}>
                <Text style={styles.kpiLabel}>Metros lineales</Text>
                <Text style={styles.kpiValue}>
                  {stats.metrosEspuma.toFixed(1)} m
                </Text>
              </View>
              <View style={styles.kpiMini}>
                <Text style={styles.kpiLabel}>Tramos</Text>
                <Text style={styles.kpiValue}>{stats.tramos.length}</Text>
              </View>
              <View style={styles.kpiMini}>
                <Text style={styles.kpiLabel}>Cuadrillas</Text>
                <Text style={styles.kpiValue}>{stats.cuadrillasEspuma}</Text>
              </View>
            </View>

            <Text style={styles.helperText}>Metros por piso</Text>
            <View style={styles.chartContainer}>
              <BarChart
                data={{
                  labels: stats.tramos.map((t) => t.piso),
                  datasets: [{ data: stats.tramos.map((t) => t.metros) }],
                }}
                width={screenWidth}
                height={220}
                fromZero
                showBarTops
                chartConfig={chartConfig}
                style={styles.chart}
              />
            </View>

            <Text
              style={[styles.helperText, { marginTop: 12, marginBottom: 4 }]}
            >
              Tramos registrados
            </Text>
            <FlatList
              data={stats.tramos}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={{ gap: 12, paddingVertical: 6 }}
              renderItem={({ item }) => (
                <Card style={styles.tramoCard}>
                  <Card.Content>
                    <Text variant="labelLarge" style={styles.tramoTitle}>
                      {item.tramo}
                    </Text>
                    <Text style={styles.tramoMeta}>{item.piso}</Text>
                    <Text style={styles.tramoMeta}>
                      {item.metros} m · {item.cuadrilla}
                    </Text>
                    <Text style={styles.tramoMetaSmall}>
                      Fecha: {item.fecha}
                    </Text>
                  </Card.Content>
                </Card>
              )}
            />
          </Card.Content>
        </Card>

        {/* Resumen itemizado BECK / SACYR */}
        <Card style={styles.card}>
          <Card.Title title="Resumen por itemizado BECK" />
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <DataTable style={{ minWidth: 680 }}>
              <DataTable.Header>
                <DataTable.Title style={styles.colCodigo}>
                  Codigo
                </DataTable.Title>
                <DataTable.Title style={styles.colDescripcion}>
                  Descripcion
                </DataTable.Title>
                <DataTable.Title numeric style={styles.colSellos}>
                  Sellos
                </DataTable.Title>
                <DataTable.Title numeric style={styles.colPond}>
                  Ponderado
                </DataTable.Title>
              </DataTable.Header>
              {registros.map((r) => (
                <DataTable.Row key={`${r.id}-beck`}>
                  <DataTable.Cell
                    style={styles.colCodigo}
                  >{`BECK-${r.id.toString().padStart(3, "0")}`}</DataTable.Cell>
                  <DataTable.Cell
                    style={styles.colDescripcion}
                    numberOfLines={1}
                  >
                    {r.obra}
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.colSellos}>
                    1
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.colPond}>
                    1.0
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </ScrollView>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Resumen por itemizado SACYR" />
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <DataTable style={{ minWidth: 680 }}>
              <DataTable.Header>
                <DataTable.Title style={styles.colCodigo}>
                  Codigo
                </DataTable.Title>
                <DataTable.Title style={styles.colDescripcion}>
                  Descripcion
                </DataTable.Title>
                <DataTable.Title numeric style={styles.colSellos}>
                  Sellos
                </DataTable.Title>
                <DataTable.Title numeric style={styles.colPond}>
                  Ponderado
                </DataTable.Title>
              </DataTable.Header>
              {registros.map((r) => (
                <DataTable.Row key={`${r.id}-sacyr`}>
                  <DataTable.Cell
                    style={styles.colCodigo}
                  >{`SACYR-${r.id.toString().padStart(3, "0")}`}</DataTable.Cell>
                  <DataTable.Cell
                    style={styles.colDescripcion}
                    numberOfLines={1}
                  >
                    {r.obra}
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.colSellos}>
                    1
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.colPond}>
                    1.0
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </ScrollView>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#0f172a",
  backgroundGradientTo: "#0f172a",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(226, 232, 240, ${opacity})`,
  fillShadowGradient: "#38bdf8",
  fillShadowGradientOpacity: 0.8,
  propsForLabels: { fontSize: 10 },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
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
    color: "#64748b",
    fontSize: 12,
  },
  chartGrid: {
    gap: 10,
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRadius: 16,
  },
  chart: {
    borderRadius: 8,
    marginTop: 6,
  },
  chartContainer: {
    alignItems: "center",
  },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  kpiMini: {
    flex: 1,
  },
  chip: {
    backgroundColor: "#1d4ed8",
    alignSelf: "flex-start",
  },
  helperText: {
    color: "#475569",
    marginTop: 8,
  },
  tramoCard: {
    backgroundColor: "#111827",
    borderColor: "#1f2937",
    borderWidth: 1,
    width: 200,
    borderRadius: 14,
  },
  tramoTitle: {
    color: "#38bdf8",
    fontWeight: "700",
    marginBottom: 4,
  },
  tramoMeta: {
    color: "#e2e8f0",
    fontSize: 12,
    marginBottom: 2,
  },
  tramoMetaSmall: {
    color: "#cbd5e1",
    fontSize: 11,
  },
  colCodigo: { width: 140 },
  colDescripcion: { width: 220 },
  colSellos: { width: 90, justifyContent: "flex-end" },
  colPond: { width: 110, justifyContent: "flex-end" },
});
