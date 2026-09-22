import { cargarVisibilidadCliente } from "../clienteVisibilidad";
import { getConfiguracionRegistro } from "../obrasApi";

jest.mock("../obrasApi", () => ({ getConfiguracionRegistro: jest.fn() }));
const getConfig = getConfiguracionRegistro as jest.Mock;
beforeEach(() => jest.resetAllMocks());

test("consulta una vez por obra y fuerza configuración fresca para el cliente", async () => {
  getConfig.mockImplementation(async (id: string) => [{ campo: "modulo", visible: id !== "odata" }]);
  const result = await cargarVisibilidadCliente(["odata", "otra", "odata"]);
  expect(getConfig).toHaveBeenCalledTimes(2);
  expect(getConfig).toHaveBeenCalledWith("odata", "cliente", true);
  expect(result.odata.modulo).toBe(false);
  expect(result.otra.modulo).toBe(true);
});

test("no reutiliza valores anteriores después de un cambio del CRM", async () => {
  getConfig.mockResolvedValueOnce([{ campo: "foto", visible: true }])
    .mockResolvedValueOnce([{ campo: "foto", visible: false }]);
  expect((await cargarVisibilidadCliente(["odata"])).odata.foto).toBe(true);
  expect((await cargarVisibilidadCliente(["odata"])).odata.foto).toBe(false);
});

test("propaga errores sin sustituirlos por todos los campos visibles", async () => {
  getConfig.mockRejectedValue(new Error("Sin conexión"));
  await expect(cargarVisibilidadCliente(["odata"])).rejects.toThrow("Sin conexión");
  await expect(cargarVisibilidadCliente([""])).rejects.toThrow("identificar la obra");
});

test("una página vacía no consulta configuración", async () => {
  expect(await cargarVisibilidadCliente([])).toEqual({});
  expect(getConfig).not.toHaveBeenCalled();
});
