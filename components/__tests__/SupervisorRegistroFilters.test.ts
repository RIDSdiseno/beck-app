import React from "react";
import { RegistroListFilters, type RegistroListFiltersProps } from "../RegistroListFilters";
import { SupervisorRegistroFilters } from "../SupervisorRegistroFilters";
import { HistorialRegistroFilters } from "../HistorialRegistroFilters";

jest.mock("react-native", () => ({
  Pressable: "Pressable", View: "View", StyleSheet: { create: (value: unknown) => value },
  useWindowDimensions: () => ({ width: 390, fontScale: 1 }),
}));
jest.mock("react-native-paper", () => ({ Text: "Text" }));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: "Icon" }));
jest.mock("../BeckOptionFilter", () => ({ BeckOptionFilter: "OptionFilter" }));
jest.mock("../BeckSearchInput", () => ({ BeckSearchInput: "SearchInput" }));
jest.mock("../BeckDateFilter", () => ({ BeckDateFilter: "DateFilter" }));
jest.mock("../RegistroTypeFilter", () => ({ RegistroTypeFilter: "TypeFilter" }));
const { act, create } = jest.requireActual("react-test-renderer");
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const props = () => ({
  search: "", onSearch: jest.fn(), tipo: "todos" as const, onTipo: jest.fn(),
  fecha: "", onFecha: jest.fn(), estado: "todos" as const, onEstado: jest.fn(),
  counts: { todos: 123, pendiente: 120, rechazado: 3 }, total: 123,
  loading: false, onClear: jest.fn(),
});

test("el calendario compacto envía el día seleccionado sin transformación y mantiene los estados", async () => {
  const input = props();
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(SupervisorRegistroFilters, input)); });
  const date = renderer.root.findByType("DateFilter");
  expect(date.props.compact).toBe(true);
  expect(date.props.label).toBe("Fecha de ejecución");
  date.props.onChange("2026-08-21");
  expect(input.onFecha).toHaveBeenCalledWith("2026-08-21");
  const rejected = renderer.root.findAllByType("Pressable").find((node: { props: { accessibilityLabel: string } }) => node.props.accessibilityLabel === "Rechazados, 3 registros");
  rejected.props.onPress();
  expect(input.onEstado).toHaveBeenCalledWith("rechazado");
  expect(renderer.root.findAllByType("Pressable")).toHaveLength(3);
  await act(async () => renderer.unmount());
});

