import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "react-native-paper";
import { BeckOptionFilter } from "./BeckOptionFilter";
import { BeckDateFilter } from "./BeckDateFilter";
import { BeckSearchInput } from "./BeckSearchInput";
import { RegistroTypeFilter, type RegistroTypeValue } from "./RegistroTypeFilter";

export type RegistroListFiltersProps<Estado extends string> = {
  states?: { value: Estado; label: string }[];
  allState?: Estado;
  searchPlaceholder?: string;
  obra?: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] };
  search: string;
  onSearch: (value: string) => void;
  tipo?: RegistroTypeValue;
  onTipo?: (value: RegistroTypeValue) => void;
  fecha?: string;
  onFecha?: (value: string) => void;
  resultKind?: "registros" | "obras";
  estado?: Estado;
  onEstado?: (value: Estado) => void;
  counts?: Record<Estado, number>;
  total: number;
  loading: boolean;
  onClear: () => void;
};

export function RegistroListFilters<Estado extends string>(props: RegistroListFiltersProps<Estado>) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 350 || fontScale > 1.3;
  const resultKind = props.resultKind ?? "registros";
  const singular = resultKind === "obras" ? "obra" : "registro";
  const active = Boolean(props.search || (props.onFecha && props.fecha) || (props.onTipo && (props.tipo ?? "todos") !== "todos") || (props.onEstado && props.estado !== props.allState) || (props.obra && props.obra.value !== "todas"));

  return (
    <View style={styles.panel}>
      <BeckSearchInput
        placeholder={props.searchPlaceholder ?? "Registro, operario, sello, piso o eje"}
        accessibilityLabel={props.searchPlaceholder ?? "Buscar por registro, operario, número de sello, piso o eje"}
        value={props.search} onChangeText={props.onSearch} style={styles.search}
      />
      {props.obra ? (
        <View style={[styles.row, stacked && styles.stacked]}>
          <View style={[styles.column, stacked && styles.stackedColumn]}>
            <BeckOptionFilter
              label="Obra" value={props.obra.value} onChange={props.obra.onChange}
              options={props.obra.options} allValue="todas" allLabel="Todas las obras"
              compact containerStyle={styles.control}
            />
          </View>
          {props.states && props.onEstado && props.allState !== undefined && props.estado !== undefined ? <View style={[styles.column, stacked && styles.stackedColumn]}>
            <BeckOptionFilter
              label="Estado" value={props.estado} onChange={(value) => props.onEstado?.(value as Estado)}
              options={props.states.filter((item) => item.value !== props.allState).map((item) => ({
                value: item.value, label: props.counts ? `${item.label} (${props.loading ? "—" : props.counts[item.value]})` : item.label,
              }))}
              allValue={props.allState} allLabel={props.counts ? `Todos (${props.loading ? "—" : props.counts[props.allState]})` : "Todos los estados"}
              icon="list-status" compact containerStyle={styles.control}
            />
          </View> : null}
        </View>
      ) : null}
      {props.onTipo || props.onFecha ? (
        <View style={[styles.row, stacked && styles.stacked]}>
          {props.onTipo ? <View style={[styles.column, stacked && styles.stackedColumn]}>
            <RegistroTypeFilter value={props.tipo ?? "todos"} onChange={props.onTipo} containerStyle={styles.control} />
          </View> : null}
          {props.onFecha ? <View style={[styles.column, stacked && styles.stackedColumn]}>
            <BeckDateFilter label="Fecha de ejecución" value={props.fecha ?? ""} onChange={props.onFecha} compact containerStyle={styles.control} />
          </View> : null}
        </View>
      ) : null}
      {!props.obra && props.states?.length && props.onEstado ? <View style={styles.states}>
        {props.states.map(({ value, label }) => {
          const selected = props.estado === value;
          return <Pressable
            key={value} accessibilityRole="button" accessibilityState={{ selected }}
            accessibilityLabel={`${label}, ${props.loading ? "cargando" : props.counts?.[value] ?? 0} ${resultKind}`}
            onPress={() => props.onEstado?.(value)}
            style={({ pressed }) => [styles.state, selected && styles.selected, pressed && styles.pressed]}
          >
            <Text style={[styles.stateLabel, selected && styles.selectedLabel]}>{label}</Text>
            <Text style={[styles.badge, selected && styles.selectedBadge]}>{props.loading ? "—" : props.counts?.[value] ?? 0}</Text>
          </Pressable>;
        })}
      </View> : null}
      <View style={styles.summary}>
        <Text style={styles.total} accessibilityLiveRegion="polite">
          {props.loading ? `Buscando ${resultKind}…` : `${props.total} ${props.total === 1 ? singular : resultKind}`}
        </Text>
        {active ? <Pressable accessibilityRole="button" accessibilityLabel={`Limpiar todos los filtros de ${resultKind}`} onPress={props.onClear} style={styles.clear}>
          <MaterialCommunityIcons name="filter-remove-outline" size={16} color="#c2410c" />
          <Text style={styles.clearText}>Limpiar filtros</Text>
        </Pressable> : null}
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
  states: { flexDirection: "row", gap: 6 },
  state: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: "row", gap: 4, justifyContent: "center", alignItems: "center", paddingHorizontal: 6, paddingVertical: 6, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#fde68a", borderRadius: 12 },
  selected: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  stateLabel: { color: "#475569", fontSize: 11, fontWeight: "800", flexShrink: 1 },
  selectedLabel: { color: "#ffffff" },
  badge: { backgroundColor: "#f1f5f9", borderRadius: 10, color: "#475569", fontSize: 10, fontWeight: "800", textAlign: "center", minWidth: 19, paddingHorizontal: 4, paddingVertical: 2 },
  selectedBadge: { backgroundColor: "#FDC10B", color: "#0f172a" },
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44, gap: 8 },
  total: { color: "#64748b", fontSize: 11, fontWeight: "700", flexShrink: 1 },
  clear: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, minHeight: 44, paddingHorizontal: 4 },
  clearText: { color: "#c2410c", fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.75 },
});
