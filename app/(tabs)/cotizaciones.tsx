import { clearSession } from "@/services/auth/session";
import dayjs from "dayjs";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, DataTable, Text, TextInput } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";

type EstadoCotizacion = "borrador" | "enviada" | "aceptada" | "rechazada";
type TipoCotizacion =
  | "Cliente"
  | "Interna"
  | "Servicio"
  | "Mantencion"
  | "Otro";

type Cotizacion = {
  id: number;
  numero: string;
  fecha: string; // YYYY-MM-DD
  estado: EstadoCotizacion;
  tipo: TipoCotizacion;
  cliente: string;
  origen: string;
  total: number;
  moneda: "CLP" | "USD";
};

const MOCK: Cotizacion[] = [
  {
    id: 1,
    numero: "COT-2025-020",
    fecha: "2025-11-26",
    estado: "borrador",
    tipo: "Cliente",
    cliente: "3DENTAL SPA",
    origen: "BECK",
    total: 65405,
    moneda: "CLP",
  },
  {
    id: 2,
    numero: "COT-2025-021",
    fecha: "2025-11-20",
    estado: "enviada",
    tipo: "Servicio",
    cliente: "Hospital Sur",
    origen: "BECK",
    total: 1250000,
    moneda: "CLP",
  },
  {
    id: 3,
    numero: "COT-2025-022",
    fecha: "2025-11-18",
    estado: "aceptada",
    tipo: "Cliente",
    cliente: "Constructora Andes",
    origen: "BECK",
    total: 2450000,
    moneda: "CLP",
  },
];

const estados: EstadoCotizacion[] = [
  "borrador",
  "enviada",
  "aceptada",
  "rechazada",
];
const tipos: TipoCotizacion[] = [
  "Cliente",
  "Interna",
  "Servicio",
  "Mantencion",
  "Otro",
];
const origenes = ["BECK", "Directo"];

