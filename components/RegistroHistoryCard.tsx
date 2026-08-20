import type { RegistroCliente } from "@/services/api/clienteApi";
import type { RegistroHistorialApi } from "@/services/api/registrosApi";
import { formatTime24WithPeriod } from "@/utils/dateTime";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  registro: RegistroHistorialApi | RegistroCliente;
  onPress: () => void;
  pdfDisponible?: boolean;
};

function isHistorial(
  registro: RegistroHistorialApi | RegistroCliente,
): registro is RegistroHistorialApi {
  return "tipo_registro" in registro;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function statusLabel(value: string) {
  switch (value) {
    case "en_revision": return "En revisión";
    case "validado": return "Validado";
    case "rechazado": return "Rechazado";
    default: return "Pendiente";
  }
}

function statusStyle(value: string) {
  switch (value) {
    case "firmado": return styles.statusSigned;
    case "en_revision": return styles.statusReview;
    case "validado": return styles.statusValidated;
    case "rechazado": return styles.statusRejected;
    default: return styles.statusPending;
  }
}

export function RegistroHistoryCard({ registro, onPress, pdfDisponible }: Props) {
  const historial = isHistorial(registro);
  const tipo = historial ? registro.tipo_registro : registro.tipoRegistro;
  const estado = registro.estado;
  const estadoVisible = !historial && registro.validadoCliente ? "firmado" : estado;
  const obraNombre = historial ? registro.obras?.nombre : registro.obraNombre;
  const obraCodigo = historial ? registro.obras?.codigo : registro.obraCodigo;
  const piso = registro.piso || "—";
  const numeroSello = historial ? registro.numero_sello : registro.numeroSello;
  const responsable = historial
    ? registro.usuarios?.nombre || registro.nombre_sellador
    : registro.nombreSellador || registro.sellador;
  const createdAt = historial ? registro.created_at : registro.createdAt;
  const isJunta = tipo === "junta_lineal_espuma";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ver registro completo y fotografías"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.accent} />
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons
            name={isJunta ? "ruler" : "fire"}
            size={21}
            color="#0f172a"
          />
        </View>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>
            {isJunta ? "Junta lineal espuma" : "Sello cortafuego"}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {obraNombre || "Obra sin nombre"} · {obraCodigo || "Sin código"}
          </Text>
        </View>
        <View style={styles.statusGroup}>
          <Text style={[styles.status, statusStyle(estadoVisible)]}>
            {estadoVisible === "firmado" ? "Firmado" : statusLabel(estadoVisible)}
          </Text>
          {pdfDisponible ? (
            <MaterialCommunityIcons name="file-pdf-box" size={18} color="#16a34a" />
          ) : null}
        </View>
      </View>

      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={16} color="#f97316" />
          <Text style={styles.summaryText} numberOfLines={1}>
            Piso {piso}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="account-outline" size={16} color="#f97316" />
          <Text style={styles.summaryText} numberOfLines={1}>
            Responsable: {responsable || "Sin responsable"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <MaterialCommunityIcons name="calendar-outline" size={16} color="#f97316" />
          <Text style={styles.summaryText} numberOfLines={1}>
            {formatDate(registro.fecha)} · {formatTime24WithPeriod(createdAt)} · Sello {numeroSello || "N/A"}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerTextGroup}>
          <MaterialCommunityIcons name="eye-outline" size={15} color="#c2410c" />
          <Text style={styles.footerText}>Ver registro completo y fotografías</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={19} color="#c2410c" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffaf0",
    borderColor: "#fbbf24",
    borderRadius: 15,
    borderWidth: 1,
    elevation: 3,
    marginBottom: 12,
    padding: 11,
    paddingLeft: 13,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  accent: { backgroundColor: "#f97316", bottom: 0, left: 0, position: "absolute", top: 0, width: 4 },
  header: { alignItems: "center", flexDirection: "row", gap: 9 },
  iconBox: { alignItems: "center", backgroundColor: "#ffc400", borderRadius: 10, height: 38, justifyContent: "center", width: 38 },
  titleGroup: { flex: 1, minWidth: 0 },
  title: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  subtitle: { color: "#64748b", fontSize: 11, fontWeight: "600", marginTop: 1 },
  statusGroup: { alignItems: "flex-end", gap: 3 },
  status: { borderRadius: 999, fontSize: 10, fontWeight: "800", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 4 },
  statusPending: { backgroundColor: "#ffc400", color: "#0f172a" },
  statusSigned: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  statusReview: { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  statusValidated: { backgroundColor: "#dcfce7", color: "#166534" },
  statusRejected: { backgroundColor: "#fee2e2", color: "#b91c1c" },
  summaryBox: { backgroundColor: "#fffdf8", borderColor: "#fed7aa", borderRadius: 11, borderWidth: 1, gap: 4, marginTop: 9, paddingHorizontal: 10, paddingVertical: 7 },
  summaryRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  summaryText: { color: "#475569", flex: 1, fontSize: 11, fontWeight: "600" },
  footer: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 1, paddingTop: 8 },
  footerTextGroup: { alignItems: "center", flexDirection: "row", gap: 5 },
  footerText: { color: "#c2410c", fontSize: 11, fontWeight: "800" },
});
