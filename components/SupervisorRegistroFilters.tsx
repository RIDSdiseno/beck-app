import { RegistroListFilters, type RegistroListFiltersProps } from "./RegistroListFilters";

type Estado = "todos" | "pendiente" | "rechazado";
const STATES: { value: Estado; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "rechazado", label: "Rechazados" },
];
type Props = Omit<RegistroListFiltersProps<Estado>, "states" | "allState" | "obra" | "searchPlaceholder">;

// Supervisor e Ingeniería comparten el panel para mantener un diseño uniforme.
export function SupervisorRegistroFilters(props: Props) {
  return <RegistroListFilters {...props} states={STATES} allState="todos" />;
}
