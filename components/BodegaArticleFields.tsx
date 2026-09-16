import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BodegaInput } from "./BodegaBeckUI";
import type { TipoBodega } from "@/services/api/bodegaBeckApi";

type Icon = keyof typeof MaterialCommunityIcons.glyphMap;
const tipos: Record<
  TipoBodega,
  { label: string; icon: Icon; example: string }
> = {
  epp: {
    label: "Equipo de protección personal",
    icon: "hard-hat",
    example: "Ej.: Casco de seguridad",
  },
  implemento: {
    label: "Implemento",
    icon: "toolbox-outline",
    example: "Ej.: Escalera de aluminio",
  },
  herramienta: {
    label: "Herramienta",
    icon: "tools",
    example: "Ej.: Sierra circular",
  },
};
const iconos: Record<string, Icon> = {
  marca: "tag-outline",
  modelo: "tag-outline",
  modelo_marca: "tag-outline",
  categoria: "shape-outline",
  unidad_medida: "ruler",
  talla: "resize",
  talla_medida: "resize",
  color: "palette-outline",
  ubicacion: "map-marker-outline",
  fecha: "calendar-outline",
  fecha_compra: "calendar-outline",
  fecha_mantencion: "calendar-clock-outline",
};

export function BodegaArticleFields({
  tipo,
  fields,
  form,
  editing,
  onChange,
}: {
  tipo: TipoBodega;
  fields: string[][];
  form: Record<string, string>;
  editing: boolean;
  onChange: (key: string, value: string) => void;
}) {
  const identification = new Set(["marca", "modelo", "modelo_marca"]);
  const location = new Set([
    "ubicacion",
    "fecha",
    "fecha_compra",
    "fecha_mantencion",
  ]);
  const groups: { title: string; icon: Icon; fields: string[][] }[] = [
    {
      title: "Identificación",
      icon: "text-box-outline",
      fields: [
        ["nombre", "Nombre del artículo *"],
        ...fields.filter(([key]) => identification.has(key)),
      ],
    },
    {
      title: "Características",
      icon: "tune-variant",
      fields: fields.filter(
        ([key]) => !identification.has(key) && !location.has(key),
      ),
    },
    {
      title: "Ubicación y fechas",
      icon: "map-marker-outline",
      fields: fields.filter(([key]) => location.has(key)),
    },
  ];
  return (
    <>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons
            name={tipos[tipo].icon}
            size={27}
            color="#0f172a"
          />
        </View>
        <View style={styles.grow}>
          <Text style={styles.eyebrow}>INVENTARIO BECK</Text>
          <Text style={styles.heroTitle}>{tipos[tipo].label}</Text>
          <Text style={styles.heroHint}>
            Los campos con * son obligatorios.
          </Text>
        </View>
      </View>
      {groups
        .filter((group) => group.fields.length)
        .map((group) => (
          <View key={group.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name={group.icon}
                size={20}
                color="#9a7100"
              />
              <Text style={styles.sectionTitle}>{group.title}</Text>
            </View>
            {group.fields.map(([key, label]) => (
              <BodegaInput
                key={key}
                label={label}
                icon={iconos[key] || "text-box-outline"}
                value={form[key] || ""}
                placeholder={
                  key === "nombre"
                    ? tipos[tipo].example
                    : key.startsWith("fecha")
                      ? "AAAA-MM-DD"
                      : "Opcional"
                }
                onChangeText={(value) => onChange(key, value)}
              />
            ))}
          </View>
        ))}
      {!editing && tipo !== "herramienta" && (
        <View style={[styles.section, styles.stockSection]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="warehouse"
              size={22}
              color="#9a7100"
            />
            <Text style={styles.sectionTitle}>Existencias iniciales</Text>
          </View>
          <BodegaInput
            numeric
            icon="package-variant"
            label="Stock inicial"
            value={form.stock || "0"}
            onChangeText={(value) => onChange("stock", value)}
          />
          <Text style={styles.hint}>
            Unidades disponibles en bodega al crear este artículo.
          </Text>
        </View>
      )}
      {!editing && (
        <View style={styles.info}>
          <MaterialCommunityIcons
            name="information-outline"
            size={19}
            color="#64748b"
          />
          <Text style={[styles.hint, styles.grow]}>
            Después de guardar podrás generar el SKU y compartir su etiqueta
            desde el menú del artículo.
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffc400",
  },
  heroIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffc400",
    borderRadius: 16,
  },
  eyebrow: {
    color: "#ffc400",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 4 },
  heroHint: { color: "#cbd5e1", fontSize: 11, lineHeight: 16, marginTop: 5 },
  section: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    gap: 15,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "800",
    flexShrink: 1,
  },
  stockSection: { borderColor: "#f1dfa0", backgroundColor: "#fffbef" },
  hint: { fontSize: 12, lineHeight: 18, color: "#64748b" },
  info: { flexDirection: "row", gap: 8, paddingHorizontal: 3 },
});
