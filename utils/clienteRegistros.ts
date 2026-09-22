import type { RegistroCliente } from "@/services/api/clienteApi";

type RegistroBuscable = Pick<
  RegistroCliente,
  "numeroSello" | "piso" | "nombreSellador" | "sellador" | "folio"
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
      registro.nombreSellador || registro.sellador,
      registro.folio,
    ].some((value) => normalize(value).includes(term))
  );
}
