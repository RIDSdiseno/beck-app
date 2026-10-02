import { authenticatedFetch } from "../authenticatedFetch";
import { getSession } from "@/services/auth/session";
import { clearMisRegistrosCache, getResumenOperario, getHistorialRegistrosPage, getRegistrosOperarioPage, getRegistrosSupervisorPage } from "../registrosApi";
import { getIngenieriaRegistrosPage } from "../ingenieriaApi";
import { getClienteHistorialPage, getClienteRegistrosObra } from "../clienteApi";
import { clearControlesPendientesCache, getControlesPendientesCorreccion } from "../jefeobraApi";

jest.mock("../config", () => ({
  API_BASE_URL: "https://example.test",
  readJsonResponse: async (r: { json: () => Promise<unknown> }) => r.json(),
}));
jest.mock("../authenticatedFetch", () => ({ authenticatedFetch: jest.fn() }));
jest.mock("@/services/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("expo-file-system", () => ({ File: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({}));
jest.mock("expo-sharing", () => ({}));

beforeEach(() => {
  jest.clearAllMocks();
  clearMisRegistrosCache();
  clearControlesPendientesCache();
  (getSession as jest.Mock).mockResolvedValue({ token: "token", user: { id: "usuario" } });
  (authenticatedFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { items: [], total: 0, nextCursor: null, counts: { todos: 0, pendiente: 0, rechazado: 0 } } }) });
});

const paginated = [
  getHistorialRegistrosPage,
  getRegistrosOperarioPage,
  getRegistrosSupervisorPage,
  getIngenieriaRegistrosPage,
  getClienteHistorialPage,
];

test("el resumen de inicio combina tipo y obra, separa la caché y permite refrescarla", async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { metrics: { total: 250 }, obras: [], recientes: [] } }) });
  const params = { tipoRegistro: "tabiqueria", obraId: "obra-1" };
  await getResumenOperario(params);
  await getResumenOperario(params);
  expect(authenticatedFetch).toHaveBeenCalledTimes(1);
  const query = new URL((authenticatedFetch as jest.Mock).mock.calls[0][0]).searchParams;
  expect(query.get("tipoRegistro")).toBe("tabiqueria");
  expect(query.get("obraId")).toBe("obra-1");
  await getResumenOperario(params, true);
  await getResumenOperario({ ...params, obraId: "obra-2" });
  await getResumenOperario({ ...params, tipoRegistro: "sello_cortafuego" });
  expect(authenticatedFetch).toHaveBeenCalledTimes(4);
  (getSession as jest.Mock).mockResolvedValue({ token: "token2", user: { id: "otro" } });
  await getResumenOperario(params);
  expect(authenticatedFetch).toHaveBeenCalledTimes(5);
  clearMisRegistrosCache();
  await getResumenOperario(params);
  expect(authenticatedFetch).toHaveBeenCalledTimes(6);
  await getResumenOperario({ tipoRegistro: "todos", obraId: "todas" });
  expect(new URL((authenticatedFetch as jest.Mock).mock.calls.at(-1)[0]).search).toBe("");
});

test("el resumen informa errores del backend sin reutilizar datos ajenos", async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ success: false, error: "Sin autorización" }) });
  await expect(getResumenOperario()).rejects.toThrow("Sin autorización");
});

test.each(paginated)("envía tipo y filtros en todas las páginas: %p", async (getPage) => {
  for (const cursor of [undefined, "pagina-2"]) {
    await getPage({ tipoRegistro: "tabiqueria", obraId: "obra-1", search: "001", fecha: "2026-08-21", limit: 25, cursor });
    const url = new URL((authenticatedFetch as jest.Mock).mock.calls.at(-1)[0]);
    expect(url.searchParams.get("tipoRegistro")).toBe("tabiqueria");
    expect(url.searchParams.get("obraId")).toBe("obra-1");
    expect(url.searchParams.get("search")).toBe("001");
    expect(url.searchParams.get("fecha")).toBe("2026-08-21");
    expect(url.searchParams.get("cursor")).toBe(cursor ?? null);
  }
});

test.each(paginated)("Todos no restringe el tipo: %p", async (getPage) => {
  await getPage({ tipoRegistro: "todos" });
  expect(new URL((authenticatedFetch as jest.Mock).mock.calls[0][0]).searchParams.has("tipoRegistro")).toBe(false);
});

test("el operario solicita páginas con la vista correcta y sin obra obligatoria", async () => {
  await getRegistrosOperarioPage({ tipoRegistro: "junta_lineal_espuma" });
  const query = new URL((authenticatedFetch as jest.Mock).mock.calls[0][0]).searchParams;
  expect(query.get("vista")).toBe("operario");
  expect(query.get("paginated")).toBe("true");
  expect(query.has("obraId")).toBe(false);
});

test("un backend anterior informa incompatibilidad en lugar de romper la pantalla del operario", async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) });
  await expect(getRegistrosOperarioPage()).rejects.toThrow("backend no devolvió el listado paginado");
});

test("pendientes de firma envía el tipo al backend", async () => {
  await getClienteRegistrosObra("obra-1", "sello_cortafuego");
  expect((authenticatedFetch as jest.Mock).mock.calls[0][0]).toBe("https://example.test/api/cliente/obras/obra-1/registros?tipoRegistro=sello_cortafuego");
});

test("Correcciones mantiene cachés independientes por tipo", async () => {
  await getControlesPendientesCorreccion(false, "sello_cortafuego");
  await getControlesPendientesCorreccion(false, "tabiqueria");
  await getControlesPendientesCorreccion(false, "sello_cortafuego");
  expect(authenticatedFetch).toHaveBeenCalledTimes(2);
  expect((authenticatedFetch as jest.Mock).mock.calls[1][0]).toContain("tipoRegistro=tabiqueria");
});
