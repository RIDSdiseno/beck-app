import { matchesClienteRegistro } from "../clienteRegistros";

const registro = {
  numeroSello: "0042",
  piso: "-1",
  nombreSellador: "José González",
  sellador: "",
  folio: "JL-012",
};

describe("búsqueda de pendientes del cliente", () => {
  it("incluye todos los registros con una búsqueda vacía", () => {
    expect(matchesClienteRegistro(registro, "  ")).toBe(true);
  });
  it("encuentra sello y piso sin cambiar ceros ni signos", () => {
    expect(matchesClienteRegistro(registro, "0042")).toBe(true);
    expect(matchesClienteRegistro(registro, "sello 0042")).toBe(true);
    expect(matchesClienteRegistro(registro, "piso -1")).toBe(true);
  });
  it("busca responsables sin depender de tildes o mayúsculas", () => {
    expect(matchesClienteRegistro(registro, "JOSE GONZALEZ")).toBe(true);
    expect(
      matchesClienteRegistro(
        { ...registro, nombreSellador: "", sellador: "Ana" },
        "ana",
      ),
    ).toBe(true);
  });
  it("permite buscar el folio de juntas y descarta coincidencias inexistentes", () => {
    expect(matchesClienteRegistro(registro, "jl-012")).toBe(true);
    expect(matchesClienteRegistro(registro, "piso 20")).toBe(false);
    expect(
      matchesClienteRegistro(
        {
          numeroSello: "",
          piso: "",
          nombreSellador: "",
          sellador: "",
          folio: null,
        },
        "0042",
      ),
    ).toBe(false);
  });
});
