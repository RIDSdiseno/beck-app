import React from "react";
import { useWindowDimensions } from "react-native";
import { ActividadAdminFilters } from "../ActividadAdminFilters";

jest.mock("react-native", () => ({
  Pressable: "Pressable", View: "View", StyleSheet: { create: (value: unknown) => value },
  useWindowDimensions: jest.fn(() => ({ width: 390, fontScale: 1 })),
}));
jest.mock("react-native-paper", () => ({ Text: "Text" }));
jest.mock("@expo/vector-icons", () => ({ MaterialCommunityIcons: "Icon" }));
jest.mock("../BeckOptionFilter", () => ({ BeckOptionFilter: "OptionFilter" }));
jest.mock("../BeckSearchInput", () => ({ BeckSearchInput: "SearchInput" }));
jest.mock("../BeckDateFilter", () => ({ BeckDateFilter: "DateFilter" }));
const { act, create } = jest.requireActual("react-test-renderer");
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const props = () => ({
  search: "", onSearch: jest.fn(), fecha: "", onFecha: jest.fn(),
  modulo: "todos", onModulo: jest.fn(), total: 25, loading: false, onClear: jest.fn(),
});

test("Mi actividad conserva búsqueda, fecha sin conversiones y los cuatro módulos", async () => {
  const input = props();
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(ActividadAdminFilters, input)); });
  expect(renderer.root.findAllByType("Pressable")).toHaveLength(0);
  renderer.root.findByType("SearchInput").props.onChangeText("validar");
  expect(input.onSearch).toHaveBeenCalledWith("validar");
  const date = renderer.root.findByType("DateFilter");
  expect(date.props.label).toBe("Fecha de actividad");
  date.props.onChange("2026-10-01");
  expect(input.onFecha).toHaveBeenCalledWith("2026-10-01");
  const moduleFilter = renderer.root.findByType("OptionFilter");
  expect(moduleFilter.props.allValue).toBe("todos");
  expect(moduleFilter.props.options).toEqual([
    { value: "operario", label: "Operario" }, { value: "supervisor", label: "Supervisor" },
    { value: "ingenieria", label: "Ingeniería" }, { value: "administracion", label: "Administración" },
  ]);
  moduleFilter.props.onChange("ingenieria");
  expect(input.onModulo).toHaveBeenCalledWith("ingenieria");
  await act(async () => renderer.update(React.createElement(ActividadAdminFilters, { ...input, modulo: "ingenieria", loading: true })));
  expect(renderer.root.findAllByType("Text").some((node: { props: { children: unknown } }) => node.props.children === "Buscando acciones…")).toBe(true);
  const clear = renderer.root.findByType("Pressable");
  expect(clear.props.accessibilityLabel).toBe("Limpiar todos los filtros de actividad");
  clear.props.onPress();
  expect(input.onClear).toHaveBeenCalledTimes(1);
  await act(async () => renderer.unmount());
});

test.each([
  [390, 1, false], [320, 1, true], [390, 1.5, true],
])("adapta los controles a ancho %s y escala de texto %s", async (width, fontScale, stacked) => {
  (useWindowDimensions as jest.Mock).mockReturnValue({ width, fontScale });
  let renderer: ReturnType<typeof create>;
  await act(async () => { renderer = create(React.createElement(ActividadAdminFilters, props())); });
  const row = renderer.root.findByType("DateFilter").parent.parent;
  expect(row.props.style[1]).toEqual(stacked ? { flexDirection: "column" } : false);
  await act(async () => renderer.unmount());
});
