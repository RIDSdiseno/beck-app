import React, { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { AsignacionBodega } from "@/services/api/bodegaBeckApi";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
type Props = {
  item: AsignacionBodega;
  busy: boolean;
  onTrace: (item: AsignacionBodega) => void;
  onLabels: (item: AsignacionBodega) => void;
  onReceive: (item: AsignacionBodega) => void;
};

function Detail({
  icon,
  label,
  value,
}: {
  icon: Icon;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name={icon} size={18} color="#9a7100" />
      <Text style={[styles.detailValue, styles.detailText]}>
        <Text style={styles.inlineLabel}>{label}: </Text>
        {value}
      </Text>
    </View>
  );
}

export const BodegaAssignmentCard = memo(function BodegaAssignmentCard({
  item,
  busy,
  onTrace,
  onLabels,
  onReceive,
}: Props) {
  const [showCodes, setShowCodes] = useState(false);
  const returned = item.estado === "devuelto";
  const pending = item.pendienteBodega;
  const status = pending
    ? {
        label: "Por recibir en bodega",
        color: "#9a3412",
        bg: "#fff1e6",
        border: "#f97316",
        icon: "clock-outline" as const,
      }
    : returned
      ? {
          label: "Devuelto a bodega",
          color: "#166534",
          bg: "#ecfdf3",
          border: "#22c55e",
          icon: "check-circle-outline" as const,
        }
      : {
          label: "Asignado",
          color: "#795700",
          bg: "#fff5ce",
          border: "#ffc400",
          icon: "account-check-outline" as const,
        };
  const codes = showCodes ? item.subSkus : item.subSkus.slice(0, 2);

  return (
    <View style={[styles.card, { borderLeftColor: status.border }]}>
      <View style={styles.heading}>
        <View style={styles.icon}>
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={21}
            color="#0f172a"
          />
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{item.nombre}</Text>
        </View>
        <View style={styles.quantity}>
          <Text style={styles.quantityValue}>{item.cantidad}</Text>
          <Text style={styles.quantityLabel}>
            {item.cantidad === 1 ? "unidad" : "unidades"}
          </Text>
        </View>
      </View>
      <View style={styles.meta}>
        <View style={[styles.status, { backgroundColor: status.bg }]}>
          <MaterialCommunityIcons
            name={status.icon}
            size={15}
            color={status.color}
          />
          <Text style={[styles.statusLabel, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        <View style={styles.dateRow}>
          <MaterialCommunityIcons
            name="calendar-clock-outline"
            size={15}
            color="#64748b"
          />
          <Text style={styles.date}>
            {new Date(item.fecha).toLocaleString("es-CL")}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        <Detail icon="office-building-outline" label="Obra" value={item.obra} />
        <Detail
          icon="account-hard-hat"
          label="Supervisor"
          value={item.supervisor}
        />
        {!!item.operario && (
          <Detail
            icon="account-outline"
            label="Operario"
            value={item.operario}
          />
        )}
      </View>
      {!!item.subSkus.length && (
        <View style={styles.codes}>
          <View style={styles.codeHeading}>
            <MaterialCommunityIcons name="barcode" size={19} color="#64748b" />
            <Text
              selectable
              accessibilityLabel={`Códigos unitarios: ${codes.join(", ")}`}
              style={styles.codeText}
            >
              {codes.join(" · ")}
            </Text>
          </View>
          {item.subSkus.length > 2 && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showCodes }}
              onPress={() => setShowCodes((v) => !v)}
              style={({ pressed }) => [
                styles.expandCodes,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.expandText}>
                {showCodes
                  ? "Ver menos códigos"
                  : `Ver todos (${item.subSkus.length})`}
              </Text>
              <MaterialCommunityIcons
                name={showCodes ? "chevron-up" : "chevron-down"}
                size={18}
                color="#475569"
              />
            </Pressable>
          )}
        </View>
      )}
      {!!item.motivo && (
        <View style={styles.note}>
          <MaterialCommunityIcons
            name="message-text-outline"
            size={17}
            color="#9a7100"
          />
          <Text style={[styles.noteText, styles.detailText]}>
            <Text style={styles.inlineLabel}>Motivo: </Text>
            {item.motivo}
          </Text>
        </View>
      )}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onTrace(item)}
          style={({ pressed }) => [
            styles.action,
            styles.primary,
            pressed && styles.pressed,
          ]}
        >
          <MaterialCommunityIcons
            name="timeline-clock-outline"
            size={18}
            color="#fff"
          />
          <Text style={[styles.actionText, styles.white]}>Trazabilidad</Text>
        </Pressable>
        {!!item.subSkus.length && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Compartir etiquetas PDF de ${item.nombre}`}
            onPress={() => onLabels(item)}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={18}
              color="#0f172a"
            />
            <Text style={styles.actionText}>Etiquetas PDF</Text>
          </Pressable>
        )}
      </View>
      {pending && (
        <View style={styles.receiveSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => onReceive(item)}
            style={({ pressed }) => [
              styles.receiveButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
          >
            <MaterialCommunityIcons
              name="package-variant-closed-check"
              size={21}
              color="#0f172a"
            />
            <Text style={styles.receiveText}>
              {busy ? "Guardando…" : "Confirmar recepción física"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e6dfc5",
    borderLeftWidth: 4,
    padding: 12,
    gap: 8,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#ffc400",
    alignItems: "center",
    justifyContent: "center",
  },
  identity: { flex: 1, minWidth: 0, gap: 4 },
  name: { color: "#0f172a", fontSize: 15, fontWeight: "800", lineHeight: 20 },
  quantity: {
    maxWidth: "35%",
    minWidth: 55,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 13,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  quantityValue: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  quantityLabel: { fontSize: 10, fontWeight: "600", color: "#64748b" },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    flexShrink: 1,
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusLabel: { fontSize: 11, fontWeight: "800", flexShrink: 1 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexShrink: 1,
  },
  date: { color: "#64748b", fontSize: 11, flexShrink: 1 },
  details: {
    backgroundColor: "#fffbef",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#f4e8bc",
    padding: 9,
    gap: 5,
  },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  detailText: { flex: 1, minWidth: 0, gap: 2 },
  inlineLabel: { fontWeight: "700", color: "#64748b" },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    lineHeight: 18,
  },
  codes: { gap: 5 },
  codeHeading: { flexDirection: "row", alignItems: "center", gap: 6 },
  codeText: { flex: 1, fontSize: 12, color: "#334155", lineHeight: 18 },
  expandCodes: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    minHeight: 44,
  },
  expandText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 8,
    backgroundColor: "#fffaf0",
    borderRadius: 12,
  },
  noteText: { fontSize: 12, color: "#475569", lineHeight: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    flexDirection: "row",
    flexGrow: 1,
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  primary: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    flexShrink: 1,
  },
  white: { color: "#fff" },
  receiveSection: {
    borderTopWidth: 1,
    borderTopColor: "#f1e8d6",
    paddingTop: 8,
  },
  receiveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffc400",
    borderRadius: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  receiveText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
