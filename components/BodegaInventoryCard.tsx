import React, { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Menu } from "react-native-paper";
import type { ArticuloBodega, TipoBodega } from "@/services/api/bodegaBeckApi";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
export type BodegaInventoryAction =
  "editar" | "stock" | "asignar" | "sku" | "etiqueta" | "estado";
type Props = {
  item: ArticuloBodega;
  tipo: TipoBodega;
  busy: boolean;
  onAction: (action: BodegaInventoryAction, item: ArticuloBodega) => void;
};
const tipos: Record<TipoBodega, { label: string; icon: Icon }> = {
  epp: { label: "EPP", icon: "hard-hat" },
  implemento: { label: "IMPLEMENTO", icon: "toolbox-outline" },
  herramienta: { label: "HERRAMIENTA", icon: "tools" },
};

function CardAction({
  title,
  icon,
  primary,
  disabled,
  onPress,
}: {
  title: string;
  icon: Icon;
  primary?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && styles.primaryAction,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={18}
        color={primary ? "#fff" : "#0f172a"}
      />
      <Text style={[styles.actionText, primary && styles.primaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}

export const BodegaInventoryCard = memo(function BodegaInventoryCard({
  item,
  tipo,
  busy,
  onAction,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canAssign = item.activo && !!item.sku && item.disponible > 0;
  const withoutStock = item.disponible <= 0;
  const description = [
    tipo === "herramienta"
      ? [item.marca, item.modelo]
          .filter((v) => typeof v === "string" && v.trim())
          .join(" · ")
      : item.modelo_marca,
    item.talla || item.talla_medida,
    item.color,
  ]
    .filter((v) => typeof v === "string" && v.trim())
    .join(" · ");
  const selectAction = (action: BodegaInventoryAction) => {
    setMenuOpen(false);
    onAction(action, item);
  };

  return (
    <View style={[styles.card, !item.activo && styles.inactiveCard]}>
      <View style={styles.heading}>
        <View style={[styles.icon, !item.activo && styles.inactiveIcon]}>
          <MaterialCommunityIcons
            name={tipos[tipo].icon}
            size={21}
            color="#0f172a"
          />
        </View>
        <View style={styles.identity}>
          <View style={styles.tags}>
            <Text style={styles.type}>{tipos[tipo].label}</Text>
            {!item.activo && <Text style={styles.inactiveTag}>Inactivo</Text>}
          </View>
          <Text style={styles.name}>{item.nombre}</Text>
        </View>
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          contentStyle={styles.menu}
          anchor={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Más opciones de ${item.nombre}`}
              accessibilityState={{ expanded: menuOpen, disabled: busy }}
              disabled={busy}
              onPress={() => setMenuOpen(true)}
              style={({ pressed }) => [styles.more, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={23}
                color="#475569"
              />
            </Pressable>
          }
        >
          {item.sku ? (
            <Menu.Item
              leadingIcon="file-pdf-box"
              title="Compartir etiqueta PDF"
              titleStyle={styles.menuLabel}
              onPress={() => selectAction("etiqueta")}
            />
          ) : (
            <Menu.Item
              leadingIcon="barcode"
              title="Generar SKU"
              titleStyle={styles.menuLabel}
              disabled={busy}
              onPress={() => selectAction("sku")}
            />
          )}
          <Menu.Item
            leadingIcon={
              item.activo ? "pause-circle-outline" : "check-circle-outline"
            }
            title={item.activo ? "Desactivar artículo" : "Activar artículo"}
            titleStyle={[styles.menuLabel, item.activo && styles.dangerText]}
            disabled={busy}
            onPress={() => selectAction("estado")}
          />
        </Menu>
      </View>
      {!!description && <Text style={styles.description}>{description}</Text>}
      <View style={styles.summary}>
        <View style={styles.codeBlock}>
          <View style={styles.codeLabel}>
            <MaterialCommunityIcons name="barcode" size={19} color="#64748b" />
            <Text style={styles.caption}>SKU</Text>
          </View>
          <Text
            selectable
            style={[styles.code, !item.sku && styles.missingCode]}
          >
            {item.sku || "Sin generar"}
          </Text>
        </View>
        <View style={[styles.stockBlock, withoutStock && styles.emptyStock]}>
          <Text style={styles.stockLabel}>DISPONIBLE</Text>
          <Text
            accessibilityLabel={`${item.disponible} unidades disponibles en bodega`}
            style={[styles.stockValue, withoutStock && styles.emptyStockValue]}
          >
            {item.disponible}
            <Text style={styles.unit}>
              {" "}
              {item.disponible === 1 ? "unidad" : "unidades"}
            </Text>
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <CardAction
          title="Editar"
          icon="pencil-outline"
          disabled={busy}
          onPress={() => onAction("editar", item)}
        />
        {item.activo && tipo !== "herramienta" && (
          <CardAction
            title="Ajustar stock"
            icon="swap-vertical"
            disabled={busy}
            onPress={() => onAction("stock", item)}
          />
        )}
        {canAssign && (
          <CardAction
            title="Asignar"
            icon="account-arrow-right-outline"
            primary
            disabled={busy}
            onPress={() => onAction("asignar", item)}
          />
        )}
      </View>
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
    borderLeftColor: "#ffc400",
    padding: 12,
    gap: 7,
  },
  inactiveCard: {
    borderLeftColor: "#94a3b8",
    borderColor: "#e2e8f0",
    backgroundColor: "#fafbfc",
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
  inactiveIcon: { backgroundColor: "#e2e8f0" },
  identity: { flex: 1, minWidth: 0, gap: 2 },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  type: { color: "#8a6500", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  inactiveTag: {
    color: "#64748b",
    backgroundColor: "#e2e8f0",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  name: { color: "#0f172a", fontSize: 15, fontWeight: "800", lineHeight: 20 },
  more: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#f5f7fb",
  },
  description: { color: "#64748b", fontSize: 12, lineHeight: 18 },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 8,
    backgroundColor: "#fffbef",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#f4e8bc",
  },
  codeBlock: { flex: 1, minWidth: 90, gap: 2, justifyContent: "center" },
  codeLabel: { flexDirection: "row", gap: 5, alignItems: "center" },
  caption: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  code: { color: "#0f172a", fontSize: 14, fontWeight: "700" },
  missingCode: { color: "#a16207", fontSize: 12 },
  stockBlock: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 0,
  },
  emptyStock: { backgroundColor: "#fff1e6" },
  stockLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#64748b",
  },
  stockValue: { fontSize: 19, fontWeight: "900", color: "#0f172a" },
  emptyStockValue: { color: "#c2410c" },
  unit: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 44,
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  primaryAction: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    flexShrink: 1,
  },
  primaryText: { color: "#fff" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
  menu: { backgroundColor: "#fff", borderRadius: 18 },
  menuLabel: { fontSize: 14, color: "#0f172a" },
  dangerText: { color: "#b91c1c" },
});
