import type { ObraCliente } from "@/services/api/clienteApi";
import { filtrarObrasCliente, resumirObrasCliente, sumarSellosCliente } from "../clienteObras";

const obra = (overrides: Partial<ObraCliente>): ObraCliente => ({
  id: "1",
  nombre: "Edificio San José",
  codigo: "OB-031",
  cliente: null,
  direccion: null,
  estado: "activa",
  registrosPendientes: 3,
  registrosValidados: 2,
  ...overrides,
});
const obras = [
  obra({}),
  obra({
    id: "2",
    nombre: "Planta Norte",
    codigo: "OB-032",
    registrosPendientes: 0,
    registrosValidados: 4,
  }),
];

describe("resumen y filtros del cliente", () => {
  it("suma sellos y no cantidades de registros", () => {
    expect(sumarSellosCliente([obra({ cantidadSellos: 20 }), obra({ cantidadSellos: 12 })])).toBe(32);
  });
  it("distingue cero sellos de un backend sin la nueva métrica", () => {
    expect(sumarSellosCliente([])).toBe(0);
    expect(sumarSellosCliente([obra({ cantidadSellos: 0 })])).toBe(0);
    expect(sumarSellosCliente([obra({})])).toBeNull();
    expect(sumarSellosCliente([obra({ cantidadSellos: 10 }), obra({})])).toBeNull();
    expect(sumarSellosCliente([obra({ cantidadSellos: NaN })])).toBeNull();
    expect(sumarSellosCliente([obra({ cantidadSellos: -1 })])).toBeNull();
  });
  it("suma los conteos del servidor sin alterar su significado", () => {
    expect(resumirObrasCliente(obras)).toEqual({
      pendientes: 3,
      validados: 6,
      total: 9,
      obras: 2,
      obrasPendientes: 1,
      avance: 67,
    });
  });
  it("no muestra avance ficticio cuando no hay registros", () => {
    expect(resumirObrasCliente([])).toEqual({
      pendientes: 0,
      validados: 0,
      total: 0,
      obras: 0,
      obrasPendientes: 0,
      avance: 0,
    });
    expect(
      resumirObrasCliente([
        obra({ registrosPendientes: 0, registrosValidados: 0 }),
      ]).avance,
    ).toBe(0);
  });
  it("distingue obras pendientes y validadas, permitiendo que una tenga ambos", () => {
    expect(filtrarObrasCliente(obras, "pendientes")).toEqual([obras[0]]);
    expect(filtrarObrasCliente(obras, "validadas")).toEqual(obras);
    expect(
      filtrarObrasCliente(
        [
          ...obras,
          obra({ id: "3", registrosPendientes: 0, registrosValidados: 0 }),
        ],
        "todas",
      ),
    ).toHaveLength(3);
  });
  it("busca por nombre o código, sin distinguir tildes y mayúsculas", () => {
    expect(filtrarObrasCliente(obras, "todas", "jose")).toEqual([obras[0]]);
    expect(filtrarObrasCliente(obras, "todas", "  ob-032  ")).toEqual([
      obras[1],
    ]);
    expect(filtrarObrasCliente(obras, "pendientes", "OB-032")).toEqual([]);
  });
  it("no modifica los datos de obras recibidos", () => {
    const original = JSON.stringify(obras);
    resumirObrasCliente(obras);
    filtrarObrasCliente(obras, "pendientes", "jose");
    expect(JSON.stringify(obras)).toBe(original);
  });
});
