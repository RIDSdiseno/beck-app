import { authenticatedFetch } from "../authenticatedFetch";
import { getSession } from "@/services/auth/session";
import { getConfiguracionRegistro, getTiposRegistroConfigurados, getTramosRegistroConfigurados, clearMisObrasCache } from "../obrasApi";
jest.mock("../config", () => ({
  API_BASE_URL: "https://example.test",
  readJsonResponse: async (r: { json: () => Promise<unknown> }) => r.json(),
  ensureArray: (value: unknown[]) => value,
}));
jest.mock("../authenticatedFetch", () => ({ authenticatedFetch: jest.fn() }));
jest.mock("@/services/auth/session", () => ({ getSession: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks(); clearMisObrasCache();
  (getSession as jest.Mock).mockResolvedValue({ token: "test-token" });
});
const respuesta = (tipos: string[], max: number) => ({ ok: true, json: async () => ({
  success: true, data: [{ campo: "metros_lineales", visible: true }],
  tiposRegistroPermitidos: tipos,
  tramosHolguraPorTipo: { junta_lineal_espuma: [{ holguraMax: max, factor: 1.7 }] },
}) });
test("obtiene tipos y tramos de la obra y mantiene claves de visibilidad", async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue(respuesta(["junta_lineal_espuma"], 3));
  expect(await getConfiguracionRegistro("obra", "trabajador")).toEqual([{ campo: "metrosLineales", visible: true }]);
  expect(getTiposRegistroConfigurados("obra")).toEqual(["junta_lineal_espuma"]);
  expect(getTramosRegistroConfigurados("obra")).toEqual({ junta_lineal_espuma: [{ holguraMax: 3, factor: 1.7 }] });
});
test("refrescar reemplaza los tipos y tramos; cerrar sesión limpia la configuración", async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValueOnce(respuesta(["sello_cortafuego"], 2))
    .mockResolvedValueOnce(respuesta(["tabiqueria"], 4));
  await getConfiguracionRegistro("obra", "trabajador");
  await getConfiguracionRegistro("obra", "trabajador", true);
  expect(getTiposRegistroConfigurados("obra")).toEqual(["tabiqueria"]);
  expect(getTramosRegistroConfigurados("obra").junta_lineal_espuma?.[0].holguraMax).toBe(4);
  clearMisObrasCache();
  expect(getTramosRegistroConfigurados("obra")).toEqual({});
});
test("una configuración con cero tipos soportados no habilita tipos por defecto", async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue(respuesta([], 2));
  await getConfiguracionRegistro("obra", "trabajador");
  expect(getTiposRegistroConfigurados("obra")).toEqual([]);
});
