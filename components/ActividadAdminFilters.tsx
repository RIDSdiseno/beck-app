import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "react-native-paper";
import { BeckDateFilter } from "./BeckDateFilter";
import { BeckOptionFilter } from "./BeckOptionFilter";
import { BeckSearchInput } from "./BeckSearchInput";

type Props = {
  search: string;
  onSearch: (value: string) => void;
  fecha: string;
  onFecha: (value: string) => void;
  modulo: string;
  onModulo: (value: string) => void;
  total: number;
  loading: boolean;
  onClear: () => void;
};

const MODULOS = [
  { value: "operario", label: "Operario" },
  { value: "supervisor", label: "Supervisor" },
  { value: "ingenieria", label: "Ingeniería" },
  { value: "administracion", label: "Administración" },
];

export function ActividadAdminFilters(props: Props) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 350 || fontScale > 1.3;
  const active = Boolean(props.search || props.fecha || props.modulo !== "todos");

  return (
    <View style={styles.panel}>
      <BeckSearchInput
        placeholder="Buscar acción o módulo"
        value={props.search}
        onChangeText={props.onSearch}
        style={styles.search}
      />
      <View style={[styles.row, stacked && styles.stacked]}>
        <View style={[styles.column, stacked && styles.stackedColumn]}>
          <BeckDateFilter
            label="Fecha de actividad" value={props.fecha} onChange={props.onFecha}
            compact containerStyle={styles.control}
          />
        </View>
        <View style={[styles.column, stacked && styles.stackedColumn]}>
          <BeckOptionFilter
            label="Módulo" value={props.modulo} onChange={props.onModulo}
            allValue="todos" allLabel="Todos los módulos" options={MODULOS}
            icon="view-dashboard-outline" compact containerStyle={styles.control}
          />
        </View>
      </View>
      <View style={styles.summary}>
        <Text style={styles.total} accessibilityLiveRegion="polite">
          {props.loading ? "Buscando acciones…" : `${props.total} ${props.total === 1 ? "acción" : "acciones"}`}
        </Text>
        {active ? (
          <Pressable
            accessibilityRole="button" accessibilityLabel="Limpiar todos los filtros de actividad"
            onPress={props.onClear} style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="filter-remove-outline" size={16} color="#c2410c" />
            <Text style={styles.clearText}>Limpiar filtros</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: "#fffaf0", borderColor: "#fde68a", borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, paddingTop: 4, marginBottom: 8 },
  search: { marginBottom: 8, marginTop: 0 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  stacked: { flexDirection: "column" },
  column: { flex: 1, minWidth: 0 },
  stackedColumn: { flex: 0 },
  control: { marginBottom: 0, borderRadius: 12, backgroundColor: "#ffffff" },
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44, gap: 8 },
  total: { color: "#64748b", fontSize: 11, fontWeight: "700", flexShrink: 1 },
  clear: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 44, paddingHorizontal: 4 },
  clearText: { color: "#c2410c", fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.75 },
});
