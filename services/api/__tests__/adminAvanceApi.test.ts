import { authenticatedFetch } from "../authenticatedFetch";
import { getSession, type SessionUser } from "@/services/auth/session";
import { getAdminAvance, getAdminAvanceObras } from "../adminApi";

jest.mock("../config", () => ({
  API_BASE_URL: "https://example.test",
  readJsonResponse: async (r: { json: () => Promise<unknown> }) => r.json(),
}));
jest.mock("../authenticatedFetch", () => ({ authenticatedFetch: jest.fn() }));
jest.mock("@/services/auth/session", () => ({ getSession: jest.fn() }));
const user: SessionUser = {
  id: "admin",
  nombre: "Administrador",
  email: "admin@becksoluciones.cl",
  rol: "administrador",
  empresa: "beck",
};
beforeEach(() => {
  jest.clearAllMocks();
  (getSession as jest.Mock).mockResolvedValue({ token: "test-token", user });
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: [] }),
  });
});
test("consulta opciones de obra con sesión autenticada", async () => {
  await getAdminAvanceObras();
  expect(authenticatedFetch).toHaveBeenCalledWith(
    "https://example.test/api/admin/avance-obras/opciones",
    { headers: { Authorization: "Bearer test-token" } },
  );
});
test("envía obra y período al backend, sin filtrar un listado truncado en el teléfono", async () => {
  await getAdminAvance("obra-1", "semana");
  expect(authenticatedFetch).toHaveBeenCalledWith(
    "https://example.test/api/admin/avance-obras?obraId=obra-1&periodo=semana",
    { headers: { Authorization: "Bearer test-token" } },
  );
});
test.each(["terreno", "jefeobra", "ingenieria", "cliente", "bodeguero"])(
  "no permite al rol %s consultar el panel administrativo",
  async (rol) => {
    (getSession as jest.Mock).mockResolvedValue({
      token: "test-token",
      user: { ...user, rol },
    });
    await expect(getAdminAvanceObras()).rejects.toThrow("exclusivo");
    expect(authenticatedFetch).not.toHaveBeenCalled();
  },
);
test("no permite cuentas Firemat ni sesión vacía", async () => {
  (getSession as jest.Mock).mockResolvedValue({
    token: "test-token",
    user: { ...user, empresa: "firemat" },
  });
  await expect(getAdminAvance("obra-1", "todo")).rejects.toThrow("exclusivo");
  (getSession as jest.Mock).mockResolvedValue({ token: null, user: null });
  await expect(getAdminAvanceObras()).rejects.toThrow("exclusivo");
  expect(authenticatedFetch).not.toHaveBeenCalled();
});
test("error de servidor no se convierte en indicadores con ceros", async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    ok: false,
    json: async () => ({
      success: false,
      error: "No se pudo cargar el avance",
    }),
  });
  await expect(getAdminAvance("obra-1", "mes")).rejects.toThrow(
    "No se pudo cargar el avance",
  );
});
