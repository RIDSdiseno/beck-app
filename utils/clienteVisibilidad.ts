import type { CampoConfiguracionRegistro, ConfiguracionCampoRegistroApi } from "@/services/api/obrasApi";

export type ClienteVisibilidad = Partial<Record<CampoConfiguracionRegistro, boolean>>;

export function crearVisibilidadCliente(config: ConfiguracionCampoRegistroApi[]): ClienteVisibilidad {
  return Object.fromEntries(config.map(({ campo, visible }) => [campo, visible]));
}

// No mostrar campos configurables hasta haber obtenido la configuración de la obra.
export function campoVisibleCliente(config: ClienteVisibilidad | undefined, campo: CampoConfiguracionRegistro) {
  if (campo === "numeroSello") return true;
  // En cliente, el metraje de juntas utiliza la misma opción que cantidad de sellos.
  return config?.[campo === "metrosLineales" ? "cantidadSellos" : campo] === true;
}
