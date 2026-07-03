import type { RegistroHistorialApi } from "@/services/api/registrosApi";
import {
  formatDateTime,
  shouldShowRejectionContext,
} from "@/utils/registroEstado";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function RegistroContextBox({
  registro,
}: {
  registro: RegistroHistorialApi;
}) {
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

const styles = StyleSheet.create({
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
});
