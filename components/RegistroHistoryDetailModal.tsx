import type { RegistroCliente } from "@/services/api/clienteApi";
import { getConfiguracionRegistro } from "@/services/api/obrasApi";
import type { RegistroHistorialApi } from "@/services/api/registrosApi";
import { getSession } from "@/services/auth/session";
import { formatTime24WithPeriod } from "@/utils/dateTime";
import { getAislacionLabel, getAplicacionLabel } from "@/utils/factoresRegistro";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ReactNode, useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { ExpandableImage } from "./ExpandableImage";

type RegistroHistoryDetailModalProps = {
  registro: RegistroHistorialApi | RegistroCliente | null;
  onClose: () => void;
  footer?: ReactNode;
};

type DetailPhoto = { id: string; url: string };

function isRegistroHistorial(
  registro: RegistroHistorialApi | RegistroCliente,
): registro is RegistroHistorialApi {
  return "tipo_registro" in registro;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function estadoLabel(value?: string | null) {
  switch (value) {
    case "pendiente": return "Pendiente";
    case "en_revision": return "En revisión";
    case "validado": return "Validado";
    case "rechazado": return "Rechazado";
    case "firmado": return "Firmado";
    default: return value || "Sin estado";
  }
}

function estadoStyle(value?: string | null) {
  switch (value) {
    case "validado": return styles.statusValidated;
    case "rechazado": return styles.statusRejected;
    case "firmado": return styles.statusSigned;
    case "en_revision": return styles.statusReview;
    default: return styles.statusPending;
  }
}

function getHistorialPhotos(registro: RegistroHistorialApi): DetailPhoto[] {
  const own = registro.fotos || [];
  const origin = registro.registro_origen?.fotos || [];
  const fallbackUrls = [
    ...(Array.isArray(registro.fotos_urls) ? registro.fotos_urls : []),
    registro.foto_url,
    ...(Array.isArray(registro.registro_origen?.fotos_urls)
      ? registro.registro_origen.fotos_urls
      : []),
    registro.registro_origen?.foto_url,
  ].filter((url): url is string => Boolean(url));
  const candidates = own.length
    ? own.map(({ id, url }) => ({ id, url }))
    : origin.length
      ? origin.map(({ id, url }) => ({ id, url }))
      : fallbackUrls.map((url, index) => ({
          id: `${registro.id}-foto-${index}`,
          url,
        }));
  const seen = new Set<string>();
  return candidates.filter((foto) => {
    if (!foto.url || seen.has(foto.url)) return false;
    seen.add(foto.url);
    return true;
  });
}

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

export function RegistroHistoryDetailModal({
  registro,
  onClose,
  footer,
}: RegistroHistoryDetailModalProps) {
  const [dimensionesVisible, setDimensionesVisible] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadVisibility() {
      if (!registro) {
        setDimensionesVisible(true);
        return;
      }

      const obraId = isRegistroHistorial(registro)
        ? registro.obras?.id
        : registro.obraId;

      if (!obraId) {
        setDimensionesVisible(true);
        return;
      }

      try {
        const { user } = await getSession();
        const rol = user?.rol === "terreno"
          ? "trabajador"
          : user?.rol === "jefeobra" || user?.rol === "ingenieria" || user?.rol === "cliente"
            ? user.rol
            : null;

        if (!rol) {
          setDimensionesVisible(true);
          return;
        }

        const configuracion = await getConfiguracionRegistro(obraId, rol);
        const campo = configuracion.find((item) => item.campo === "dimensiones");
        if (active) setDimensionesVisible(campo?.visible ?? true);
      } catch {
        if (active) setDimensionesVisible(true);
      }
    }

    void loadVisibility();
    return () => {
      active = false;
    };
  }, [registro]);

  const detail = useMemo(() => {
    if (!registro) return null;
    if (isRegistroHistorial(registro)) {
      return {
        obraNombre: registro.obras?.nombre || "Obra sin nombre",
        obraCodigo: registro.obras?.codigo || "Sin código",
        estado: registro.estado,
        tipoRegistro: registro.tipo_registro,
        fecha: registro.fecha,
        createdAt: registro.created_at,
        diaSemana: registro.dia_semana,
        responsable: registro.usuarios?.nombre || registro.nombre_sellador,
        itemizadoBeck: registro.itemizado_beck || registro.descripcion_material,
        dimensiones: registro.dimensiones,
        codigoBeck: registro.codigo_beck,
        itemizadoMandante: registro.itemizado_mandante || registro.itemizado_sacyr,
        recinto: registro.recinto,
        modulo: registro.modulo,
        piso: registro.piso,
        ejeAlfabetico: registro.eje_alfabetico,
        ejeNumerico: registro.eje_numerico,
        numeroSello: registro.numero_sello,
        cantidadSellos: registro.cantidad_sellos,
        metrosLineales: registro.metros_lineales,
        holgura: registro.holgura,
        factorHolguras: registro.factor_por_holguras,
        accesibilidad: registro.accesibilidad,
        cantidadConFactores: registro.cantidad_sellos_con_factores,
        aislacion: registro.aislacion,
        aislacionAplica: registro.aislacion_aplica,
        cantidadAislacion: registro.cantidad_sellos_aislacion,
        reparacionTabique: registro.reparacion_tabique,
        cantidadFinal: registro.cantidad_final,
        folio: registro.folio,
        observaciones: registro.observaciones,
        rechazo: registro.motivo_rechazo || registro.registro_origen?.motivo_rechazo,
        fotos: getHistorialPhotos(registro),
      };
    }

    return {
      obraNombre: registro.obraNombre || "Obra sin nombre",
      obraCodigo: registro.obraCodigo || "Sin código",
      estado: registro.validadoCliente ? "firmado" : registro.estado,
      tipoRegistro: registro.tipoRegistro,
      fecha: registro.fecha,
      createdAt: registro.createdAt,
      diaSemana: registro.diaSemana,
      responsable: registro.nombreSellador || registro.sellador,
      itemizadoBeck: registro.itemizadoBeck || registro.descripcionMaterial || registro.material,
      dimensiones: registro.dimensiones,
      codigoBeck: registro.codigoBeck,
      itemizadoMandante: registro.itemizadoMandante,
      recinto: registro.recinto,
      modulo: registro.modulo,
      piso: registro.piso,
      ejeAlfabetico: registro.ejeAlfabetico,
      ejeNumerico: registro.ejeNumerico,
      numeroSello: registro.numeroSello,
      cantidadSellos: registro.cantidadSellos,
      metrosLineales: registro.metrosLineales,
      holgura: registro.holgura,
      factorHolguras: registro.factorPorHolguras,
      accesibilidad: registro.accesibilidad,
      cantidadConFactores: registro.cantidadSellosConFactores,
      aislacion: registro.aislacion,
      aislacionAplica: registro.aislacionAplica,
      cantidadAislacion: registro.cantidadSellosAislacion,
      reparacionTabique: registro.reparacionTabique,
      cantidadFinal: registro.cantidadFinal,
      folio: registro.folio,
      observaciones: registro.observaciones,
      rechazo: null,
      fotos: (registro.fotos || []).map(({ id, url }) => ({ id, url })),
    };
  }, [registro]);

  const isJunta = detail?.tipoRegistro === "junta_lineal_espuma";

  return (
    <Modal
      visible={Boolean(registro)}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Detalle del registro</Text>
            <Text style={styles.headerSubtitle}>Información y evidencia enviada</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle del registro"
            onPress={onClose}
            hitSlop={12}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons name="close" size={25} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {detail ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <View style={styles.heroAccent} />
              <View style={styles.heroHeading}>
                <View style={styles.iconBox}>
                  <MaterialCommunityIcons
                    name={isJunta ? "ruler" : "fire"}
                    size={23}
                    color="#0f172a"
                  />
                </View>
                <View style={styles.heroText}>
                  <Text style={styles.recordType}>
                    {isJunta ? "Junta lineal espuma" : "Sello cortafuego"}
                  </Text>
                  <Text style={styles.obraName} numberOfLines={1}>
                    {detail.obraNombre} · {detail.obraCodigo}
                  </Text>
                </View>
                <Text style={[styles.status, estadoStyle(detail.estado)]}>
                  {estadoLabel(detail.estado)}
                </Text>
              </View>

              <View style={styles.heroSummary}>
                <View style={styles.summaryRow}>
                  <MaterialCommunityIcons name="map-marker-outline" size={17} color="#f97316" />
                  <Text style={styles.summaryText} numberOfLines={1}>
                    Piso {detail.piso || "—"} · Eje {detail.ejeNumerico || "N/A"}-{detail.ejeAlfabetico || "No aplica"}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <MaterialCommunityIcons name="calendar-outline" size={17} color="#f97316" />
                  <Text style={styles.summaryText} numberOfLines={1}>
                    {formatDate(detail.fecha)} · {formatTime24WithPeriod(detail.createdAt)} · {isJunta ? "Junta lineal" : `Sello ${detail.numeroSello || "N/A"}`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={19} color="#c2410c" />
                <Text style={styles.sectionTitle}>Datos del registro</Text>
              </View>
              <View style={styles.grid}>
                <DetailField label="Fecha de ejecución" value={formatDate(detail.fecha)} />
                <DetailField label="Día" value={detail.diaSemana} />
                <DetailField label="Responsable" value={detail.responsable} />
                <DetailField label="Itemizado Beck" value={detail.itemizadoBeck} />
                {dimensionesVisible ? (
                  <DetailField label="Dimensiones" value={detail.dimensiones} />
                ) : null}
                <DetailField label="Código Beck" value={detail.codigoBeck} />
                <DetailField label="Itemizado mandante" value={detail.itemizadoMandante} />
                <DetailField label="Recinto" value={detail.recinto} />
                <DetailField label="Módulo o edificio" value={detail.modulo} />
                <DetailField label="Piso" value={detail.piso} />
                <DetailField label="Eje alfabético" value={detail.ejeAlfabetico} />
                <DetailField label="Eje numérico" value={detail.ejeNumerico} />
                {isJunta ? (
                  <DetailField label="Metros lineales" value={detail.metrosLineales} />
                ) : (
                  <>
                    <DetailField label="N° del sello" value={detail.numeroSello} />
                    <DetailField label="Cantidad de sellos" value={detail.cantidadSellos} />
                    <DetailField label="Holgura" value={detail.holgura} />
                    <DetailField label="Factor por holguras" value={detail.factorHolguras} />
                    <DetailField label="Accesibilidad" value={detail.accesibilidad} />
                    <DetailField label="Sellos con factores" value={detail.cantidadConFactores} />
                    <DetailField
                      label="Aislación"
                      value={getAislacionLabel({
                        aislacion: detail.aislacion,
                        aislacionAplica: detail.aislacionAplica,
                      })}
                    />
                    <DetailField label="Sellos por aislación" value={detail.cantidadAislacion} />
                    <DetailField label="Reparación de tabique" value={getAplicacionLabel(detail.reparacionTabique)} />
                    <DetailField label="Cantidad final" value={detail.cantidadFinal} />
                  </>
                )}
                <DetailField label="Folio" value={detail.folio} />
              </View>
              {detail.observaciones ? (
                <View style={styles.observation}>
                  <Text style={styles.fieldLabel}>Observaciones</Text>
                  <Text style={styles.fieldValue}>{detail.observaciones}</Text>
                </View>
              ) : null}
              {detail.rechazo ? (
                <View style={styles.rejection}>
                  <Text style={styles.rejectionTitle}>Contexto de rechazo</Text>
                  <Text style={styles.rejectionText}>{detail.rechazo}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="camera-outline" size={19} color="#c2410c" />
                <Text style={styles.sectionTitle}>Fotografías enviadas</Text>
              </View>
              {detail.fotos.length ? (
                <View style={styles.photos}>
                  {detail.fotos.map((foto, index) => (
                    <View key={foto.id} style={styles.photoCard}>
                      <ExpandableImage
                        uri={foto.url}
                        style={styles.photo}
                        accessibilityLabel={`Ver fotografía ${index + 1} en pantalla completa`}
                      />
                      <Text style={styles.photoHint}>Toca la fotografía para verla en grande</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noPhotos}>
                  <MaterialCommunityIcons name="image-off-outline" size={30} color="#94a3b8" />
                  <Text style={styles.noPhotosText}>Este registro no tiene fotografías disponibles.</Text>
                </View>
              )}
            </View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f7fb" },
  header: { alignItems: "center", backgroundColor: "#fffaf0", borderBottomColor: "#fed7aa", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 14 },
  headerText: { flex: 1 },
  headerTitle: { color: "#0f172a", fontSize: 19, fontWeight: "900" },
  headerSubtitle: { color: "#64748b", fontSize: 12, marginTop: 2 },
  closeButton: { alignItems: "center", backgroundColor: "#ffc400", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  content: { gap: 12, padding: 16, paddingBottom: 32 },
  hero: { backgroundColor: "#fffaf0", borderColor: "#fbbf24", borderRadius: 18, borderWidth: 1, elevation: 2, padding: 14, paddingLeft: 17, shadowColor: "#0f172a", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5 },
  heroAccent: { backgroundColor: "#f97316", borderBottomLeftRadius: 18, borderTopLeftRadius: 18, bottom: 0, left: 0, position: "absolute", top: 0, width: 5 },
  heroHeading: { alignItems: "center", flexDirection: "row", gap: 9 },
  iconBox: { alignItems: "center", backgroundColor: "#ffc400", borderRadius: 11, height: 42, justifyContent: "center", width: 42 },
  heroText: { flex: 1, minWidth: 0 },
  obraName: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 2 },
  recordType: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
  heroSummary: { backgroundColor: "#fffdf8", borderColor: "#fed7aa", borderRadius: 12, borderWidth: 1, gap: 5, marginTop: 11, paddingHorizontal: 11, paddingVertical: 8 },
  summaryRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  summaryText: { color: "#475569", flex: 1, fontSize: 12, fontWeight: "600" },
  status: { borderRadius: 999, fontSize: 11, fontWeight: "800", overflow: "hidden", paddingHorizontal: 10, paddingVertical: 5 },
  statusPending: { backgroundColor: "#ffc400", color: "#0f172a" },
  statusSigned: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  statusReview: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  statusValidated: { backgroundColor: "#dcfce7", color: "#166534" },
  statusRejected: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  section: { backgroundColor: "#fffaf0", borderColor: "#fed7aa", borderRadius: 18, borderWidth: 1, padding: 14 },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 12 },
  sectionTitle: { color: "#0f172a", fontSize: 15, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: { backgroundColor: "#fff", borderColor: "#fed7aa", borderRadius: 12, borderWidth: 1, minWidth: "47%", padding: 10 },
  fieldLabel: { color: "#64748b", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  fieldValue: { color: "#0f172a", fontSize: 13, fontWeight: "600", marginTop: 3 },
  observation: { backgroundColor: "#fff", borderColor: "#fed7aa", borderRadius: 12, borderWidth: 1, marginTop: 8, padding: 11 },
  rejection: { backgroundColor: "#fff1f2", borderColor: "#fecdd3", borderRadius: 12, borderWidth: 1, marginTop: 10, padding: 11 },
  rejectionTitle: { color: "#be123c", fontSize: 12, fontWeight: "800" },
  rejectionText: { color: "#881337", fontSize: 12, marginTop: 3 },
  photos: { gap: 12 },
  photoCard: { backgroundColor: "#fff", borderColor: "#fbbf24", borderRadius: 16, borderWidth: 1, overflow: "hidden", padding: 8 },
  photo: { borderRadius: 12, height: 240, width: "100%" },
  photoHint: { color: "#64748b", fontSize: 11, marginTop: 7, textAlign: "center" },
  noPhotos: { alignItems: "center", backgroundColor: "#fff", borderColor: "#fed7aa", borderRadius: 14, borderWidth: 1, gap: 7, padding: 22 },
  noPhotosText: { color: "#64748b", fontSize: 12, textAlign: "center" },
  footer: { marginTop: 2 },
});
