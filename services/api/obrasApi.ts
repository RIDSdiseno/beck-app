import { API_BASE_URL, ensureArray, readJsonResponse } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";

export type ObraApi = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  estado?: string | null;
};

export type CampoConfiguracionRegistro =
  | "tipoRegistro"
  | "codigoBeck"
  | "itemizadoBeck"
  | "itemizadoMandante"
  | "fechaEjecucionSello"
  | "diaSemana"
  | "piso"
  | "ejeAlfabetico"
  | "ejeNumerico"
  | "nombreSellador"
  | "foto"
  | "recinto"
  | "modulo"
  | "numeroSello"
  | "cantidadSellos"
  | "metrosLineales"
  | "holgura"
  | "factorPorHolguras"
  | "cieloModular"
  | "cantidadSellosConFactores"
  | "aislacion"
  | "cantidadSellosAislacion"
  | "reparacionTabique"
  | "cantidadFinal"
  | "observaciones"
  | "folio";

export type ConfiguracionCampoRegistroApi = {
  campo: CampoConfiguracionRegistro;
  campoOrigen?: string;
  color?: "verde" | "azul" | "rojo";
  configurable?: boolean;
  visible: boolean;
};

const obrasCache = new Map<string, ObraApi[]>();
const configuracionRegistroCache = new Map<string, ConfiguracionCampoRegistroApi[]>();

const CAMPO_CONFIG_ALIASES: Record<string, CampoConfiguracionRegistro> = {
  tipo_registro: "tipoRegistro",
  tipoRegistro: "tipoRegistro",
  codigoBeck: "codigoBeck",
  itemizadoBeck: "itemizadoBeck",
  itemizadoMandante: "itemizadoMandante",
  fechaEjecucionSello: "fechaEjecucionSello",
  diaSemana: "diaSemana",
  piso: "piso",
  eje_alfabetico: "ejeAlfabetico",
  ejeAlfabetico: "ejeAlfabetico",
  eje_numerico: "ejeNumerico",
  ejeNumerico: "ejeNumerico",
  nombreSellador: "nombreSellador",
  foto: "foto",
  recinto: "recinto",
  modulo: "modulo",
  numeroSello: "numeroSello",
  cantidadSellos: "cantidadSellos",
  metros_lineales: "metrosLineales",
  metrosLineales: "metrosLineales",
  holgura: "holgura",
  factor_por_holguras: "factorPorHolguras",
  factorPorHolguras: "factorPorHolguras",
  accesibilidad: "cieloModular",
  cielo_modular: "cieloModular",
  cieloModular: "cieloModular",
  cantidad_sellos_con_factores: "cantidadSellosConFactores",
  cantidadSellosConFactores: "cantidadSellosConFactores",
  aislacion: "aislacion",
  cantidad_sellos_aislacion: "cantidadSellosAislacion",
  cantidadSellosAislacion: "cantidadSellosAislacion",
  reparacion_tabique: "reparacionTabique",
  reparacionTabique: "reparacionTabique",
  cantidad_final: "cantidadFinal",
  cantidadFinal: "cantidadFinal",
  observaciones: "observaciones",
  folio: "folio",
};

function normalizeCampoConfiguracion(campo: unknown) {
  return typeof campo === "string" ? CAMPO_CONFIG_ALIASES[campo] : undefined;
}

export function isObraDisponible(estado?: string | null) {
  return estado === "activa" || estado === "pausada";
}


export function clearMisObrasCache() {
  obrasCache.clear();
  configuracionRegistroCache.clear();
}

export async function getMisObras(forceRefresh = false): Promise<ObraApi[]> {
  if (forceRefresh) {
    configuracionRegistroCache.clear();
  }

  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const cacheKey = session.user?.id ?? "anonymous";
  const cached = obrasCache.get(cacheKey);

  if (cached && !forceRefresh) {
    return cached;
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/api/obras/mis-obras`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
  });

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudieron obtener las obras");
  }

  const data = ensureArray<ObraApi>(
    result.data,
    "Respuesta inválida del servidor al obtener las obras.",
  ).filter((obra) => isObraDisponible(obra.estado));
  obrasCache.set(cacheKey, data);
  return data;
}

export async function getConfiguracionRegistro(
  obraId: string,
  rol: "trabajador" | "jefeobra",
  forceRefresh = false,
): Promise<ConfiguracionCampoRegistroApi[]> {
  const cacheKey = `${rol}:${obraId}`;
  const cached = configuracionRegistroCache.get(cacheKey);
  if (cached && !forceRefresh) {
    return cached;
  }

  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/obras/${obraId}/configuracion-registro`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.error || "No se pudo cargar la configuracion del registro",
    );
  }

  const data = ensureArray<ConfiguracionCampoRegistroApi>(
    result.data,
    "Respuesta inválida del servidor al obtener la configuración del registro.",
  )
    .map((campo) => ({
      ...campo,
      campo: normalizeCampoConfiguracion(campo.campo) || campo.campo,
    }))
    .filter((campo) => normalizeCampoConfiguracion(campo.campo));
  configuracionRegistroCache.set(cacheKey, data);
  return data;
}
