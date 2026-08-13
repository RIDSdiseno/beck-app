import { clearMisObrasCache } from "@/services/api/obrasApi";
import {
  clearMisRegistrosCache,
  getMisRegistros,
  RegistroHistorialApi,
} from "@/services/api/registrosApi";
import {
  compartirPdfCliente,
  getClienteHistorial,
  RegistroCliente,
} from "@/services/api/clienteApi";
import { clearSession, getSession } from "@/services/auth/session";
import {
  estadoColor,
  formatDateTime,
  formatShortDate as formatDate,
  getEstadoLabel,
  shouldShowRejectionContext,
} from "@/utils/registroEstado";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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
    case "administrador": return "Administrador";
    case "terreno":       return "Terreno";
    case "jefeobra":      return "Supervisor";
    case "ingenieria":    return "Ingeniería";
    case "cliente":       return "Cliente";
    case "visualizador":  return "Visualizador";
    case "vendedor":      return "Vendedor";
    default:              return "Usuario";
  }
}

function formatDateShort(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}

function getInitials(name?: string) {
  const parts = String(name || "Usuario Beck")
    .trim()
    .split(/\s+/)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "B";
}

function preferirCopiasCorreccion(registros: RegistroHistorialApi[]) {
  const originalesConCopia = new Set(
    registros
      .map((registro) => registro.registro_origen_id)
      .filter((id): id is string => Boolean(id)),
  );

  return registros.filter(
    (registro) =>
      !(registro.estado === "rechazado" && originalesConCopia.has(registro.id)),
  );
}


function RegistroContextBox({ registro }: { registro: RegistroHistorialApi }) {
  if (!shouldShowRejectionContext(registro)) return null;

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
  beckStyle?: boolean;
};

