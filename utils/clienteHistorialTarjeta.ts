import type { RegistroCliente } from "@/services/api/clienteApi";
import { campoVisibleCliente, type ClienteVisibilidad } from "@/utils/clienteVisibilidad";

type DatosTarjeta = Pick<RegistroCliente,
  "tipoRegistro" | "piso" | "recinto" | "ejeNumerico" | "ejeAlfabetico" |
  "descripcionMaterial" | "cantidadSellos" | "metrosLineales"
>;

export function resumenTarjetaCliente(registro: DatosTarjeta, config?: ClienteVisibilidad) {
  const visible = (campo: Parameters<typeof campoVisibleCliente>[1]) => campoVisibleCliente(config, campo);
  const ubicacion = [
    visible("piso") ? `Piso ${registro.piso || "—"}` : null,
    visible("recinto") ? `Recinto: ${registro.recinto || "—"}` : null,
  ].filter(Boolean).join(" · ");
  const ejes = [
    visible("ejeNumerico") ? `Eje numérico: ${registro.ejeNumerico || "—"}` : null,
    visible("ejeAlfabetico") ? `Eje alfabético: ${registro.ejeAlfabetico || "—"}` : null,
  ].filter(Boolean).join(" · ");
  const cantidad = !visible(registro.tipoRegistro === "junta_lineal_espuma" ? "metrosLineales" : "cantidadSellos") ? null
    : registro.tipoRegistro === "junta_lineal_espuma"
      ? registro.metrosLineales != null ? `${registro.metrosLineales} m` : "Sin metraje"
      : registro.cantidadSellos != null
        ? `${registro.cantidadSellos} ${registro.tipoRegistro === "tabiqueria" ? (registro.cantidadSellos === 1 ? "unidad" : "unidades") : registro.cantidadSellos === 1 ? "sello" : "sellos"}`
        : "Sin cantidad";

  return {
    ubicacion,
    ejes,
    cantidad,
    material: visible("itemizadoBeck") ? registro.descripcionMaterial || null : null,
  };
}
