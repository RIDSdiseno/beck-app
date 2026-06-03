import { clearMisObrasCache } from "@/services/api/obrasApi";
import {
  clearMisRegistrosCache,
  getMisRegistros,
  RegistroHistorialApi,
} from "@/services/api/registrosApi";
import { clearSession, getSession } from "@/services/auth/session";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Card, Chip, Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";

type ProfileUser = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
};

function getRoleLabel(role?: string) {
  switch (role) {
    case "administrador":
      return "Administrador";
    case "terreno":
      return "Terreno";
    case "jefeobra":
      return "Jefe de obra";
    case "ingenieria":
      return "Ingenieria";
    case "visualizador":
      return "Visualizador";
    case "vendedor":
      return "Vendedor";
    default:
      return "Usuario";
  }
}

function getInitials(name?: string) {
  const parts = String(name || "Usuario Beck")
    .trim()
    .split(/\s+/)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "B";
}

const estadoColor = {
  pendiente: "#f59e0b",
  en_revision: "#3b82f6",
  validado: "#16a34a",
  rechazado: "#dc2626",
} as const;

function getEstadoLabel(estado: RegistroHistorialApi["estado"]) {
  switch (estado) {
    case "pendiente":
      return "Pendiente";
    case "en_revision":
      return "En revisión";
    case "validado":
      return "Validado";
    case "rechazado":
      return "Rechazado";
    default:
      return "Pendiente";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RegistroContextBox({ registro }: { registro: RegistroHistorialApi }) {
  const hasRechazo = Boolean(
    registro.motivo_rechazo ||
      registro.fecha_rechazo ||
      registro.rechazado_por ||
      registro.registro_origen?.motivo_rechazo,
  );
  const isCorreccion = Boolean(registro.es_correccion || registro.registro_origen_id);
  const motivo =
    registro.motivo_rechazo || registro.registro_origen?.motivo_rechazo;
  const fecha =
    formatDateTime(registro.fecha_rechazo) ||
    formatDateTime(registro.registro_origen?.fecha_rechazo);

  if (!hasRechazo && !isCorreccion) return null;

  return (
    <View style={styles.contextBox}>
      <View style={styles.contextHeader}>
        <MaterialCommunityIcons
          name={hasRechazo ? "alert-circle-outline" : "file-refresh-outline"}
          size={18}
          color={hasRechazo ? "#dc2626" : "#2563eb"}
        />
        <Text
          style={[
            styles.contextTitle,
            hasRechazo ? styles.contextTitleDanger : styles.contextTitleInfo,
          ]}
        >
          {hasRechazo ? "Contexto de rechazo" : "Registro de corrección"}
        </Text>
      </View>
      {isCorreccion ? (
        <Text style={styles.contextText}>
          Corrección enlazada al registro original
          {registro.registro_origen?.numero_sello
            ? ` N° ${registro.registro_origen.numero_sello}`
            : ""}.
        </Text>
      ) : null}
      {motivo ? (
        <Text style={styles.contextText}>Motivo: {motivo}</Text>
      ) : null}
      {registro.rechazado_por?.nombre ? (
        <Text style={styles.contextText}>
          Rechazado por: {registro.rechazado_por.nombre}
        </Text>
      ) : null}
      {fecha ? <Text style={styles.contextText}>Fecha: {fecha}</Text> : null}
    </View>
  );
}

type ProfileActionProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
};

function ProfileAction({ icon, label, onPress }: ProfileActionProps) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIcon}>
        <MaterialCommunityIcons name={icon} size={28} color="#f97316" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={32} color="#64748b" />
    </Pressable>
  );
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [registros, setRegistros] = useState<RegistroHistorialApi[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  const loadProfile = useCallback(async (forceRefresh = false) => {
    const session = await getSession();
    setUser(session.user);

    if (session.user?.rol === "jefeobra" || session.user?.rol === "terreno") {
      const data = await getMisRegistros(forceRefresh);
      setRegistros(
        session.user?.rol === "jefeobra"
          ? data.filter((registro) => registro.estado !== "pendiente")
          : data,
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const handleLogout = async () => {
    try {
      clearMisObrasCache();
      clearMisRegistrosCache();
      await clearSession();
      router.replace("/login");
    } catch (error) {
      console.log("LOGOUT ERROR", error);
    }
  };

  const handleHistoryPress = () => {
    if (user?.rol === "terreno" || user?.rol === "jefeobra") {
      setShowHistory(true);
      return;
    }

    router.push("/historial");
  };

  const refreshHistory = async () => {
    setRefreshingHistory(true);
    await loadProfile(true);
    setRefreshingHistory(false);
  };
  const isFixedProfileHeader =
    user?.rol === "terreno" || user?.rol === "jefeobra";

  if (showHistory && (user?.rol === "jefeobra" || user?.rol === "terreno")) {
    const isFixedHistoryHeader =
      user?.rol === "terreno" || user?.rol === "jefeobra";
    const historyTitle =
      user?.rol === "jefeobra"
        ? "Historial de registros actualizados"
        : "Historial de registros";

    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: insets.top + 2 }]}
        edges={["top", "left", "right"]}
      >
        {isFixedHistoryHeader ? (
          <View style={styles.fixedHeader}>
            <View style={styles.fixedTopRow}>
              <View style={styles.fixedBrand}>
                <BrandHeader subtitle="Registros realizados · BECK" />
              </View>
              <Button mode="text" onPress={() => setShowHistory(false)}>
                Volver
              </Button>
            </View>
            <Text variant="titleLarge" style={styles.title}>
              {historyTitle}
            </Text>
            <Text style={styles.subtitle}>
              Revisa el estado de los registros y actualiza la lista para ver
              cambios recientes.
            </Text>
          </View>
        ) : null}
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isFixedHistoryHeader && styles.contentAfterFixedHeader,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshingHistory}
              onRefresh={refreshHistory}
            />
          }
        >
          {!isFixedHistoryHeader ? (
            <>
              <BrandHeader subtitle="Registros realizados · BECK" />
              <View style={styles.historyScreenHeader}>
                <View style={styles.historyScreenTitleGroup}>
                  <Text variant="titleLarge" style={styles.title}>
                    Historial de registros actualizados
                  </Text>
                  <Text style={styles.subtitle}>
                    Revisa el estado de los registros y actualiza la lista para ver
                    cambios recientes.
                  </Text>
                </View>
                <Button mode="text" onPress={() => setShowHistory(false)}>
                  Volver
                </Button>
              </View>
            </>
          ) : null}

          {registros.length ? (
            registros.map((item) => {
              const obraNombre = item.obras?.nombre || "Obra sin nombre";
              const isJunta = item.tipo_registro === "junta_lineal_espuma";

              return (
                <Card key={item.id} style={styles.historyFullCard}>
                  <Card.Content>
                    <View style={styles.historyCardHeader}>
                      <View style={styles.historyTitleGroup}>
                        <Text style={styles.historyItemTitle}>{obraNombre}</Text>
                        <Text style={styles.historyItemMeta}>
                          {item.obras?.codigo || "Sin código"} ·{" "}
                          {formatDate(item.fecha)}
                        </Text>
                      </View>

                      <Chip
                        compact
                        style={[
                          styles.historyChip,
                          {
                            backgroundColor:
                              estadoColor[item.estado] || estadoColor.pendiente,
                          },
                        ]}
                        textStyle={styles.historyChipText}
                      >
                        {getEstadoLabel(item.estado)}
                      </Chip>
                    </View>

                    <Text style={styles.historyItemDetail}>
                      {item.descripcion_material}
                    </Text>

                    <View style={styles.historyDetailGrid}>
                      <Text style={styles.historyDetailItem}>
                        Tipo: {isJunta ? "Junta lineal espuma" : "Sello cortafuego"}
                      </Text>
                      <Text style={styles.historyDetailItem}>
                        Módulo: {item.modulo}
                      </Text>
                      <Text style={styles.historyDetailItem}>Piso: {item.piso}</Text>
                      <Text style={styles.historyDetailItem}>
                        Eje: {item.eje_numerico}-{item.eje_alfabetico}
                      </Text>
                      <Text style={styles.historyDetailItem}>
                        {isJunta
                          ? `Metros lineales: ${item.metros_lineales || 0}`
                          : `Sellos: ${item.cantidad_sellos}`}
                      </Text>
                      <Text style={styles.historyDetailItem}>
                        Responsable:{" "}
                        {item.usuarios?.nombre || item.nombre_sellador}
                      </Text>
                    </View>

                    {item.observaciones ? (
                      <Text style={styles.historyObservaciones}>
                        Observaciones: {item.observaciones}
                      </Text>
                    ) : null}

                    <RegistroContextBox registro={item} />
                  </Card.Content>
                </Card>
              );
            })
          ) : (
            <View style={styles.historyEmptyState}>
              <Text style={styles.historyEmptyTitle}>Sin registros</Text>
              <Text style={styles.historyItemMeta}>
                {user?.rol === "jefeobra"
                  ? "Cuando envíes registros a ingeniería aparecerán aquí."
                  : "Cuando realices registros en terreno aparecerán aquí."}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      {isFixedProfileHeader ? (
        <View style={styles.fixedHeader}>
          <BrandHeader subtitle="Perfil · BECK" />
          <Text variant="titleLarge" style={styles.title}>
            Perfil
          </Text>
          <Text style={styles.subtitle}>
            {user?.rol === "jefeobra"
              ? "Sesion activa del jefe de obra."
              : "Sesion activa del tecnico."}
          </Text>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isFixedProfileHeader && styles.contentAfterFixedHeader,
        ]}
      >
        {!isFixedProfileHeader ? (
          <>
            <BrandHeader subtitle="Perfil · BECK" />
            <Text variant="titleLarge" style={styles.title}>
              Perfil
            </Text>
            <Text style={styles.subtitle}>Sesion activa del tecnico.</Text>
          </>
        ) : null}

        <View style={styles.profileCard}>
          <Avatar.Text
            size={82}
            label={getInitials(user?.nombre)}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />

          <Text style={styles.name}>{user?.nombre || "Usuario Beck"}</Text>
          <Text style={styles.email}>{user?.email || "Sin correo"}</Text>

          <View style={styles.rolePill}>
            <MaterialCommunityIcons
              name="badge-account-outline"
              size={16}
              color="#ffffff"
            />
            <Text style={styles.roleText}>{getRoleLabel(user?.rol)}</Text>
          </View>

          <View style={styles.divider} />

          <Button
            mode="contained"
            onPress={handleLogout}
            buttonColor="#dc2626"
            textColor="#ffffff"
            style={styles.logoutButton}
            contentStyle={styles.logoutButtonContent}
            labelStyle={styles.logoutLabel}
          >
            Cerrar sesion
          </Button>
        </View>

        <View style={styles.actions}>
          <ProfileAction
            icon="clipboard-text-clock-outline"
            label="Historial de Registro"
            onPress={handleHistoryPress}
          />
        </View>

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
    paddingTop: 0,
  },
  contentAfterFixedHeader: {
    paddingTop: 4,
  },
  fixedHeader: {
    backgroundColor: "#f5f7fb",
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  fixedTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  fixedBrand: {
    flex: 1,
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#0f172a",
    fontWeight: "500",
    marginBottom: 14,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#eef2f7",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  avatar: {
    backgroundColor: "#fff7ed",
  },
  avatarLabel: {
    color: "#f97316",
    fontSize: 24,
    fontWeight: "900",
  },
  name: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 16,
    textAlign: "center",
  },
  email: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  rolePill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#0f172a",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  divider: {
    alignSelf: "stretch",
    backgroundColor: "#e2e8f0",
    height: 1,
    marginBottom: 18,
    marginTop: 22,
  },
  logoutButton: {
    borderRadius: 14,
    minWidth: 144,
  },
  logoutButtonContent: {
    minHeight: 46,
    paddingHorizontal: 8,
  },
  logoutLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  actions: {
    gap: 10,
  },
  actionCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#eef2f7",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 70,
    paddingHorizontal: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  actionLabel: {
    color: "#0f172a",
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
  },
  historyPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#eef2f7",
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  historyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  historyRow: {
    alignItems: "center",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    color: "#0f172a",
    fontWeight: "800",
  },
  historyMeta: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
  },
  historyStatus: {
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "capitalize",
  },
  historyValidado: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
  },
  historyRechazado: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
  },
  historyScreenHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyScreenTitleGroup: {
    flex: 1,
  },
  historyFullCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  historyCardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  historyTitleGroup: {
    flex: 1,
  },
  historyItemTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  historyItemMeta: {
    color: "#64748b",
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  historyItemDetail: {
    color: "#0f172a",
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 8,
    marginTop: 10,
  },
  historyDetailGrid: {
    gap: 4,
  },
  historyDetailItem: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
  historyObservaciones: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  contextBox: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginTop: 12,
    padding: 10,
  },
  contextHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: "900",
  },
  contextTitleDanger: {
    color: "#dc2626",
  },
  contextTitleInfo: {
    color: "#2563eb",
  },
  contextText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
  },
  historyChip: {
    alignSelf: "flex-start",
    borderRadius: 14,
    height: 32,
    paddingHorizontal: 10,
  },
  historyChipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  historyEmptyState: {
    alignItems: "center",
    paddingVertical: 28,
  },
  historyEmptyTitle: {
    color: "#0f172a",
    fontWeight: "800",
    marginBottom: 4,
  },
});
