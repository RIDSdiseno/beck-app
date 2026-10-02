import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getAdminAvance,
  getAdminAvanceObras,
  type AdminAvance,
  type GrupoAvance,
  type ObraAvance,
  type PeriodoAvance,
} from "@/services/api/adminApi";
import {
  getHistorialRegistroDetalle,
  type RegistroHistorialApi,
} from "@/services/api/registrosApi";
import { formatDateOnly, formatTime24WithPeriod } from "@/utils/dateTime";
import { SelectSheet } from "./SelectSheet";
import { RegistroHistoryDetailModal } from "./RegistroHistoryDetailModal";

const periodos: { value: PeriodoAvance; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "todo", label: "Todo" },
];
const numero = (value: number) =>
  value.toLocaleString("es-CL", { maximumFractionDigits: 2 });
const estados: Record<string, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  validado: "Validado",
  rechazado: "Rechazado",
};
const tipos: Record<string, string> = {
  sello_cortafuego: "Sello cortafuego",
  junta_lineal_espuma: "Junta lineal",
  tabiqueria: "Tabiquería",
  otros: "Otros",
};
const iconosTipo: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>["name"]> = {
  sello_cortafuego: "fire",
  junta_lineal_espuma: "ruler",
  tabiqueria: "wall",
  otros: "clipboard-text-outline",
};

