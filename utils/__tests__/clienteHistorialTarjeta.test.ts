import { resumenTarjetaCliente } from "../clienteHistorialTarjeta";
import type { ClienteVisibilidad } from "../clienteVisibilidad";

const registro = {
  tipoRegistro: "sello_cortafuego", piso: "-1", recinto: "Bodega",
  ejeNumerico: "2-3", ejeAlfabetico: "A-B", descripcionMaterial: "Sello de lana mineral",
  cantidadSellos: 3, metrosLineales: null,
  nombreSellador: "Responsable privado", modulo: "Módulo privado",
};
const config: ClienteVisibilidad = {
  piso: true, recinto: true, ejeNumerico: true, ejeAlfabetico: true,
  itemizadoBeck: true, cantidadSellos: true, nombreSellador: true, modulo: true,
};

test("presenta los campos solicitados sin responsable ni módulo aunque sean visibles", () => {
  expect(resumenTarjetaCliente(registro, config)).toEqual({
    ubicacion: "Piso -1 · Recinto: Bodega",
    ejes: "Eje numérico: 2-3 · Eje alfabético: A-B",
    cantidad: "3 sellos", material: "Sello de lana mineral",
  });
});

test("respeta individualmente los campos ocultos por obra", () => {
  expect(resumenTarjetaCliente(registro, {
    ...config, recinto: false, ejeNumerico: false, itemizadoBeck: false, cantidadSellos: false,
  })).toEqual({
    ubicacion: "Piso -1", ejes: "Eje alfabético: A-B", cantidad: null, material: null,
  });
});

test("no expone información configurable antes de cargar la configuración", () => {
  expect(resumenTarjetaCliente(registro)).toEqual({
    ubicacion: "", ejes: "", cantidad: null, material: null,
  });
});

test.each([[0, "0 sellos"], [1, "1 sello"]])("conserva la cantidad %s sin aplicar factores", (cantidadSellos, cantidad) => {
  expect(resumenTarjetaCliente({ ...registro, cantidadSellos }, config).cantidad).toBe(cantidad);
});

test("las juntas muestran el metraje, usando la opción de cantidad configurada en el CRM", () => {
  const junta = { ...registro, tipoRegistro: "junta_lineal_espuma", metrosLineales: 2.5 };
  expect(resumenTarjetaCliente(junta, config).cantidad).toBe("2.5 m");
  expect(resumenTarjetaCliente(junta, { ...config, cantidadSellos: false }).cantidad).toBeNull();
});

test("maneja valores vacíos sin inventar cantidades", () => {
  expect(resumenTarjetaCliente({
    ...registro, piso: "", recinto: null, ejeNumerico: "", ejeAlfabetico: "", descripcionMaterial: null,
  }, config)).toMatchObject({
    ubicacion: "Piso — · Recinto: —", ejes: "Eje numérico: — · Eje alfabético: —", material: null,
  });
  expect(resumenTarjetaCliente({ ...registro, tipoRegistro: "junta_lineal_espuma" }, config).cantidad).toBe("Sin metraje");
});
