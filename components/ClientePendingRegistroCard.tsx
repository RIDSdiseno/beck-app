import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { RegistroCliente } from "@/services/api/clienteApi";
import { formatDateOnly, formatTime24WithPeriod } from "@/utils/dateTime";
import { campoVisibleCliente, type ClienteVisibilidad } from "@/utils/clienteVisibilidad";

type Props = { registro: RegistroCliente; onOpen: (id: string) => void; visibility?: ClienteVisibilidad };

export const ClientePendingRegistroCard = memo(
  function ClientePendingRegistroCard({ registro, onOpen, visibility }: Props) {
    const visible = (campo: Parameters<typeof campoVisibleCliente>[1]) => campoVisibleCliente(visibility, campo);
    const isJunta = registro.tipoRegistro === "junta_lineal_espuma";
    const unidades = isJunta
      ? registro.metrosLineales != null
        ? `${registro.metrosLineales} m`
        : "Sin metraje"
      : `${registro.cantidadSellos} ${registro.cantidadSellos === 1 ? "sello" : "sellos"}`;
    const identificador = isJunta
      ? visible("folio") ? `Folio ${registro.folio || "—"}` : "Junta lineal"
      : `Sello ${registro.numeroSello || "—"}`;
    const responsable =
      registro.nombreSellador || registro.sellador || "Sin responsable";
    const ubicacion = [
      visible("piso") ? `Piso ${registro.piso || "—"}` : null,
      visible("modulo") ? `Módulo ${registro.modulo || "—"}` : null,
    ].filter(Boolean).join(" · ");

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${identificador}. Pendiente de tu firma. Ver detalle.`}
        onPress={() => onOpen(registro.id)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <View style={styles.heading}>
          <View style={styles.icon}>
            <MaterialCommunityIcons
              name={isJunta ? "ruler" : "fire"}
              size={22}
              color="#0f172a"
            />
          </View>
          <View style={styles.identity}>
            <Text style={styles.title}>
              {isJunta ? "Junta lineal espuma" : "Sello cortafuego"}
            </Text>
            <Text style={styles.code} numberOfLines={1}>
              {(visible("codigoBeck") && registro.codigoBeck) ||
                `REG-${registro.id.slice(0, 6).toUpperCase()}`}
            </Text>
          </View>
          <Text style={styles.status}>Por firmar</Text>
        </View>
        <View style={styles.summary}>
          {!!ubicacion && <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={16}
              color="#f97316"
            />
            <Text style={styles.detailText} numberOfLines={2}>
              {ubicacion}
            </Text>
          </View>}
          {visible("nombreSellador") && <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="account-outline"
              size={16}
              color="#f97316"
            />
            <Text style={styles.detailText} numberOfLines={2}>
              Responsable: {responsable}
            </Text>
          </View>}
          {visible("fechaEjecucionSello") && <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="calendar-outline"
              size={16}
              color="#f97316"
            />
            <Text style={styles.detailText}>
              {formatDateOnly(registro.fecha)} ·{" "}
              {formatTime24WithPeriod(registro.createdAt)}
            </Text>
          </View>}
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name={isJunta ? "ruler" : "tag-outline"}
              size={16}
              color="#f97316"
            />
            <Text style={[styles.detailText, styles.seal]}>
              {identificador}{visible("cantidadSellos") ? ` · ${unidades}` : ""}
            </Text>
          </View>
        </View>
        {visible("itemizadoBeck") && !!registro.descripcionMaterial && (
          <Text style={styles.material} numberOfLines={1}>
            {registro.descripcionMaterial}
          </Text>
        )}
        <View style={styles.footer}>
          <MaterialCommunityIcons name="draw-pen" size={17} color="#c2410c" />
          <Text style={styles.footerText}>Revisar detalle y firmar</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={21}
            color="#c2410c"
          />
        </View>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#FDC10B",
    borderLeftWidth: 4,
    borderLeftColor: "#f97316",
    borderRadius: 16,
    padding: 12,
    gap: 9,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 9 },
  icon: {
    width: 38,
    height: 38,
    backgroundColor: "#FDC10B",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  identity: { flex: 1, minWidth: 0 },
  title: { color: "#0f172a", fontWeight: "900", fontSize: 14, lineHeight: 19 },
  code: { color: "#64748b", fontWeight: "600", fontSize: 11, marginTop: 2 },
  status: {
    color: "#0f172a",
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: "#FDC10B",
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    overflow: "hidden",
    flexShrink: 0,
  },
  summary: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  detailRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  detailText: {
    flex: 1,
    minWidth: 0,
    color: "#475569",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
  seal: { color: "#0f172a", fontWeight: "800" },
  material: { color: "#64748b", fontSize: 11, lineHeight: 16 },
  footer: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerText: { flex: 1, color: "#c2410c", fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.78 },
});
