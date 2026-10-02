import React from "react";
import { useRegistrosOperario } from "../useRegistrosOperario";
import { getRegistrosOperarioPage } from "@/services/api/registrosApi";
import type { RegistroTypeValue } from "@/components/RegistroTypeFilter";

jest.mock("@/services/api/registrosApi", () => ({ getRegistrosOperarioPage: jest.fn() }));
const { act, create } = jest.requireActual("react-test-renderer");
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let state: ReturnType<typeof useRegistrosOperario>;
let renderer: { update: (element: React.ReactElement) => void; unmount: () => void };

function Harness({ tipo = "todos" }: { tipo?: RegistroTypeValue }) {
  const current = useRegistrosOperario(true, "", "todos", tipo);
  React.useLayoutEffect(() => { state = current; }, [current]);
  return null;
}
const page = (ids: string[], nextCursor: string | null = null) => ({
  items: ids.map((id) => ({ id })), nextCursor, total: 130,
  counts: { todos: 130, pendiente: 120, rechazado: 10 },
});

beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  jest.useRealTimers();
});
async function mount() {
  await act(async () => { renderer = create(React.createElement(Harness)); });
  await act(async () => { jest.advanceTimersByTime(300); });
}

test("continúa las páginas sin duplicados y conserva los totales del backend", async () => {
  (getRegistrosOperarioPage as jest.Mock)
    .mockResolvedValueOnce(page(["1", "2"], "2"))
    .mockResolvedValueOnce(page(["2", "3"]));
  await mount();
  expect(state.total).toBe(130);
  await act(async () => { await state.loadMore(); });
  expect(state.items.map((r) => r.id)).toEqual(["1", "2", "3"]);
  expect(getRegistrosOperarioPage).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "2", tipoRegistro: "todos" }));
  expect(state.nextCursor).toBeNull();
});

test("cambiar el tipo reinicia páginas e ignora respuestas anteriores demoradas", async () => {
  let resolveAnterior: (value: unknown) => void = () => {};
  (getRegistrosOperarioPage as jest.Mock)
    .mockResolvedValueOnce(page(["sello"], "pagina-sellos"))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveAnterior = resolve; }))
    .mockResolvedValueOnce(page(["tabique"]));
  await mount();
  await act(async () => { renderer.update(React.createElement(Harness, { tipo: "junta_lineal_espuma" })); });
  await act(async () => { jest.advanceTimersByTime(300); });
  expect(state.items).toEqual([]);
  expect(state.nextCursor).toBeNull();
  await act(async () => { renderer.update(React.createElement(Harness, { tipo: "tabiqueria" })); });
  await act(async () => { jest.advanceTimersByTime(300); });
  await act(async () => { resolveAnterior(page(["junta"], "pagina-juntas")); });
  expect(state.items.map((r) => r.id)).toEqual(["tabique"]);
  expect(state.nextCursor).toBeNull();
  expect(state.loading).toBe(false);
  expect(getRegistrosOperarioPage).toHaveBeenLastCalledWith(expect.objectContaining({ tipoRegistro: "tabiqueria", limit: 30 }));
});