test("Ingeniería mantiene obra, fecha, tipo y los cuatro estados en el panel compacto", async () => {
  type Estado = "todos" | "en_revision" | "validado" | "rechazado";
  const input: RegistroListFiltersProps<Estado> = {
    ...props(), estado: "en_revision", allState: "todos",
    searchPlaceholder: "Registro, responsable, sello, piso o eje",
    states: [
      { value: "todos", label: "Todos" }, { value: "en_revision", label: "En revisión" },
      { value: "validado", label: "Validados" }, { value: "rechazado", label: "Rechazados" },
    ],
    counts: { todos: 150, en_revision: 25, validado: 120, rechazado: 5 }, total: 25,
    obra: { value: "todas", onChange: jest.fn(), options: [{ value: "obra-1", label: "ODATA II" }] },
  };
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(RegistroListFilters<Estado>, input)); });
  const filters = renderer.root.findAllByType("OptionFilter");
  expect(filters).toHaveLength(2);
  expect(filters[0].props.label).toBe("Obra");
  expect(filters[0].props.options).toEqual(input.obra?.options);
  filters[0].props.onChange("obra-1");
  expect(input.obra?.onChange).toHaveBeenCalledWith("obra-1");
  expect(filters[1].props.allValue).toBe("todos");
  expect(filters[1].props.options).toEqual([
    { value: "en_revision", label: "En revisión (25)" },
    { value: "validado", label: "Validados (120)" },
    { value: "rechazado", label: "Rechazados (5)" },
  ]);
  filters[1].props.onChange("rechazado");
  expect(input.onEstado).toHaveBeenCalledWith("rechazado");
  renderer.root.findByType("TypeFilter").props.onChange("tabiqueria");
  expect(input.onTipo).toHaveBeenCalledWith("tabiqueria");
  renderer.root.findByType("DateFilter").props.onChange("2026-08-21");
  expect(input.onFecha).toHaveBeenCalledWith("2026-08-21");
  renderer.root.findByType("SearchInput").props.onChangeText("Miguel");
  expect(input.onSearch).toHaveBeenCalledWith("Miguel");
  await act(async () => renderer.update(React.createElement(RegistroListFilters<Estado>, { ...input, loading: true })));
  expect(renderer.root.findAllByType("OptionFilter")[1].props.options[0].label).toBe("En revisión (—)");
  const clear = renderer.root.findAllByType("Pressable").find((node: { props: { accessibilityLabel: string } }) => node.props.accessibilityLabel === "Limpiar todos los filtros de registros");
  clear.props.onPress();
  expect(input.onClear).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test("Registro del operario conserva tipo y estados sin agregar un calendario", async () => {
  type Estado = "todos" | "pendiente" | "rechazado";
  const input: RegistroListFiltersProps<Estado> = {
    ...props(), fecha: undefined, onFecha: undefined, tipo: "tabiqueria",
    searchPlaceholder: "Buscar por obra, piso o N° de sello", allState: "todos",
    states: [{ value: "todos", label: "Todos" }, { value: "pendiente", label: "Pendientes" }, { value: "rechazado", label: "Rechazados" }],
  };
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(RegistroListFilters<Estado>, input)); });
  expect(renderer.root.findAllByType("DateFilter")).toHaveLength(0);
  renderer.root.findByType("TypeFilter").props.onChange("sello_cortafuego");
  expect(input.onTipo).toHaveBeenCalledWith("sello_cortafuego");
  renderer.root.findByType("SearchInput").props.onChangeText("0021");
  expect(input.onSearch).toHaveBeenCalledWith("0021");
  const buttons = renderer.root.findAllByType("Pressable");
  expect(buttons[0].props.accessibilityLabel).toBe("Todos, 123 registros");
  buttons[1].props.onPress();
  expect(input.onEstado).toHaveBeenCalledWith("pendiente");
  buttons[3].props.onPress();
  expect(input.onClear).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test("Obras muestra únicamente búsqueda y estados, con conteos de obras", async () => {
  type Estado = "todas" | "activa" | "pausada";
  const input: RegistroListFiltersProps<Estado> = {
    search: "", onSearch: jest.fn(), estado: "todas", onEstado: jest.fn(),
    resultKind: "obras", searchPlaceholder: "Buscar por nombre o código", allState: "todas",
    states: [{ value: "todas", label: "Todas" }, { value: "activa", label: "Activas" }, { value: "pausada", label: "Pausadas" }],
    counts: { todas: 5, activa: 3, pausada: 2 }, total: 5, loading: false, onClear: jest.fn(),
  };
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(RegistroListFilters<Estado>, input)); });
  expect(renderer.root.findAllByType("DateFilter")).toHaveLength(0);
  expect(renderer.root.findAllByType("TypeFilter")).toHaveLength(0);
  expect(renderer.root.findAllByType("Pressable")).toHaveLength(3);
  const paused = renderer.root.findAllByType("Pressable")[2];
  expect(paused.props.accessibilityLabel).toBe("Pausadas, 2 obras");
  paused.props.onPress();
  expect(input.onEstado).toHaveBeenCalledWith("pausada");
  renderer.root.findByType("SearchInput").props.onChangeText("31");
  expect(input.onSearch).toHaveBeenCalledWith("31");
  await act(async () => renderer.update(React.createElement(RegistroListFilters<Estado>, { ...input, estado: "activa", total: 3 })));
  const clear = renderer.root.findAllByType("Pressable").find((node: { props: { accessibilityLabel: string } }) => node.props.accessibilityLabel === "Limpiar todos los filtros de obras");
  clear.props.onPress();
  expect(input.onClear).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test.each([true, false])("Revisión del cliente agrupa búsqueda y tipo, respeta fecha visible=%s y no agrega estados", async (fechaVisible) => {
  const input: RegistroListFiltersProps<string> = {
    search: "", onSearch: jest.fn(), tipo: "todos", onTipo: jest.fn(),
    fecha: "", onFecha: fechaVisible ? jest.fn() : undefined,
    searchPlaceholder: "Buscar sello, piso, recinto, ejes o material",
    total: 4, loading: false, onClear: jest.fn(),
  };
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(RegistroListFilters, input)); });
  expect(renderer.root.findAllByType("OptionFilter")).toHaveLength(0);
  expect(renderer.root.findAllByType("Pressable")).toHaveLength(0);
  expect(renderer.root.findAllByType("DateFilter")).toHaveLength(fechaVisible ? 1 : 0);
  if (fechaVisible) {
    renderer.root.findByType("DateFilter").props.onChange("2026-08-21");
    expect(input.onFecha).toHaveBeenCalledWith("2026-08-21");
  }
  renderer.root.findByType("SearchInput").props.onChangeText("Sala 3");
  expect(input.onSearch).toHaveBeenCalledWith("Sala 3");
  renderer.root.findByType("TypeFilter").props.onChange("junta_lineal_espuma");
  expect(input.onTipo).toHaveBeenCalledWith("junta_lineal_espuma");
  await act(async () => renderer.update(React.createElement(RegistroListFilters, { ...input, tipo: "junta_lineal_espuma" })));
  const clear = renderer.root.findByType("Pressable");
  expect(clear.props.accessibilityLabel).toBe("Limpiar todos los filtros de registros");
  clear.props.onPress();
  expect(input.onClear).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test.each(["terreno", "jefeobra", "ingenieria", "cliente", "administrador"])("Historial de %s conserva sus filtros y reserva estado para administración", async (role) => {
  const input = {
    role, search: "", onSearch: jest.fn(), tipo: "todos" as const, onTipo: jest.fn(),
    fecha: "", onFecha: jest.fn(), estado: "todos" as const, onEstado: jest.fn(),
    obra: { value: "todas", options: [{ value: "obra-asignada", label: "Obra asignada" }], onChange: jest.fn() },
    total: 518, loading: false, onClear: jest.fn(),
  };
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(HistorialRegistroFilters, input)); });
  const options = renderer.root.findAllByType("OptionFilter");
  expect(options).toHaveLength(role === "administrador" ? 2 : 1);
  expect(options[0].props.options).toEqual(input.obra.options);
  options[0].props.onChange("obra-asignada");
  expect(input.obra.onChange).toHaveBeenCalledWith("obra-asignada");
  if (role === "administrador") {
    expect(options[1].props.allLabel).toBe("Todos los estados");
    expect(options[1].props.options).toEqual([
      { value: "pendiente", label: "Pendiente" },
      { value: "en_revision", label: "En revisión" },
      { value: "rechazado", label: "Rechazado" },
      { value: "validado", label: "Validado" },
    ]);
    options[1].props.onChange("rechazado");
    expect(input.onEstado).toHaveBeenCalledWith("rechazado");
  }
  const search = renderer.root.findByType("SearchInput");
  expect(search.props.placeholder).toBe(role === "cliente" ? "Buscar sello, piso, recinto, ejes o material" : "Buscar por N° de sello o piso");
  search.props.onChangeText("0021");
  expect(input.onSearch).toHaveBeenCalledWith("0021");
  renderer.root.findByType("DateFilter").props.onChange("2026-08-21");
  expect(input.onFecha).toHaveBeenCalledWith("2026-08-21");
  renderer.root.findByType("TypeFilter").props.onChange("tabiqueria");
  expect(input.onTipo).toHaveBeenCalledWith("tabiqueria");
  expect(renderer.root.findAllByType("Pressable")).toHaveLength(0);
  await act(async () => renderer.update(React.createElement(HistorialRegistroFilters, { ...input, fecha: "2026-08-21" })));
  renderer.root.findByType("Pressable").props.onPress();
  expect(input.onClear).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test("muestra limpiar cuando hay filtros activos y no presenta conteos antiguos al cargar", async () => {
  const input = { ...props(), fecha: "2026-08-21", loading: true };
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(SupervisorRegistroFilters, input)); });
  const buttons = renderer.root.findAllByType("Pressable");
  const clear = buttons.find((node: { props: { accessibilityLabel: string } }) => node.props.accessibilityLabel === "Limpiar todos los filtros de registros");
  clear.props.onPress();
  expect(input.onClear).toHaveBeenCalledTimes(1);
  expect(buttons[0].props.accessibilityLabel).toBe("Todos, cargando registros");
  await act(async () => renderer.unmount());
});
