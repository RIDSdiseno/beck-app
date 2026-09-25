import type { RegistroCliente } from "@/services/api/clienteApi";

type RegistroBuscable = Pick<
  RegistroCliente,
  "numeroSello" | "piso" | "recinto" | "ejeNumerico" | "ejeAlfabetico" | "descripcionMaterial"
>;

function normalize(value: string | null | undefined) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function matchesClienteRegistro(
  registro: RegistroBuscable,
  query: string,
) {
  const term = normalize(query);
  return (
    !term ||
    [
      registro.numeroSello,
      `sello ${registro.numeroSello || ""}`,
      registro.piso,
      `piso ${registro.piso || ""}`,
      registro.recinto,
      registro.ejeNumerico,
      registro.ejeAlfabetico,
      registro.descripcionMaterial,
    ].some((value) => normalize(value).includes(term))
  );
}

export function matchesClienteFecha(fecha: string | null | undefined, filtro: string) {
  // La fecha de ejecución es un día calendario, no un instante a convertir a hora local.
  return !filtro || fecha?.slice(0, 10) === filtro;
}
