import { authenticatedFetch } from "../authenticatedFetch";
import { getSession, type SessionUser } from "@/services/auth/session";
import {
  bodegaRequest,
  compartirEtiquetasBodega,
  nuevaOperacionBodega,
  puedeAccederBodegaBeck,
} from "../bodegaBeckApi";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

jest.mock("../config", () => ({
  API_BASE_URL: "https://example.test",
  readJsonResponse: async (r: { json: () => Promise<unknown> }) => r.json(),
}));
jest.mock("../authenticatedFetch", () => ({ authenticatedFetch: jest.fn() }));
jest.mock("@/services/auth/session", () => ({ getSession: jest.fn() }));
jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file:///cache/",
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));
const user: SessionUser = {
  id: "bodega-id",
  nombre: "Bodega",
  email: "bodega@firemat.cl",
  rol: "bodeguero",
  empresa: "firemat",
};
beforeEach(() => {
  jest.clearAllMocks();
  (getSession as jest.Mock).mockResolvedValue({ token: "test-token", user });
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: { autorizado: true } }),
  });
  (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ status: 200 });
  (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
});

test("solo el bodeguero de Firemat puede abrir el acceso BECK", () => {
  expect(puedeAccederBodegaBeck(user)).toBe(true);
  for (const rol of [
    "administrador",
    "jefeobra",
    "terreno",
    "vendedor_firemat",
    "visualizador_firemat",
  ])
    expect(puedeAccederBodegaBeck({ ...user, rol })).toBe(false);
  expect(puedeAccederBodegaBeck({ ...user, empresa: "beck" })).toBe(false);
  expect(
    puedeAccederBodegaBeck({ ...user, email: "otro@becksoluciones.cl" }),
  ).toBe(false);
  expect(puedeAccederBodegaBeck(null)).toBe(false);
});
test("consulta con la sesión Firemat original, sin suplantar un usuario BECK", async () => {
  await expect(bodegaRequest("/acceso")).resolves.toEqual({ autorizado: true });
  expect(authenticatedFetch).toHaveBeenCalledWith(
    "https://example.test/api/bodega-beck/acceso",
    expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
    }),
  );
});
test("deniega peticiones antes de enviarlas si no tiene permiso", async () => {
  (getSession as jest.Mock).mockResolvedValue({
    token: "test-token",
    user: { ...user, rol: "terreno" },
  });
  await expect(bodegaRequest("/asignaciones", {})).rejects.toThrow("exclusivo");
  expect(authenticatedFetch).not.toHaveBeenCalled();
});
test("transmite la clave de reintento y no cambia el inventario de Firemat", async () => {
  const requestId = nuevaOperacionBodega();
  expect(requestId).toMatch(
    /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
  );
  await bodegaRequest("/asignaciones", { requestId, cantidad: 2 });
  expect(authenticatedFetch).toHaveBeenCalledWith(
    "https://example.test/api/bodega-beck/asignaciones",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ requestId, cantidad: 2 }),
    }),
  );
});
test("presenta el mensaje de validación del backend", async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    ok: false,
    json: async () => ({ success: false, error: "Stock insuficiente" }),
  });
  await expect(bodegaRequest("/asignaciones", {})).rejects.toThrow(
    "Stock insuficiente",
  );
});
test("comparte etiquetas como archivo PDF protegido y limpia la copia temporal", async () => {
  await compartirEtiquetasBodega({ tipo: "epp", id: "test" });
  expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
    expect.stringContaining("/api/bodega-beck/etiquetas?"),
    expect.stringMatching(/\.pdf$/),
    { headers: { Authorization: "Bearer test-token" } },
  );
  expect(Sharing.shareAsync).toHaveBeenCalledWith(
    expect.stringMatching(/\.pdf$/),
    expect.objectContaining({ mimeType: "application/pdf" }),
  );
  expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
});
test("una descarga fallida no comparte un error como PDF", async () => {
  (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({ status: 403 });
  await expect(
    compartirEtiquetasBodega({ tipo: "epp", id: "test" }),
  ).rejects.toThrow("descargar");
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
});
