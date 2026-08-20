import {
  getMisRegistros,
  getResumenSupervisor,
  RegistroHistorialApi,
  ResumenSupervisorApi,
} from "@/services/api/registrosApi";
import { getSession } from "@/services/auth/session";
import { formatTime24WithPeriod } from "@/utils/dateTime";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { AdminResumen, getAdminResumen } from "@/services/api/adminApi";

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

const EMPTY_SUPERVISOR_SUMMARY: ResumenSupervisorApi = {
  pendientesRevision: 0,
  rechazadosIngenieria: 0,
  enRevisionIngenieria: 0,
  validadosIngenieria: 0,
  enviadosMes: 0,
  correccionesReenviadasMes: 0,
  seguimientoPersonalDisponible: false,
};

const EMPTY_ADMIN_SUMMARY: AdminResumen = {
  total: 0,
  pendientesSupervisor: 0,
  enRevision: 0,
  rechazados: 0,
  validados: 0,
  correcciones: 0,
  accionesAdministrador: 0,
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const hasLoadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [activeTipo, setActiveTipo] = useState<
    "sello_cortafuego" | "junta_lineal_espuma"
  >("sello_cortafuego");
  const [registros, setRegistros] = useState<RegistroHistorialApi[]>([]);
  const [adminSummary, setAdminSummary] = useState(EMPTY_ADMIN_SUMMARY);
  const [supervisorSummary, setSupervisorSummary] = useState<{
    sello_cortafuego: ResumenSupervisorApi;
    junta_lineal_espuma: ResumenSupervisorApi;
  }>({
    sello_cortafuego: EMPTY_SUPERVISOR_SUMMARY,
    junta_lineal_espuma: EMPTY_SUPERVISOR_SUMMARY,
  });

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    try {
      setError("");
      const session = await getSession();
      setUserName(session.user?.nombre || "Usuario Beck");
      setUserRole(session.user?.rol || "");

      if (session.user?.rol === "administrador") {
        setAdminSummary(await getAdminResumen());
        setRegistros([]);
      } else if (session.user?.rol === "jefeobra") {
        const [sellos, juntas] = await Promise.all([
          getResumenSupervisor("sello_cortafuego", forceRefresh),
          getResumenSupervisor("junta_lineal_espuma", forceRefresh),
        ]);
        setSupervisorSummary({
          sello_cortafuego: sellos,
          junta_lineal_espuma: juntas,
        });
        setRegistros([]);
      } else {
        setRegistros(await getMisRegistros(forceRefresh));
      }
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el inicio");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const init = async () => {
        const shouldBlockScreen = !hasLoadedRef.current;
        if (shouldBlockScreen) setLoading(true);
        await loadDashboard();
        if (isActive) {
          hasLoadedRef.current = true;
          if (shouldBlockScreen) setLoading(false);
        }
      };

      init();

      return () => {
        isActive = false;
      };
    }, [loadDashboard]),
  );

  const metrics = useMemo(() => {
    const registrosRealizados = registros.filter(
      (registro) => !registro.es_correccion && !registro.registro_origen_id,
    ).length;
    const enRevision = registros.filter(
      (registro) => registro.estado === "en_revision",
    ).length;
    const validados = registros.filter(
      (registro) => registro.estado === "validado",
    ).length;
    const correccionesRecibidas = registros.filter(
      (registro) =>
        registro.estado === "pendiente" &&
        registro.es_correccion === true &&
        registro.devuelto_a_tecnico === true,
    ).length;
    const pendientes = registros.filter(
      (registro) =>
        registro.estado === "pendiente" &&
        !(registro.es_correccion && registro.devuelto_a_tecnico),
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
      registrosRealizados,
      enRevision,
      validados,
      pendientes,
      correccionesRecibidas,
      total,
      avance,
      obraPrincipal,
    };
  }, [registros]);

  const recientes = useMemo(() => registros.slice(0, 4), [registros]);
  const jefeObraMetrics = supervisorSummary[activeTipo];

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

  if (userRole === "ingenieria") {
    return <Redirect href="/(tabs)/ingenieria" />;
  }

  if (userRole === "cliente") {
    return <Redirect href="/(tabs)/cliente" />;
  }

  if (userRole === "administrador") {
    const adminMetrics = [
      { label: "Pendientes de Supervisor", value: adminSummary.pendientesSupervisor, icon: "clipboard-clock-outline" as const, style: styles.summaryWarm },
      { label: "En revisión por Ingeniería", value: adminSummary.enRevision, icon: "send-clock-outline" as const, style: styles.summaryBlue },
      { label: "Rechazados", value: adminSummary.rechazados, icon: "alert-octagon-outline" as const, style: styles.summaryRed },
      { label: "Validados", value: adminSummary.validados, icon: "check-decagram-outline" as const, style: styles.summaryGreen },
    ];
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top + 2 }]} edges={["top", "left", "right"]}>
        <View style={styles.fixedHeader}>
          <View style={styles.supervisorWelcome}>
            <View style={styles.supervisorWelcomeIcon}>
              <MaterialCommunityIcons name="shield-account-outline" size={25} color="#0f172a" />
            </View>
            <View style={styles.terrenoWelcomeInfo}>
              <Text style={styles.supervisorWelcomeEyebrow}>Panel administrativo</Text>
              <Text style={styles.supervisorWelcomeTitle}>Hola, {userName.split(" ")[0] || "Administrador"}</Text>
              <Text style={styles.supervisorWelcomeSubtitle}>Opera y supervisa el flujo completo de registros BECK.</Text>
            </View>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={[styles.content, styles.contentAfterFixedHeader]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {error ? <Card style={styles.errorCard}><Card.Content><Text style={styles.errorText}>{error}</Text><Button onPress={() => loadDashboard(true)}>Reintentar</Button></Card.Content></Card> : null}
          <View style={styles.summaryGrid}>
            {adminMetrics.map((metric) => (
              <Card key={metric.label} style={[styles.summaryCard, metric.style, styles.supervisorSummaryHalf]}>
                <Card.Content style={styles.supervisorSummaryContent}>
                  <View style={styles.supervisorMetricIcon}><MaterialCommunityIcons name={metric.icon} size={20} color="#0f172a" /></View>
                  <Text style={styles.summaryLabel}>{metric.label}</Text>
                  <Text style={styles.summaryValue}>{metric.value}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>
          <View style={styles.smallSummaryGrid}>
            <Card style={[styles.smallSummaryCard, styles.supervisorSmallCard]}><Card.Content style={styles.smallSummaryContent}><MaterialCommunityIcons name="file-refresh-outline" size={23} color="#ea580c" /><View style={styles.supervisorActivityText}><Text style={styles.helperText}>Correcciones activas</Text><Text style={styles.smallSummaryValue}>{adminSummary.correcciones}</Text></View></Card.Content></Card>
            <Card style={[styles.smallSummaryCard, styles.supervisorSmallCard]}><Card.Content style={styles.smallSummaryContent}><MaterialCommunityIcons name="history" size={23} color="#ea580c" /><View style={styles.supervisorActivityText}><Text style={styles.helperText}>Mis acciones</Text><Text style={styles.smallSummaryValue}>{adminSummary.accionesAdministrador}</Text></View></Card.Content></Card>
          </View>
          <Text style={styles.supervisorSectionLabel}>Accesos operativos</Text>
          <View style={styles.terrenoQuickActions}>
            <Button mode="contained" icon="hard-hat" buttonColor="#0f172a" onPress={() => router.push("/mis-obras")} style={styles.terrenoQuickButton}>Operario</Button>
            <Button mode="outlined" icon="clipboard-text-outline" textColor="#0f172a" onPress={() => router.push("/registros")} style={[styles.terrenoQuickButton, styles.terrenoQuickButtonOutlined]}>Supervisor</Button>
          </View>
          <Button mode="contained" icon="clipboard-check-outline" buttonColor="#f97316" onPress={() => router.push("/ingenieria")} style={styles.supervisorMainButton}>Revisión de Ingeniería</Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (userRole === "jefeobra") {
    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: insets.top + 2 }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.fixedHeader}>
          <View style={styles.supervisorWelcome}>
            <View style={styles.supervisorWelcomeIcon}>
              <MaterialCommunityIcons name="account-hard-hat-outline" size={25} color="#0f172a" />
            </View>
            <View style={styles.terrenoWelcomeInfo}>
              <Text style={styles.supervisorWelcomeEyebrow}>Panel de supervisión</Text>
              <Text style={styles.supervisorWelcomeTitle}>
                Hola, {userName.split(" ")[0] || "Supervisor"}
              </Text>
              <Text style={styles.supervisorWelcomeSubtitle}>
                Controla el avance y revisa los registros de los operarios.
              </Text>
            </View>
          </View>

          <View style={styles.supervisorTipoTabs}>
            <Button
              mode={activeTipo === "sello_cortafuego" ? "contained" : "text"}
              icon="fire"
              compact
              buttonColor={activeTipo === "sello_cortafuego" ? "#0f172a" : undefined}
              textColor={activeTipo === "sello_cortafuego" ? "#ffffff" : "#475569"}
              onPress={() => setActiveTipo("sello_cortafuego")}
              style={styles.supervisorTipoButton}
            >
              Sellos
            </Button>
            <Button
              mode={activeTipo === "junta_lineal_espuma" ? "contained" : "text"}
              icon="ruler"
              compact
              buttonColor={activeTipo === "junta_lineal_espuma" ? "#0f172a" : undefined}
              textColor={activeTipo === "junta_lineal_espuma" ? "#ffffff" : "#475569"}
              onPress={() => setActiveTipo("junta_lineal_espuma")}
              style={styles.supervisorTipoButton}
            >
              Junta lineal
            </Button>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            styles.contentAfterFixedHeader,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
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

          <View style={styles.summaryGrid}>
            <Card style={[styles.summaryCard, styles.summaryWarm, styles.supervisorSummaryHalf]}>
              <Card.Content style={styles.supervisorSummaryContent}>
                <View style={[styles.supervisorMetricIcon, styles.supervisorMetricYellow]}>
                  <MaterialCommunityIcons name="clipboard-clock-outline" size={20} color="#0f172a" />
                </View>
                <Text style={styles.summaryLabel}>Pendientes de mi revisión</Text>
                <Text style={styles.summaryValue}>{jefeObraMetrics.pendientesRevision}</Text>
              </Card.Content>
            </Card>

            <Card style={[styles.summaryCard, styles.summaryRed, styles.supervisorSummaryHalf]}>
              <Card.Content style={styles.supervisorSummaryContent}>
                <View style={[styles.supervisorMetricIcon, styles.supervisorMetricRed]}>
                  <MaterialCommunityIcons name="alert-octagon-outline" size={20} color="#dc2626" />
                </View>
                <Text style={styles.summaryLabel}>Rechazados por Ingeniería</Text>
                <Text style={[styles.summaryValue, styles.redValue]}>
                  {jefeObraMetrics.rechazadosIngenieria}
                </Text>
              </Card.Content>
            </Card>

            <Card style={[styles.summaryCard, styles.summaryBlue, styles.supervisorSummaryHalf]}>
              <Card.Content style={styles.supervisorSummaryContent}>
                <View style={[styles.supervisorMetricIcon, styles.supervisorMetricBlue]}>
                  <MaterialCommunityIcons name="send-clock-outline" size={20} color="#2563eb" />
                </View>
                <Text style={styles.summaryLabel}>En revisión por Ingeniería</Text>
                <Text style={styles.summaryValue}>
                  {jefeObraMetrics.enRevisionIngenieria ?? "—"}
                </Text>
              </Card.Content>
            </Card>

            <Card style={[styles.summaryCard, styles.summaryGreen, styles.supervisorSummaryHalf]}>
              <Card.Content style={styles.supervisorSummaryContent}>
                <View style={[styles.supervisorMetricIcon, styles.supervisorMetricGreen]}>
                  <MaterialCommunityIcons name="check-decagram-outline" size={21} color="#16a34a" />
                </View>
                <Text style={styles.summaryLabel}>Validados por Ingeniería</Text>
                <Text style={[styles.summaryValue, styles.greenValue]}>
                  {jefeObraMetrics.validadosIngenieria ?? "—"}
                </Text>
              </Card.Content>
            </Card>
          </View>

          <Text style={styles.supervisorSectionLabel}>Mi actividad este mes</Text>
          <View style={styles.smallSummaryGrid}>
            <Card style={[styles.smallSummaryCard, styles.supervisorSmallCard]}>
              <Card.Content style={styles.smallSummaryContent}>
                <View style={styles.supervisorActivityIcon}>
                  <MaterialCommunityIcons name="send-check-outline" size={22} color="#ea580c" />
                </View>
                <View style={styles.supervisorActivityText}>
                  <Text style={[styles.helperText, styles.supervisorActivityLabel]}>
                    Enviados por mí
                  </Text>
                  <Text style={styles.smallSummaryValue}>
                    {jefeObraMetrics.enviadosMes ?? "—"}
                  </Text>
                </View>
              </Card.Content>
            </Card>
            <Card style={[styles.smallSummaryCard, styles.supervisorSmallCard]}>
              <Card.Content style={styles.smallSummaryContent}>
                <View style={styles.supervisorActivityIcon}>
                  <MaterialCommunityIcons
                    name="file-refresh-outline"
                    size={22}
                    color="#ea580c"
                  />
                </View>
                <View style={styles.supervisorActivityText}>
                  <Text style={[styles.helperText, styles.supervisorActivityLabel]}>
                    Correcciones reenviadas
                  </Text>
                  <Text style={styles.smallSummaryValue}>
                    {jefeObraMetrics.correccionesReenviadasMes ?? "—"}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </View>

          <Button
            mode="contained"
            icon="clipboard-edit-outline"
            onPress={() => router.push("/registros")}
            buttonColor="#0f172a"
            style={styles.supervisorMainButton}
            contentStyle={styles.supervisorMainButtonContent}
          >
            Revisar registros de Operarios
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      {userRole === "terreno" ? (
        <View style={styles.fixedHeader}>
          <View style={styles.terrenoWelcome}>
            <View style={styles.terrenoWelcomeIcon}>
              <MaterialCommunityIcons name="hard-hat" size={25} color="#0f172a" />
            </View>
            <View style={styles.terrenoWelcomeInfo}>
              <Text style={styles.terrenoWelcomeEyebrow}>Resumen de actividad</Text>
              <Text style={styles.terrenoWelcomeTitle}>
                Hola, {userName.split(" ")[0] || "equipo"}
              </Text>
              <Text style={styles.terrenoWelcomeSubtitle}>
                Revisa tus registros y su avance de validación.
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          userRole === "terreno" && styles.contentAfterFixedHeader,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {userRole !== "terreno" ? (
          <>
            <BrandHeader subtitle="Inicio · BECK" />

            <Text variant="titleLarge" style={styles.title}>
              Hola, {userName.split(" ")[0] || "equipo"}
            </Text>
            <Text style={styles.subtitle}>
              Resumen de tus registros en terreno y el avance validado por
              ingeniería.
            </Text>
          </>
        ) : null}

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

        {userRole === "terreno" ? (
          <>
            <View style={styles.terrenoQuickActions}>
              <Button
                mode="contained"
                icon="office-building-outline"
                buttonColor="#0f172a"
                onPress={() => router.push("/mis-obras")}
                style={styles.terrenoQuickButton}
                contentStyle={styles.terrenoQuickButtonContent}
              >
                Ir a Obras
              </Button>
              <Button
                mode="outlined"
                icon="clipboard-text-outline"
                textColor="#0f172a"
                onPress={() => router.push("/registros")}
                style={[styles.terrenoQuickButton, styles.terrenoQuickButtonOutlined]}
                contentStyle={styles.terrenoQuickButtonContent}
              >
                Ver registros
              </Button>
            </View>
          </>
        ) : null}

        <View style={styles.kpiGrid}>
          <Card
            style={[
              styles.kpiCard,
              userRole === "terreno" && styles.terrenoKpiCard,
              userRole === "terreno" && styles.terrenoKpiPurple,
            ]}
          >
            <Card.Content style={userRole === "terreno" ? styles.terrenoKpiContent : undefined}>
              <View style={[styles.terrenoKpiIcon, styles.terrenoKpiIconPurple]}>
                <MaterialCommunityIcons
                  name="clipboard-check-outline"
                  size={21}
                  color="#7c3aed"
                />
              </View>
              <Text style={styles.kpiValue}>{metrics.registrosRealizados}</Text>
              <Text style={styles.kpiLabel}>Registros realizados</Text>
            </Card.Content>
          </Card>

          {userRole === "terreno" ? (
            <Card style={[styles.kpiCard, styles.terrenoKpiCard, styles.terrenoKpiYellow]}>
              <Card.Content style={styles.terrenoKpiContent}>
                <View style={[styles.terrenoKpiIcon, styles.terrenoKpiIconYellow]}>
                  <MaterialCommunityIcons
                    name="account-clock-outline"
                    size={21}
                    color="#0f172a"
                  />
                </View>
                <Text style={styles.kpiValue}>{metrics.pendientes}</Text>
                <Text style={styles.kpiLabel}>Pendientes de revisión por supervisor</Text>
              </Card.Content>
            </Card>
          ) : null}

          <Card
            style={[
              styles.kpiCard,
              userRole === "terreno" && styles.terrenoKpiCard,
              userRole === "terreno" && styles.terrenoKpiBlue,
            ]}
          >
            <Card.Content style={userRole === "terreno" ? styles.terrenoKpiContent : undefined}>
              <View style={[styles.terrenoKpiIcon, styles.terrenoKpiIconBlue]}>
                <MaterialCommunityIcons
                  name="timer-sand"
                  size={21}
                  color="#3b82f6"
                />
              </View>
              <Text style={styles.kpiValue}>{metrics.enRevision}</Text>
              <Text style={styles.kpiLabel}>En revisión por ingeniería</Text>
            </Card.Content>
          </Card>

          <Card
            style={[
              styles.kpiCard,
              userRole === "terreno" && styles.terrenoKpiCard,
              userRole === "terreno" && styles.terrenoKpiGreen,
            ]}
          >
            <Card.Content style={userRole === "terreno" ? styles.terrenoKpiContent : undefined}>
              <View style={[styles.terrenoKpiIcon, styles.terrenoKpiIconGreen]}>
                <MaterialCommunityIcons
                  name="check-decagram-outline"
                  size={21}
                  color="#16a34a"
                />
              </View>
              <Text style={styles.kpiValue}>{metrics.validados}</Text>
              <Text style={styles.kpiLabel}>Validados por ingeniería</Text>
            </Card.Content>
          </Card>

          {userRole === "terreno" ? (
            <Card
              style={[
                styles.kpiCard,
                styles.terrenoKpiCard,
                styles.terrenoKpiFull,
                styles.terrenoKpiOrange,
              ]}
            >
              <Card.Content style={styles.terrenoKpiFullContent}>
                <View style={[styles.terrenoKpiIcon, styles.terrenoKpiIconOrange]}>
                  <MaterialCommunityIcons
                    name="file-document-refresh-outline"
                    size={21}
                    color="#ea580c"
                  />
                </View>
                <View style={styles.terrenoKpiFullText}>
                  <Text style={[styles.kpiValue, styles.terrenoKpiFullValue]}>
                    {metrics.correccionesRecibidas}
                  </Text>
                  <Text style={styles.kpiLabel}>Correcciones recibidas</Text>
                </View>
              </Card.Content>
            </Card>
          ) : null}

        </View>

        <Card style={[styles.card, userRole === "terreno" && styles.terrenoProgressCard]}>
          <View style={userRole === "terreno" ? styles.terrenoProgressClip : undefined}>
            {userRole === "terreno" ? <View style={styles.terrenoCardAccent} /> : null}
            <Card.Content style={userRole === "terreno" ? styles.terrenoCardContent : undefined}>
              <View style={styles.cardHeader}>
                <View style={styles.terrenoCardHeading}>
                  {userRole === "terreno" ? (
                    <View style={styles.terrenoCardIcon}>
                      <MaterialCommunityIcons name="chart-donut" size={19} color="#0f172a" />
                    </View>
                  ) : null}
                  <View style={styles.terrenoCardHeadingText}>
                    <Text style={styles.cardTitle}>Pulso de avance</Text>
                    <Text style={styles.helperText}>
                      {metrics.avance}% de tus registros ya fue validado.
                    </Text>
                  </View>
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
              </View>
            </Card.Content>
          </View>
        </Card>

        <Card style={[styles.card, userRole === "terreno" && styles.terrenoFocusCard]}>
          <Card.Content style={userRole === "terreno" ? styles.terrenoFocusContent : undefined}>
            {userRole === "terreno" ? (
              <View style={styles.terrenoFocusIcon}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={21} color="#0f172a" />
              </View>
            ) : null}
            <View style={styles.terrenoCardHeadingText}>
              <Text style={styles.cardTitle}>Foco sugerido</Text>
              <Text style={styles.focusText}>
                Tu obra con más actividad es {metrics.obraPrincipal}. Prioriza
                informar a tu supervisor de tus registros realizados, para acelerar
                el proceso de revisión y para que estos sean validados por ingeniería.
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, userRole === "terreno" && styles.terrenoRecentCard]}>
          <Card.Content style={userRole === "terreno" ? styles.terrenoCardContent : undefined}>
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
                      {formatDate(registro.fecha)} · {formatTime24WithPeriod(registro.created_at)}
                      {registro.tipo_registro !== "junta_lineal_espuma"
                        ? ` · Sello N° ${registro.numero_sello || "Sin número"}`
                        : ""}
                      {` · ${registro.estado.replace("_", " ")}`}
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
  contentAfterFixedHeader: {
    paddingTop: 4,
  },
  fixedHeader: {
    backgroundColor: "#f5f7fb",
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  terrenoWelcome: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderColor: "#FDC10B",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  terrenoWelcomeIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 13,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  terrenoWelcomeInfo: {
    flex: 1,
  },
  terrenoWelcomeEyebrow: {
    color: "#FDC10B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  terrenoWelcomeTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 2,
  },
  terrenoWelcomeSubtitle: {
    color: "#cbd5e1",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  terrenoQuickActions: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 14,
  },
  terrenoQuickButton: {
    borderRadius: 13,
    flex: 1,
  },
  terrenoQuickButtonOutlined: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
  },
  terrenoQuickButtonContent: {
    minHeight: 44,
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
  terrenoKpiContent: {
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  terrenoKpiCard: {
    minHeight: 126,
  },
  terrenoKpiFull: {
    minHeight: 88,
    width: "100%",
  },
  terrenoKpiFullContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  terrenoKpiFullText: {
    flex: 1,
  },
  terrenoKpiFullValue: {
    marginTop: 0,
  },
  terrenoKpiYellow: {
    backgroundColor: "#fffaf0",
    borderColor: "#fde68a",
    borderTopColor: "#FDC10B",
    borderTopWidth: 4,
  },
  terrenoKpiBlue: {
    backgroundColor: "#eff6ff",
    borderColor: "#93c5fd",
    borderTopColor: "#3b82f6",
    borderTopWidth: 4,
  },
  terrenoKpiOrange: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
    borderTopColor: "#ea580c",
    borderTopWidth: 4,
  },
  terrenoKpiPurple: {
    backgroundColor: "#faf5ff",
    borderColor: "#d8b4fe",
    borderTopColor: "#7c3aed",
    borderTopWidth: 4,
  },
  terrenoKpiGreen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    borderTopColor: "#16a34a",
    borderTopWidth: 4,
  },
  terrenoKpiIcon: {
    alignItems: "center",
    borderRadius: 9,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  terrenoKpiIconYellow: {
    backgroundColor: "#FDC10B",
  },
  terrenoKpiIconBlue: {
    backgroundColor: "#dbeafe",
  },
  terrenoKpiIconOrange: {
    backgroundColor: "#ffedd5",
  },
  terrenoKpiIconPurple: {
    backgroundColor: "#ede9fe",
  },
  terrenoKpiIconGreen: {
    backgroundColor: "#dcfce7",
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
  terrenoProgressCard: {
    backgroundColor: "#fffdf7",
    borderColor: "#FDC10B",
  },
  terrenoProgressClip: {
    borderRadius: 16,
    overflow: "hidden",
  },
  terrenoCardAccent: {
    backgroundColor: "#f97316",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 5,
  },
  terrenoCardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  terrenoCardHeading: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 9,
  },
  terrenoCardHeadingText: {
    flex: 1,
  },
  terrenoCardIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  terrenoFocusCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
  },
  terrenoFocusContent: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  terrenoFocusIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  terrenoRecentCard: {
    backgroundColor: "#ffffff",
    borderColor: "#FDC10B",
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
  tipoTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  supervisorWelcome: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderColor: "#FDC10B",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  supervisorWelcomeIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 13,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  supervisorWelcomeEyebrow: {
    color: "#FDC10B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  supervisorWelcomeTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  supervisorWelcomeSubtitle: {
    color: "#cbd5e1",
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  supervisorTipoTabs: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    marginTop: 10,
    padding: 4,
  },
  supervisorTipoButton: {
    borderRadius: 10,
    flex: 1,
  },
  supervisorSectionLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 9,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderTopWidth: 4,
  },
  supervisorSummaryHalf: {
    width: "48%",
  },
  supervisorSummaryContent: {
    minHeight: 124,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  supervisorMetricIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    marginBottom: 8,
    width: 34,
  },
  supervisorMetricYellow: {
    backgroundColor: "#FDC10B",
  },
  supervisorMetricBlue: {
    backgroundColor: "#dbeafe",
  },
  supervisorMetricGreen: {
    backgroundColor: "#dcfce7",
  },
  supervisorMetricRed: {
    backgroundColor: "#fee2e2",
  },
  summaryWarm: {
    borderColor: "#facc15",
    backgroundColor: "#fffbeb",
  },
  summaryBlue: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  summaryGreen: {
    borderColor: "#22c55e",
    backgroundColor: "#ecfdf5",
  },
  summaryRed: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  summaryValue: {
    color: "#0f172a",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 6,
  },
  greenValue: {
    color: "#16a34a",
  },
  redValue: {
    color: "#dc2626",
  },
  smallSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  smallSummaryCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
  },
  supervisorSmallCard: {
    backgroundColor: "#fffdf7",
    borderColor: "#fde68a",
    borderRadius: 13,
  },
  smallSummaryContent: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    minHeight: 86,
  },
  supervisorActivityIcon: {
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderRadius: 9,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  supervisorActivityText: {
    flex: 1,
  },
  supervisorActivityLabel: {
    lineHeight: 16,
    minHeight: 32,
  },
  smallSummaryValue: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  supervisorMainButton: {
    borderRadius: 14,
    marginTop: 3,
  },
  supervisorMainButtonContent: {
    minHeight: 48,
  },
});