function ProfileAction({ icon, label, onPress, beckStyle = false }: ProfileActionProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        beckStyle && styles.terrenoActionCard,
        pressed && styles.actionPressed,
      ]}
      onPress={onPress}
    >
      {beckStyle ? <View style={styles.terrenoActionAccent} /> : null}
      <View style={[styles.actionIcon, beckStyle && styles.terrenoActionIcon]}>
        <MaterialCommunityIcons
          name={icon}
          size={beckStyle ? 23 : 28}
          color={beckStyle ? "#0f172a" : "#f97316"}
        />
      </View>
      <View style={styles.actionInfo}>
        <Text style={[styles.actionLabel, beckStyle && styles.terrenoActionLabel]}>
          {label}
        </Text>
        {beckStyle ? (
          <Text style={styles.terrenoActionHint}>Consulta el estado de tus registros</Text>
        ) : null}
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={beckStyle ? 25 : 32}
        color={beckStyle ? "#c2410c" : "#64748b"}
      />
    </Pressable>
  );
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [registros, setRegistros] = useState<RegistroHistorialApi[]>([]);
  const [historialCliente, setHistorialCliente] = useState<RegistroCliente[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [selectedRegistro, setSelectedRegistro] = useState<RegistroCliente | null>(null);
  const [sharing, setSharing] = useState(false);

  const loadProfile = useCallback(async (forceRefresh = false) => {
    const session = await getSession();
    setUser(session.user);

    if (session.user?.rol === "jefeobra" || session.user?.rol === "terreno") {
      const data = await getMisRegistros(
        forceRefresh,
        session.user.rol === "jefeobra" ? { scope: "historial" } : undefined,
      );
      const registrosSinDuplicar = preferirCopiasCorreccion(data);
      setRegistros(
        session.user?.rol === "jefeobra"
          ? registrosSinDuplicar.filter(
              (registro) => registro.estado !== "pendiente",
            )
          : registrosSinDuplicar,
      );
    }

    if (session.user?.rol === "cliente") {
      try {
        const historial = await getClienteHistorial();
        setHistorialCliente(historial);
      } catch { /* silenciar */ }
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

  const handleSharePdf = async (
    registroId: string,
    codigoBeck: string | null,
  ) => {
    try {
      setSharing(true);
      await compartirPdfCliente(registroId, codigoBeck);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message ||
          "No se pudo descargar el PDF. Verifica tu conexión e intenta nuevamente.",
      );
    } finally {
      setSharing(false);
    }
  };

  const handleHistoryPress = () => {
    if (user?.rol === "terreno" || user?.rol === "jefeobra") {
      setShowHistory(true);
      return;
    }
    if (user?.rol === "cliente") {
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
    user?.rol === "terreno" ||
    user?.rol === "jefeobra" ||
    user?.rol === "ingenieria" ||
    user?.rol === "cliente";

  // ── Historial cliente ─────────────────────────────────────────────────────────
  if (showHistory && user?.rol === "cliente") {
    return (
      <>
        <SafeAreaView
          style={[styles.container, { paddingTop: insets.top + 2 }]}
          edges={["top", "left", "right"]}
        >
          <View style={styles.fixedHeader}>
            <View style={styles.fixedTopRow}>
              <View style={styles.fixedBrand}><BrandHeader subtitle="Registros validados · BECK" /></View>
              <Button mode="text" onPress={() => setShowHistory(false)}>Volver</Button>
            </View>
            <Text variant="titleLarge" style={styles.title}>Mis validaciones</Text>
            <Text style={styles.subtitle}>
              {historialCliente.length > 0
                ? `${historialCliente.length} ${historialCliente.length === 1 ? "registro validado" : "registros validados"} con tu firma.`
                : "Aún no has validado ningún registro."}
            </Text>
          </View>
          <ScrollView
            contentContainerStyle={[styles.content, styles.contentAfterFixedHeader]}
            refreshControl={
              <RefreshControl refreshing={refreshingHistory} onRefresh={async () => { setRefreshingHistory(true); await loadProfile(true); setRefreshingHistory(false); }} />
            }
          >
            {historialCliente.length > 0 ? (
              historialCliente.map((item) => {
                const isJunta = item.tipoRegistro === "junta_lineal_espuma";
                const hasPdf = item.pdfDisponible;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelectedRegistro(item)}
                    style={({ pressed }) => pressed ? { opacity: 0.82 } : undefined}
                  >
                    <Card style={styles.historyFullCard}>
                      <Card.Content>
                        <View style={styles.historyCardHeader}>
                          <View style={styles.historyTitleGroup}>
                            <Text style={styles.historyItemTitle}>{item.obraNombre || "Obra sin nombre"}</Text>
                            <Text style={styles.historyItemMeta}>
                              {item.obraCodigo || "Sin código"} · {formatDateShort(item.fecha)}
                            </Text>
                          </View>
                          <View style={styles.historyChipGroup}>
                            <Chip
                              compact
                              style={[styles.historyChip, { backgroundColor: "#2563eb" }]}
                              textStyle={styles.historyChipText}
                            >
                              Firmado
                            </Chip>
                            {hasPdf ? (
                              <MaterialCommunityIcons name="file-pdf-box" size={22} color="#16a34a" />
                            ) : null}
                          </View>
                        </View>
                        <Text style={styles.historyItemDetail}>
                          {item.descripcionMaterial || (isJunta ? "Junta Lineal Espuma" : "Sello Cortafuego")}
                        </Text>
                        <View style={styles.historyDetailGrid}>
                          <Text style={styles.historyDetailItem}>Tipo: {isJunta ? "Junta lineal espuma" : "Sello cortafuego"}</Text>
                          <Text style={styles.historyDetailItem}>Módulo: {item.modulo}</Text>
                          <Text style={styles.historyDetailItem}>Piso: {item.piso}</Text>
                          <Text style={styles.historyDetailItem}>Código: {item.codigoBeck || "-"}</Text>
                          {item.validadoClienteAt ? (
                            <Text style={styles.historyDetailItem}>Firmado el: {formatDateShort(item.validadoClienteAt)}</Text>
                          ) : null}
                        </View>
                        {hasPdf ? (
                          <View style={styles.historyPdfHint}>
                            <MaterialCommunityIcons name="share-variant" size={13} color="#16a34a" />
                            <Text style={styles.historyPdfHintText}>Toca para ver y compartir el PDF</Text>
                          </View>
                        ) : null}
                      </Card.Content>
                    </Card>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.historyEmptyState}>
                <Text style={styles.historyEmptyTitle}>Sin validaciones</Text>
                <Text style={styles.historyItemMeta}>
                  Los registros que valides con tu firma aparecerán aquí.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>

        {/* Modal PDF */}
        <Modal
          visible={selectedRegistro !== null}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedRegistro(null)}
        >
          <SafeAreaView style={styles.pdfModalContainer} edges={["top", "bottom"]}>
            <View style={styles.pdfModalHeader}>
              <Text style={styles.pdfModalTitle}>PDF Firmado</Text>
              <TouchableOpacity onPress={() => setSelectedRegistro(null)} style={styles.pdfModalClose}>
                <MaterialCommunityIcons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {selectedRegistro ? (
              <ScrollView contentContainerStyle={styles.pdfModalContent}>
                <Text style={styles.pdfModalItemTitle}>
                  {selectedRegistro.obraNombre || "Obra sin nombre"}
                </Text>
                <Text style={styles.pdfModalItemMeta}>
                  {selectedRegistro.obraCodigo || "Sin código"} · {formatDateShort(selectedRegistro.fecha)}
                </Text>
                <Text style={styles.pdfModalItemMeta}>
                  Código BECK: {selectedRegistro.codigoBeck || "-"}
                </Text>

                {selectedRegistro.pdfDisponible ? (
                  <>
                    <View style={styles.pdfPreviewBox}>
                      <MaterialCommunityIcons name="file-pdf-box" size={64} color="#16a34a" />
                      <Text style={styles.pdfPreviewTitle}>PDF firmado disponible</Text>
                      {selectedRegistro.validadoClienteAt ? (
                        <Text style={styles.pdfPreviewMeta}>
                          Firmado el {formatDateShort(selectedRegistro.validadoClienteAt)}
                        </Text>
                      ) : null}
                    </View>

                    <Button
                      mode="contained"
                      icon={sharing ? undefined : "share-variant"}
                      onPress={() =>
                        handleSharePdf(
                          selectedRegistro.id,
                          selectedRegistro.codigoBeck,
                        )
                      }
                      loading={sharing}
                      disabled={sharing}
                      style={styles.pdfShareBtn}
                      contentStyle={styles.pdfShareBtnContent}
                      labelStyle={styles.pdfShareBtnLabel}
                    >
                      {sharing ? "Descargando PDF..." : "Compartir PDF"}
                    </Button>

                    <Text style={styles.pdfShareHint}>
                      Puedes enviarlo por WhatsApp, correo, iMessage u otras aplicaciones.
                    </Text>
                  </>
                ) : (
                  <View style={styles.pdfNoUrl}>
                    <MaterialCommunityIcons name="file-pdf-box" size={48} color="#94a3b8" />
                    <Text style={styles.pdfNoUrlText}>PDF no disponible para este registro.</Text>
                    <Text style={styles.pdfNoUrlMeta}>Es posible que el PDF aún no se haya generado.</Text>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  if (showHistory && (user?.rol === "jefeobra" || user?.rol === "terreno")) {
    const isFixedHistoryHeader =
      user?.rol === "terreno" || user?.rol === "jefeobra" || user?.rol === "cliente";
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
            {user?.rol !== "terreno" && user?.rol !== "jefeobra" ? (
              <Text variant="titleLarge" style={styles.title}>
                {historyTitle}
              </Text>
            ) : null}
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
              const isTerrenoHistory = user?.rol === "terreno";

              return (
                <Card
                  key={item.id}
                  style={[
                    styles.historyFullCard,
                    user?.rol === "jefeobra" && styles.jefeHistoryFullCard,
                    isTerrenoHistory && styles.terrenoHistoryFullCard,
                  ]}
                >
                  <View
                    style={[
                      styles.historyCardClip,
                      user?.rol === "jefeobra" && styles.jefeHistoryCardClip,
                      isTerrenoHistory && styles.terrenoHistoryCardClip,
                    ]}
                  >
                  {user?.rol === "jefeobra" || isTerrenoHistory ? (
                    <View
                      style={[
                        styles.jefeHistoryAccent,
                        item.estado === "rechazado" && styles.jefeHistoryAccentRejected,
                        item.estado === "validado" && styles.jefeHistoryAccentValidated,
                      ]}
                    />
                  ) : null}
                  <Card.Content
                    style={[
                      user?.rol === "jefeobra" && styles.jefeHistoryContent,
                      isTerrenoHistory && styles.terrenoHistoryContent,
                    ]}
                  >
                    <View style={styles.historyCardHeader}>
                      {user?.rol === "jefeobra" || isTerrenoHistory ? (
                        <View
                          style={[
                            styles.jefeHistoryIcon,
                            isTerrenoHistory && styles.terrenoHistoryIcon,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={isJunta ? "ruler" : "fire"}
                            size={21}
                            color="#0f172a"
                          />
                        </View>
                      ) : null}
                      <View style={styles.historyTitleGroup}>
                        <Text
                          style={[
                            styles.historyItemTitle,
                            user?.rol === "jefeobra" && styles.jefeHistoryTitle,
                            isTerrenoHistory && styles.terrenoHistoryTitle,
                          ]}
                        >
                          {obraNombre}
                        </Text>
                        {user?.rol === "jefeobra" || isTerrenoHistory ? (
                          <View style={styles.jefeHistoryBadges}>
                            <Text style={styles.jefeHistoryCodeBadge}>
                              {item.obras?.codigo || "Sin código"}
                            </Text>
                            <Text style={styles.jefeHistoryDateBadge}>
                              {formatDate(item.fecha)}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.historyItemMeta}>
                            {item.obras?.codigo || "Sin código"} ·{" "}
                            {formatDate(item.fecha)}
                          </Text>
                        )}
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

                    <Text
                      style={[
                        styles.historyItemDetail,
                        isTerrenoHistory && styles.terrenoHistoryItemDetail,
                      ]}
                    >
                      {item.descripcion_material}
                    </Text>

                    <View
                      style={[
                        styles.historyDetailGrid,
                        user?.rol === "jefeobra" && styles.jefeHistoryDetailGrid,
                        isTerrenoHistory && styles.terrenoHistoryDetailGrid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.historyDetailItem,
                          isTerrenoHistory && styles.terrenoHistoryDetailItem,
                        ]}
                      >
                        Tipo: {isJunta ? "Junta lineal espuma" : "Sello cortafuego"}
                      </Text>
                      <Text
                        style={[
                          styles.historyDetailItem,
                          isTerrenoHistory && styles.terrenoHistoryDetailItem,
                        ]}
                      >
                        Módulo: {item.modulo}
                      </Text>
                      <Text
                        style={[
                          styles.historyDetailItem,
                          isTerrenoHistory && styles.terrenoHistoryDetailItem,
                        ]}
                      >
                        Piso: {item.piso}
                      </Text>
                      {user?.rol === "jefeobra" || isTerrenoHistory ? (
                        <Text
                          style={[
                            styles.historyDetailItem,
                            isTerrenoHistory && styles.terrenoHistoryDetailItem,
                          ]}
                        >
                          Nº sello: {item.numero_sello || "—"}
                        </Text>
                      ) : null}
                      <Text
                        style={[
                          styles.historyDetailItem,
                          isTerrenoHistory && styles.terrenoHistoryDetailItem,
                        ]}
                      >
                        Eje: {item.eje_numerico}-{item.eje_alfabetico}
                      </Text>
                      <Text
                        style={[
                          styles.historyDetailItem,
                          isTerrenoHistory && styles.terrenoHistoryDetailItem,
                        ]}
                      >
                        {isJunta
                          ? `Metros lineales: ${item.metros_lineales || 0}`
                          : `Sellos: ${item.cantidad_sellos}`}
                      </Text>
                      <Text
                        style={[
                          styles.historyDetailItem,
                          isTerrenoHistory && styles.terrenoHistoryDetailItem,
                        ]}
                      >
                        Responsable:{" "}
                        {item.usuarios?.nombre || item.nombre_sellador}
                      </Text>
                    </View>

                    {item.observaciones ? (
                      <Text
                        style={[
                          styles.historyObservaciones,
                          isTerrenoHistory && styles.terrenoHistoryObservaciones,
                        ]}
                      >
                        Observaciones: {item.observaciones}
                      </Text>
                    ) : null}

                    <RegistroContextBox registro={item} />
                  </Card.Content>
                  </View>
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

  const isTerrenoProfile = user?.rol === "terreno";
  const isSupervisorProfile = user?.rol === "jefeobra";
  const isEngineeringProfile = user?.rol === "ingenieria";
  const isBeckFieldProfile =
    isTerrenoProfile || isSupervisorProfile || isEngineeringProfile;

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      {isFixedProfileHeader ? (
        <View style={styles.fixedHeader}>
          <BrandHeader
            subtitle={
              isTerrenoProfile
                ? "Perfil · Operario"
                : isSupervisorProfile
                  ? "Perfil · Supervisor"
                  : isEngineeringProfile
                    ? "Perfil · Ingeniería"
                  : "Perfil · BECK"
            }
          />
          {!isBeckFieldProfile ? (
            <>
              <Text variant="titleLarge" style={styles.title}>Perfil</Text>
              <Text style={styles.subtitle}>
                {user?.rol === "jefeobra"
                  ? "Sesión activa del Supervisor."
                  : "Sesión activa del Cliente."}
              </Text>
            </>
          ) : null}
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
            <Text style={styles.subtitle}>Sesion activa del Operario.</Text>
          </>
        ) : null}

        <View style={[styles.profileCard, isBeckFieldProfile && styles.terrenoProfileCard]}>
          {isBeckFieldProfile ? <View style={styles.terrenoProfileAccent} /> : null}
          {isBeckFieldProfile ? (
            <View style={styles.terrenoSessionBadge}>
              <View style={styles.terrenoSessionDot} />
              <Text style={styles.terrenoSessionText}>Sesión activa</Text>
            </View>
          ) : null}
          <Avatar.Text
            size={isBeckFieldProfile ? 74 : 82}
            label={getInitials(user?.nombre)}
            style={[styles.avatar, isBeckFieldProfile && styles.terrenoAvatar]}
            labelStyle={[styles.avatarLabel, isBeckFieldProfile && styles.terrenoAvatarLabel]}
          />

          <Text style={[styles.name, isBeckFieldProfile && styles.terrenoName]}>
            {user?.nombre || "Usuario Beck"}
          </Text>
          {isBeckFieldProfile ? (
            <View style={styles.terrenoEmailRow}>
              <MaterialCommunityIcons name="email-outline" size={15} color="#64748b" />
              <Text style={styles.terrenoEmail}>{user?.email || "Sin correo"}</Text>
            </View>
          ) : (
            <Text style={styles.email}>{user?.email || "Sin correo"}</Text>
          )}

          <View style={[styles.rolePill, isBeckFieldProfile && styles.terrenoRolePill]}>
            <MaterialCommunityIcons
              name="badge-account-outline"
              size={16}
              color={isBeckFieldProfile ? "#0f172a" : "#ffffff"}
            />
            <Text style={[styles.roleText, isBeckFieldProfile && styles.terrenoRoleText]}>
              {isTerrenoProfile ? "Operario" : getRoleLabel(user?.rol)}
            </Text>
          </View>

          <View style={styles.divider} />

          <Button
            mode="contained"
            onPress={handleLogout}
            buttonColor="#dc2626"
            textColor="#ffffff"
            style={[styles.logoutButton, isBeckFieldProfile && styles.terrenoLogoutButton]}
            contentStyle={styles.logoutButtonContent}
            labelStyle={styles.logoutLabel}
          >
            Cerrar sesión
          </Button>
        </View>

        {isBeckFieldProfile ? (
          <Text style={styles.terrenoProfileSectionTitle}>Mi actividad</Text>
        ) : null}
        <View style={styles.actions}>
          <ProfileAction
            icon="clipboard-text-clock-outline"
            label="Historial de registros"
            onPress={handleHistoryPress}
            beckStyle={isBeckFieldProfile}
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
  terrenoProfileCard: {
    backgroundColor: "#fffdf7",
    borderColor: "#FDC10B",
    borderRadius: 20,
    marginBottom: 14,
    overflow: "hidden",
    paddingBottom: 18,
    paddingTop: 20,
    shadowOpacity: 0.08,
  },
  terrenoProfileAccent: {
    backgroundColor: "#FDC10B",
    height: 6,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  terrenoSessionBadge: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    marginBottom: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  terrenoSessionDot: {
    backgroundColor: "#16a34a",
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  terrenoSessionText: {
    color: "#166534",
    fontSize: 9,
    fontWeight: "900",
  },
  avatar: {
    backgroundColor: "#fff7ed",
  },
  terrenoAvatar: {
    backgroundColor: "#FDC10B",
    borderColor: "#0f172a",
    borderWidth: 3,
  },
  avatarLabel: {
    color: "#f97316",
    fontSize: 24,
    fontWeight: "900",
  },
  terrenoAvatarLabel: {
    color: "#0f172a",
    fontSize: 22,
  },
  name: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 16,
    textAlign: "center",
  },
  terrenoName: {
    fontSize: 19,
    marginTop: 12,
  },
  email: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  terrenoEmailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 5,
  },
  terrenoEmail: {
    color: "#64748b",
    fontSize: 12,
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
  terrenoRolePill: {
    backgroundColor: "#FDC10B",
    marginTop: 9,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  roleText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  terrenoRoleText: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "900",
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
  terrenoLogoutButton: {
    alignSelf: "stretch",
    borderRadius: 13,
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
  terrenoProfileSectionTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 9,
    marginTop: 2,
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
  terrenoActionCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
    borderRadius: 15,
    minHeight: 64,
    overflow: "hidden",
    paddingHorizontal: 12,
    shadowOpacity: 0.05,
  },
  terrenoActionAccent: {
    backgroundColor: "#f97316",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 5,
  },
  actionPressed: {
    opacity: 0.72,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  terrenoActionIcon: {
    backgroundColor: "#FDC10B",
    borderRadius: 11,
    height: 40,
    width: 40,
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    color: "#0f172a",
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
  },
  terrenoActionLabel: {
    flex: 0,
    fontSize: 14,
  },
  terrenoActionHint: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 2,
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
  },
  historyCardClip: {
    borderRadius: 14,
    overflow: "hidden",
  },
  jefeHistoryFullCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
    borderRadius: 16,
    marginBottom: 9,
  },
  jefeHistoryCardClip: {
    borderRadius: 16,
  },
  terrenoHistoryFullCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
    borderRadius: 15,
    marginBottom: 7,
  },
  terrenoHistoryCardClip: {
    borderRadius: 15,
  },
  jefeHistoryAccent: {
    backgroundColor: "#f97316",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 5,
  },
  jefeHistoryAccentRejected: {
    backgroundColor: "#dc2626",
  },
  jefeHistoryAccentValidated: {
    backgroundColor: "#16a34a",
  },
  jefeHistoryContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  terrenoHistoryContent: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  historyCardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  jefeHistoryIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  terrenoHistoryIcon: {
    borderRadius: 10,
    height: 34,
    width: 34,
  },
  historyTitleGroup: {
    flex: 1,
  },
  historyItemTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  jefeHistoryTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  terrenoHistoryTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  jefeHistoryBadges: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 5,
  },
  jefeHistoryCodeBadge: {
    backgroundColor: "#0f172a",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  jefeHistoryDateBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    color: "#92400e",
    fontSize: 9,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 3,
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
  terrenoHistoryItemDetail: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginBottom: 6,
    marginTop: 7,
  },
  historyDetailGrid: {
    gap: 4,
  },
  jefeHistoryDetailGrid: {
    backgroundColor: "rgba(253, 193, 11, 0.12)",
    borderRadius: 11,
    padding: 9,
  },
  terrenoHistoryDetailGrid: {
    backgroundColor: "#ffffff",
    borderColor: "#fde68a",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  historyDetailItem: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
  },
  terrenoHistoryDetailItem: {
    flexGrow: 1,
    fontSize: 10,
    lineHeight: 14,
    minWidth: "46%",
  },
  historyObservaciones: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  terrenoHistoryObservaciones: {
    backgroundColor: "#f8fafc",
    borderRadius: 9,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 6,
    padding: 7,
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

  // Chips agrupados en historial cliente
  historyChipGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  historyPdfHint: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 10,
  },
  historyPdfHintText: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "700",
  },

  // Modal PDF
  pdfModalContainer: {
    backgroundColor: "#f5f7fb",
    flex: 1,
  },
  pdfModalHeader: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pdfModalTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  pdfModalClose: {
    padding: 4,
  },
  pdfModalContent: {
    padding: 20,
    paddingBottom: 48,
  },
  pdfModalItemTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  pdfModalItemMeta: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 2,
  },
  pdfPreviewBox: {
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 24,
    marginBottom: 20,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  pdfPreviewTitle: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  pdfPreviewMeta: {
    color: "#4ade80",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  pdfShareBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
  },
  pdfShareBtnContent: {
    minHeight: 52,
  },
  pdfShareBtnLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  pdfShareHint: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    textAlign: "center",
  },
  pdfNoUrl: {
    alignItems: "center",
    gap: 8,
    marginTop: 40,
    paddingVertical: 20,
  },
  pdfNoUrlText: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  pdfNoUrlMeta: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
  },
});
