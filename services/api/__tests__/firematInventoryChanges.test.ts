import { authenticatedFetch } from "../authenticatedFetch";
import { createFirematScanReception, getFirematInventario, updateFirematInventario } from "../firematApi";
import { getFirematInventoryRevision, subscribeFirematInventoryChanges } from "../firematInventoryChanges";

jest.mock("@/services/api/config", () => ({
  API_BASE_URL: "https://example.test",
  ensureArray: (value: unknown) => value,
  readJsonResponse: async (response: { json: () => Promise<unknown> }) => response.json(),
}));
jest.mock("@/services/api/authenticatedFetch", () => ({ authenticatedFetch: jest.fn() }));
jest.mock("@/services/auth/session", () => ({ getSession: async () => ({ token: "test-token" }) }));

const fetchMock = authenticatedFetch as jest.Mock;
beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [], resumen: {} }) });
});

test("leer inventario no fuerza otro refresh", async () => {
  const before = getFirematInventoryRevision();
  await getFirematInventario();
  expect(getFirematInventoryRevision()).toBe(before);
});

test("una recepción confirmada avisa una sola vez y queda pendiente al salir de la pantalla", async () => {
  const before = getFirematInventoryRevision();
  const listener = jest.fn();
  const unsubscribe = subscribeFirematInventoryChanges(listener);
  try {
    await createFirematScanReception({ recepcionId: "test", motivo: "Recepción", items: [] });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getFirematInventoryRevision()).toBe(before + 1);
  } finally { unsubscribe(); }
  await updateFirematInventario(1, { stockNuevo: 24, motivo: "Ajuste" });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(getFirematInventoryRevision()).toBe(before + 2);
});

test("una recepción fallida no marca el stock como cambiado", async () => {
  const before = getFirematInventoryRevision();
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "No se pudo guardar" }) });
  await expect(createFirematScanReception({ recepcionId: "test", motivo: "Recepción", items: [] })).rejects.toThrow("No se pudo guardar");
  expect(getFirematInventoryRevision()).toBe(before);
});