export default function CotizacionesScreen() {
  const [data] = useState<Cotizacion[]>(MOCK);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<
    EstadoCotizacion | undefined
  >();
  const [filtroOrigen, setFiltroOrigen] = useState<string | undefined>();
  const [filtroTipo, setFiltroTipo] = useState<TipoCotizacion | undefined>();
  const insets = useSafeAreaInsets();

  const filtradas = useMemo(() => {
    return data.filter((c) => {
      const q = search.toLowerCase();
      const okSearch =
        !q ||
        c.numero.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q) ||
        c.origen.toLowerCase().includes(q);
      const okEstado = !filtroEstado || c.estado === filtroEstado;
      const okOrigen = !filtroOrigen || c.origen === filtroOrigen;
      const okTipo = !filtroTipo || c.tipo === filtroTipo;
      return okSearch && okEstado && okOrigen && okTipo;
    });
  }, [data, search, filtroEstado, filtroOrigen, filtroTipo]);

  const kpis = useMemo(() => {
    const totalMonto = filtradas.reduce((acc, c) => acc + c.total, 0);
    const aceptadas = filtradas.filter((c) => c.estado === "aceptada").length;
    const enviadas = filtradas.filter((c) => c.estado === "enviada").length;
    const base = aceptadas + enviadas;
    const tasa = base === 0 ? 0 : Math.round((aceptadas / base) * 100);

    const hoy = dayjs();
    const vencen7 = filtradas.filter((c) => {
      const diff = dayjs(c.fecha).diff(hoy, "day");
      return diff >= 0 && diff <= 7;
    }).length;

    return {
      total: filtradas.length,
      totalMonto,
      tasa,
      vencen7,
    };
  }, [filtradas]);

  const badgeEstado = (estado: EstadoCotizacion) => {
    const colors: Record<EstadoCotizacion, string> = {
      borrador: "#fbbf24",
      enviada: "#60a5fa",
      aceptada: "#34d399",
      rechazada: "#f87171",
    };
    return (
      <Chip compact style={{ backgroundColor: colors[estado], marginRight: 8 }}>
        <Text style={{ color: "#0f172a", fontWeight: "700" }}>{estado}</Text>
      </Chip>
    );
  };

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
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <BrandHeader
          subtitle="Gestión comercial · BECK"
          onLogout={handleLogout}
        />
        <Text variant="titleLarge" style={styles.title}>
          Cotizaciones
        </Text>
        <Text style={styles.subtitle}>
          Gestion y seguimiento por cliente, origen, estado y tipo. Version
          movil.
        </Text>

        <TextInput
          mode="outlined"
          placeholder="Buscar cotizacion, cliente u origen..."
          value={search}
          onChangeText={setSearch}
          left={<TextInput.Icon icon="magnify" />}
          style={styles.input}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip
            icon="filter"
            selected={!filtroOrigen}
            onPress={() => setFiltroOrigen(undefined)}
          >
            Origen: Todos
          </Chip>
          {origenes.map((o) => (
            <Chip
              key={o}
              selected={filtroOrigen === o}
              onPress={() =>
                setFiltroOrigen(o === filtroOrigen ? undefined : o)
              }
            >
              {o}
            </Chip>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ gap: 8, marginTop: 8 }}
        >
          <Chip
            icon="filter"
            selected={!filtroEstado}
            onPress={() => setFiltroEstado(undefined)}
          >
            Estado: Todos
          </Chip>
          {estados.map((e) => (
            <Chip
              key={e}
              selected={filtroEstado === e}
              onPress={() =>
                setFiltroEstado(filtroEstado === e ? undefined : e)
              }
            >
              {e}
            </Chip>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={{ gap: 8, marginTop: 8 }}
        >
          <Chip
            icon="filter"
            selected={!filtroTipo}
            onPress={() => setFiltroTipo(undefined)}
          >
            Tipo: Todos
          </Chip>
          {tipos.map((t) => (
            <Chip
              key={t}
              selected={filtroTipo === t}
              onPress={() => setFiltroTipo(filtroTipo === t ? undefined : t)}
            >
              {t}
            </Chip>
          ))}
        </ScrollView>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Cotizaciones</Text>
              <Text style={styles.kpiValue}>{kpis.total}</Text>
              <Text style={styles.kpiHelper}>En la vista (filtros)</Text>
            </Card.Content>
          </Card>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Monto total</Text>
              <Text style={styles.kpiValue}>
                $ {kpis.totalMonto.toLocaleString("es-CL")}
              </Text>
              <Text style={styles.kpiHelper}>Solo CLP (mock)</Text>
            </Card.Content>
          </Card>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Tasa de exito</Text>
              <Text style={[styles.kpiValue, { color: "#22c55e" }]}>
                {kpis.tasa}%
              </Text>
              <Text style={styles.kpiHelper}>
                Aceptadas / (Aceptadas + Enviadas)
              </Text>
            </Card.Content>
          </Card>
          <Card style={styles.kpiCard}>
            <Card.Content>
              <Text style={styles.kpiLabel}>Vencen en 7 dias</Text>
              <Text style={styles.kpiValue}>{kpis.vencen7}</Text>
              <Text style={styles.kpiHelper}>Ideal para seguimiento</Text>
            </Card.Content>
          </Card>
        </View>

        {/* Tabla */}
        <Card style={styles.card}>
          <Card.Title title="Listado de cotizaciones" />
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <DataTable style={{ minWidth: 760 }}>
              <DataTable.Header>
                <DataTable.Title style={styles.colNum}>No.</DataTable.Title>
                <DataTable.Title style={styles.colFecha}>Fecha</DataTable.Title>
                <DataTable.Title style={styles.colEstado}>
                  Estado
                </DataTable.Title>
                <DataTable.Title style={styles.colTipo}>Tipo</DataTable.Title>
                <DataTable.Title style={styles.colCliente}>
                  Cliente
                </DataTable.Title>
                <DataTable.Title style={styles.colOrigen}>
                  Origen
                </DataTable.Title>
                <DataTable.Title numeric style={styles.colTotal}>
                  Total
                </DataTable.Title>
              </DataTable.Header>

              {filtradas.map((c) => (
                <DataTable.Row key={c.id}>
                  <DataTable.Cell style={styles.colNum}>
                    {c.numero}
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colFecha}>
                    {dayjs(c.fecha).format("DD-MM-YYYY")}
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colEstado}>
                    {badgeEstado(c.estado)}
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colTipo}>
                    {c.tipo}
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colCliente} numberOfLines={1}>
                    {c.cliente}
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.colOrigen}>
                    {c.origen}
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={styles.colTotal}>
                    {c.moneda === "CLP" ? "$" : "US$"}{" "}
                    {c.total.toLocaleString("es-CL")}
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
  input: {
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
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
  card: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  colNum: { width: 120 },
  colFecha: { width: 120 },
  colEstado: { width: 120 },
  colTipo: { width: 120 },
  colCliente: { width: 180 },
  colOrigen: { width: 120 },
  colTotal: { width: 140, justifyContent: "flex-end" },
});
