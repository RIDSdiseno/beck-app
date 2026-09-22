import { campoVisibleCliente, crearVisibilidadCliente } from "../clienteVisibilidad";
import type { CampoConfiguracionRegistro } from "@/services/api/obrasApi";

const ocultosOdata: CampoConfiguracionRegistro[] = [
  "dimensiones", "folio", "itemizadoMandante", "modulo", "nombreSellador", "reparacionTabique",
];

test("respeta los seis campos ocultos de ODATA para cliente sin alterar otros campos", () => {
  const config = crearVisibilidadCliente([
    ...ocultosOdata.map((campo) => ({ campo, visible: false })),
    { campo: "piso", visible: true }, { campo: "foto", visible: true },
  ]);
  ocultosOdata.forEach((campo) => expect(campoVisibleCliente(config, campo)).toBe(false));
  expect(campoVisibleCliente(config, "piso")).toBe(true);
  expect(campoVisibleCliente(config, "foto")).toBe(true);
});

test("no revela campos configurables sin configuración ni al faltar una clave", () => {
  for (const config of [undefined, {}]) {
    [...ocultosOdata, "foto" as const, "piso" as const].forEach((campo) =>
      expect(campoVisibleCliente(config, campo)).toBe(false));
    expect(campoVisibleCliente(config, "numeroSello")).toBe(true);
  }
});

test("separa la visibilidad de dos obras y usa cantidadSellos para el metraje", () => {
  const primera = crearVisibilidadCliente([{ campo: "nombreSellador", visible: false }, { campo: "cantidadSellos", visible: false }]);
  const segunda = crearVisibilidadCliente([{ campo: "nombreSellador", visible: true }, { campo: "cantidadSellos", visible: true }]);
  expect(campoVisibleCliente(primera, "nombreSellador")).toBe(false);
  expect(campoVisibleCliente(segunda, "nombreSellador")).toBe(true);
  expect(campoVisibleCliente(primera, "metrosLineales")).toBe(false);
  expect(campoVisibleCliente(segunda, "metrosLineales")).toBe(true);
});
