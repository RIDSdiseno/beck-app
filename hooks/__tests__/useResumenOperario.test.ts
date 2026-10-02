import React from "react";
import { useResumenOperario } from "../useResumenOperario";
import { getResumenOperario } from "@/services/api/registrosApi";
import type { TipoRegistro } from "@/utils/tipoRegistro";
jest.mock("@/services/api/registrosApi", () => ({ getResumenOperario: jest.fn() }));
jest.mock("expo-router", () => ({ useFocusEffect: (callback: () => void) => jest.requireActual("react").useEffect(callback, [callback]) }));
const { act, create } = jest.requireActual("react-test-renderer");
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let state: ReturnType<typeof useResumenOperario>;
let renderer: ReturnType<typeof create>;
function Harness({ tipo = "sello_cortafuego", enabled = true }: { tipo?: TipoRegistro; enabled?: boolean }) {
  const current = useResumenOperario(enabled, tipo);
  React.useLayoutEffect(() => { state = current; }, [current]);
  return null;
}
const summary = (total: number) => ({ metrics: { total }, recientes: [], obras: [] });
const porTipo = (totales: Record<TipoRegistro, number>) =>
  ({ tipoRegistro }: { tipoRegistro: TipoRegistro }) => Promise.resolve(summary(totales[tipoRegistro]));
beforeEach(() => jest.resetAllMocks());
afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); });

test("carga los tres tipos en paralelo al entrar", async () => {
  (getResumenOperario as jest.Mock).mockImplementation(porTipo({ sello_cortafuego: 10, junta_lineal_espuma: 20, tabiqueria: 30 }));
  await act(async () => { renderer = create(React.createElement(Harness)); });
  expect(getResumenOperario).toHaveBeenCalledTimes(3);
  expect(getResumenOperario).toHaveBeenCalledWith({ tipoRegistro: "sello_cortafuego" }, false);
  expect(getResumenOperario).toHaveBeenCalledWith({ tipoRegistro: "junta_lineal_espuma" }, false);
  expect(getResumenOperario).toHaveBeenCalledWith({ tipoRegistro: "tabiqueria" }, false);
  expect(state.summary?.metrics.total).toBe(10);
});

test("cambiar de pestaña muestra el tipo al instante, sin volver a consultar ni vaciar la pantalla", async () => {
  (getResumenOperario as jest.Mock).mockImplementation(porTipo({ sello_cortafuego: 10, junta_lineal_espuma: 20, tabiqueria: 30 }));
  await act(async () => { renderer = create(React.createElement(Harness)); });
  await act(async () => renderer.update(React.createElement(Harness, { tipo: "tabiqueria" })));
  expect(state.summary?.metrics.total).toBe(30);
  await act(async () => renderer.update(React.createElement(Harness, { tipo: "junta_lineal_espuma" })));
  expect(state.summary?.metrics.total).toBe(20);
  expect(getResumenOperario).toHaveBeenCalledTimes(3);
});

test("el refresco fuerza los tres tipos y conserva los datos mientras carga", async () => {
  (getResumenOperario as jest.Mock).mockImplementation(porTipo({ sello_cortafuego: 1, junta_lineal_espuma: 2, tabiqueria: 3 }));
  await act(async () => { renderer = create(React.createElement(Harness)); });
  let resolver: () => void = () => {};
  (getResumenOperario as jest.Mock).mockImplementation(({ tipoRegistro }: { tipoRegistro: TipoRegistro }) =>
    new Promise((resolve) => { const prev = resolver; resolver = () => { prev(); resolve(summary(tipoRegistro === "sello_cortafuego" ? 7 : 0)); }; }));
  let refresco: Promise<void> = Promise.resolve();
  await act(async () => { refresco = state.refresh(true); });
  expect(state.summary?.metrics.total).toBe(1);
  expect(getResumenOperario).toHaveBeenLastCalledWith({ tipoRegistro: "tabiqueria" }, true);
  await act(async () => { resolver(); await refresco; });
  expect(state.summary?.metrics.total).toBe(7);
});

test("ante un error conserva los últimos datos válidos y lo informa", async () => {
  (getResumenOperario as jest.Mock).mockImplementation(porTipo({ sello_cortafuego: 4, junta_lineal_espuma: 5, tabiqueria: 6 }));
  await act(async () => { renderer = create(React.createElement(Harness)); });
  (getResumenOperario as jest.Mock).mockRejectedValue(new Error("Sin conexión"));
  await act(async () => { await state.refresh(true); });
  expect(state.error).toBe("Sin conexión");
  expect(state.summary?.metrics.total).toBe(4);
  expect(state.loading).toBe(false);
});

test("descarta una respuesta anterior si llegó una carga más nueva", async () => {
  const pendientes: Array<() => void> = [];
  (getResumenOperario as jest.Mock).mockImplementation(() => new Promise((resolve) => { pendientes.push(() => resolve(summary(100))); }));
  await act(async () => { renderer = create(React.createElement(Harness)); });
  (getResumenOperario as jest.Mock).mockImplementation(porTipo({ sello_cortafuego: 8, junta_lineal_espuma: 0, tabiqueria: 0 }));
  await act(async () => { await state.refresh(true); });
  await act(async () => { pendientes.forEach((resolver) => resolver()); });
  expect(state.summary?.metrics.total).toBe(8);
});

test("no consulta el resumen en las visuales de otros roles", async () => {
  await act(async () => { renderer = create(React.createElement(Harness, { enabled: false })); });
  expect(getResumenOperario).not.toHaveBeenCalled();
  expect(state.summary).toBeNull();
});