function ProduccionGrupo({
  title,
  items,
  total,
  icon,
}: {
  title: string;
  items: GrupoAvance[];
  total: number;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {total > items.length && (
        <Text style={styles.muted}>
          Los {items.length} principales de {total}, por número de registros.
        </Text>
      )}
      {!items.length && (
        <Text style={styles.muted}>Sin producción en este período.</Text>
      )}
      {items.map((item) => (
        <View key={item.nombre} style={styles.groupRow}>
          <View style={styles.flex}>
            <View style={styles.groupHeading}>
              {icon && (
                <MaterialCommunityIcons
                  name={icon}
                  size={19}
                  color="#c2410c"
                  accessible={false}
                />
              )}
              <Text style={[styles.groupName, styles.flex]}>{item.nombre}</Text>
            </View>
            <Text style={styles.muted}>{numero(item.registros)} registros</Text>
          </View>
          <View style={styles.groupAmounts}>
            <Text style={styles.amount}>{numero(item.sellos)} sellos</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function AdminDashboard({ name }: { name: string }) {
  const [obras, setObras] = useState<ObraAvance[] | null>(null);
  const [obraId, setObraId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<PeriodoAvance>("todo");
  const [data, setData] = useState<AdminAvance | null>(null);
  const [error, setError] = useState("");
  const [obrasError, setObrasError] = useState("");
  const [retry, setRetry] = useState(0);
  const [obrasRetry, setObrasRetry] = useState(0);
  const [pendingKey, setPendingKey] = useState("");
  const [detail, setDetail] = useState<RegistroHistorialApi | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const detailRequest = useRef(0);
  const key = `${obraId}:${periodo}:${retry}`;
  const [settledKey, setSettledKey] = useState("");
  const currentData =
    data?.obra.id === obraId && data?.periodo === periodo ? data : null;
  const loading = Boolean(obraId && settledKey !== key);

  useEffect(() => {
    let active = true;
    getAdminAvanceObras()
      .then((rows) => {
        if (!active) return;
        setObras(rows);
        setObrasError("");
      })
      .catch((err: Error) => {
        if (active) setObrasError(err.message);
      });
    return () => {
      active = false;
    };
  }, [obrasRetry]);

  useEffect(() => {
    if (!obraId) return;
    let active = true;
    getAdminAvance(obraId, periodo)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setSettledKey(key);
      });
    return () => {
      active = false;
    };
  }, [obraId, periodo, key]);

  useEffect(
    () => () => {
      detailRequest.current += 1;
    },
    [],
  );

  const refresh = () => {
    setError("");
    setObrasRetry((value) => value + 1);
    setRetry((value) => value + 1);
  };
  const changeScope = () => {
    setError("");
    setDetail(null);
    setDetailLoading(null);
    detailRequest.current += 1;
  };
  const openDetail = async (id: string) => {
    const request = ++detailRequest.current;
    setDetailLoading(id);
    try {
      const result = await getHistorialRegistroDetalle(id);
      if (detailRequest.current === request) setDetail(result);
    } catch (err) {
      if (detailRequest.current === request)
        Alert.alert(
          "No se pudo abrir el registro",
          err instanceof Error ? err.message : "Intenta nuevamente",
        );
    } finally {
      if (detailRequest.current === request) setDetailLoading(null);
    }
  };
  const metrics = currentData
    ? [
        {
          title: "Pendientes de Supervisor",
          value: currentData.resumen.pendientesSupervisor,
          color: "#d99a00",
          bg: "#fffaf0",
          icon: "clipboard-clock-outline" as const,
        },
        {
          title: "En revisión por Ingeniería",
          value: currentData.resumen.enRevision,
          color: "#3b82f6",
          bg: "#eff6ff",
          icon: "send-clock-outline" as const,
        },
        {
          title: "Validados por Ingeniería",
          value: currentData.resumen.validados,
          color: "#16a34a",
          bg: "#f0fdf4",
          icon: "check-decagram-outline" as const,
        },
        {
          title: "Correcciones pendientes",
          value: currentData.resumen.correcciones,
          color: "#dc2626",
          bg: "#fff1f2",
          icon: "file-refresh-outline" as const,
        },
      ]
    : [];

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="chart-box-outline"
              size={27}
              color="#0f172a"
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>AVANCE POR OBRA</Text>
            <Text style={styles.greeting}>
              Hola, {name.trim().split(/\s+/)[0] || "Administrador"}
            </Text>
          </View>
        </View>
        <SelectSheet
          label="Obra"
          placeholder={
            obras === null ? "Cargando obras…" : "Selecciona una obra"
          }
          value={obraId}
          options={(obras || []).map((obra) => ({
            value: obra.id,
            label: `${obra.nombre}${obra.codigo ? ` · ${obra.codigo}` : ""}`,
          }))}
          onChange={(id) => {
            changeScope();
            setObraId(id);
          }}
          icon="office-building-outline"
        />
        <View style={styles.periods}>
          {periodos.map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{ selected: periodo === item.value }}
              style={[
                styles.period,
                periodo === item.value && styles.activePeriod,
              ]}
              onPress={() => {
                changeScope();
                setPeriodo(item.value);
              }}
            >
              <Text
                style={[
                  styles.periodText,
                  periodo === item.value && styles.activePeriodText,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={loading && Boolean(currentData)}
            onRefresh={refresh}
            tintColor="#f97316"
            colors={["#f97316"]}
          />
        }
      >
        {!!(obrasError || error) && (
          <View style={styles.error} accessibilityRole="alert">
            <Text style={styles.errorText}>{obrasError || error}</Text>
            {!!currentData && (
              <Text style={styles.muted}>
                Se muestra la última información cargada.
              </Text>
            )}
            <Button textColor="#b91c1c" onPress={refresh}>
              Reintentar
            </Button>
          </View>
        )}
        {!obraId && (
          <View style={styles.section}>
            <MaterialCommunityIcons
              name="office-building-marker-outline"
              size={34}
              color="#f97316"
            />
            <Text style={styles.sectionTitle}>
              {obras?.length === 0
                ? "No hay obras registradas"
                : "Elige una obra para revisar su avance"}
            </Text>
            <Text style={styles.muted}>
              Producción, revisiones y correcciones de todos los responsables de
              la obra.
            </Text>
          </View>
        )}
        {loading && !currentData && (
          <ActivityIndicator color="#f97316" style={styles.loader} />
        )}
        {currentData && (
          <>
            <View style={styles.production}>
              <Text style={styles.productionLabel}>SELLOS EJECUTADOS</Text>
              <Text style={styles.productionValue}>
                {numero(currentData.sellos)}
              </Text>
            </View>
            <View style={styles.grid}>
              {metrics.map((item) => (
                <View
                  key={item.title}
                  style={[
                    styles.metric,
                    { backgroundColor: item.bg, borderColor: item.color },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={26}
                    color={item.color}
                  />
                  <Text style={styles.metricValue}>{numero(item.value)}</Text>
                  <Text style={styles.metricLabel}>{item.title}</Text>
                </View>
              ))}
            </View>
            {!currentData.resumen.registros && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Sin registros en este período
                </Text>
                <Text style={styles.muted}>
                  Prueba con otro período u otra obra.
                </Text>
              </View>
            )}
            <ProduccionGrupo
              title="Producción por piso"
              icon="office-building-outline"
              items={currentData.pisos}
              total={currentData.pisosTotal}
            />
            <ProduccionGrupo
              title="Producción por responsable"
              icon="account-outline"
              items={currentData.responsables}
              total={currentData.responsablesTotal}
            />
            <Text style={styles.sectionTitle}>
              Últimos registros · {currentData.ultimos.length} de{" "}
              {numero(currentData.resumen.registros)}
            </Text>
            {currentData.ultimos.map((registro) => (
              <Pressable
                key={registro.id}
                style={styles.record}
                accessibilityRole="button"
                accessibilityLabel={`Ver registro ${registro.numero_sello || registro.id}`}
                onPress={() => {
                  setPendingKey(key);
                  void openDetail(registro.id);
                }}
              >
                <View style={styles.recordTop}>
                  <View style={styles.recordTypeIcon}>
                    <MaterialCommunityIcons
                      name={iconosTipo[registro.tipo_registro] || "clipboard-text-outline"}
                      size={21}
                      color="#0f172a"
                      accessible={false}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.groupName}>
                      {tipos[registro.tipo_registro] || registro.tipo_registro}
                    </Text>
                    <Text style={styles.muted}>
                      REG-{registro.id.slice(0, 6).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.badge,
                      registro.estado === "rechazado" && styles.rejected,
                    ]}
                  >
                    {estados[registro.estado] || registro.estado}
                  </Text>
                </View>
                <View style={styles.recordInfo}>
                  <View style={styles.recordLocation}>
                    <View style={styles.recordMetaItem}>
                      <MaterialCommunityIcons name="pound" size={16} color="#c2410c" accessible={false} />
                      <Text style={styles.recordText}>Sello {registro.numero_sello || "—"}</Text>
                    </View>
                    <View style={styles.recordMetaItem}>
                      <MaterialCommunityIcons name="office-building-outline" size={16} color="#c2410c" accessible={false} />
                      <Text style={styles.recordText}>Piso {registro.piso || "—"}</Text>
                    </View>
                  </View>
                  <View style={styles.recordMetaItem}>
                    <MaterialCommunityIcons name="calendar-clock" size={16} color="#c2410c" accessible={false} />
                    <Text style={styles.recordText}>
                      {formatDateOnly(registro.fecha)} ·{" "}
                      {formatTime24WithPeriod(registro.created_at)}
                    </Text>
                  </View>
                  <View style={styles.recordMetaItem}>
                    <MaterialCommunityIcons name="account-outline" size={16} color="#c2410c" accessible={false} />
                    <Text style={styles.recordText}>
                      {registro.nombre_sellador || "Sin responsable"}
                    </Text>
                  </View>
                </View>
                <View style={styles.recordTop}>
                  <MaterialCommunityIcons name="eye-outline" size={16} color="#ea580c" accessible={false} />
                  <Text style={styles.recordLink}>
                    Ver registro completo y fotografías
                  </Text>
                  {detailLoading === registro.id && pendingKey === key ? (
                    <ActivityIndicator size={16} color="#ea580c" />
                  ) : (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color="#ea580c"
                    />
                  )}
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
      <RegistroHistoryDetailModal
        registro={detail}
        onClose={() => setDetail(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f6fb" },
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0f172a",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffc400",
  },
  heroIcon: { backgroundColor: "#ffc400", padding: 12, borderRadius: 16 },
  eyebrow: {
    color: "#ffc400",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  greeting: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 3 },
  periods: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    backgroundColor: "#e9edf4",
    borderRadius: 16,
  },
  period: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  activePeriod: { backgroundColor: "#0f172a" },
  periodText: { color: "#475569", fontWeight: "700", fontSize: 13 },
  activePeriodText: { color: "#fff" },
  content: { padding: 16, paddingTop: 6, paddingBottom: 30, gap: 14 },
  loader: { marginVertical: 32 },
  production: {
    backgroundColor: "#0f172a",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ffc400",
    padding: 20,
  },
  productionLabel: {
    color: "#ffc400",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  productionValue: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "900",
    marginVertical: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: {
    flexGrow: 1,
    flexBasis: "45%",
    borderWidth: 1,
    borderTopWidth: 4,
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  metricValue: { color: "#0f172a", fontSize: 32, fontWeight: "900" },
  metricLabel: { color: "#475569", fontSize: 14, fontWeight: "700" },
  section: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  sectionTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  muted: { color: "#64748b", fontSize: 12, lineHeight: 18 },
  groupRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  groupName: { color: "#0f172a", fontWeight: "800", fontSize: 14 },
  groupHeading: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupAmounts: { alignItems: "flex-end", maxWidth: "45%" },
  amount: { color: "#c2410c", fontWeight: "800", fontSize: 13 },
  record: {
    backgroundColor: "#fffbf2",
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: "#ffc400",
    borderRadius: 19,
    padding: 13,
    gap: 9,
  },
  recordTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  recordTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#ffc400",
    alignItems: "center",
    justifyContent: "center",
  },
  recordLocation: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 3 },
  recordMetaItem: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "100%" },
  badge: {
    borderRadius: 10,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
    color: "#92400e",
  },
  rejected: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  recordInfo: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  recordText: { color: "#475569", fontSize: 12, fontWeight: "600", flexShrink: 1 },
  recordLink: { color: "#ea580c", fontSize: 11, fontWeight: "800", flex: 1 },
  error: { backgroundColor: "#fff1f2", borderRadius: 16, padding: 14, gap: 5 },
  errorText: { color: "#b91c1c" },
});
