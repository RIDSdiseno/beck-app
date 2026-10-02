import { BeckOptionFilter } from "./BeckOptionFilter";
import type { TipoRegistro } from "@/utils/tipoRegistro";
import type { StyleProp, ViewStyle } from "react-native";

export type RegistroTypeValue = TipoRegistro | "todos";
const OPTIONS = [
  { value: "sello_cortafuego", label: "Sellos" },
  { value: "junta_lineal_espuma", label: "Juntas · Junta lineal espuma" },
  { value: "tabiqueria", label: "Tabiquería" },
];

export function RegistroTypeFilter({ value, onChange, containerStyle }: {
  value: RegistroTypeValue;
  onChange: (value: RegistroTypeValue) => void;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  return <BeckOptionFilter
    label="Tipo de registro" value={value} allValue="todos" allLabel="Todos los tipos"
    options={OPTIONS} onChange={(next) => onChange(next as RegistroTypeValue)}
    icon="filter-variant" compact containerStyle={containerStyle}
  />;
}
