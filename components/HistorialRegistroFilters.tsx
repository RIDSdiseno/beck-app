import type { EstadoRegistroApi } from "@/services/api/registrosApi";
import { RegistroListFilters, type RegistroListFiltersProps } from "./RegistroListFilters";

type Estado = EstadoRegistroApi | "todos";
type Props = Omit<RegistroListFiltersProps<Estado>, "states" | "allState" | "counts" | "searchPlaceholder" | "resultKind"> & {
  role: string;
};

const STATES: { value: Estado; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "rechazado", label: "Rechazado" },
  { value: "validado", label: "Validado" },
];

export function HistorialRegistroFilters({ role, ...props }: Props) {
  const isAdmin = role === "administrador";
  return (
    <RegistroListFilters<Estado>
      {...props}
      searchPlaceholder={role === "cliente" ? "Buscar sello, piso, recinto, ejes o material" : "Buscar por N° de sello o piso"}
      states={isAdmin ? STATES : undefined}
      allState={isAdmin ? "todos" : undefined}
      estado={isAdmin ? props.estado : undefined}
      onEstado={isAdmin ? props.onEstado : undefined}
    />
  );
}
