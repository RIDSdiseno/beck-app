import { getSession } from "@/services/auth/session";

export type ObraApi = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  estado?: string | null;
};

export type CampoConfiguracionRegistro =
  | "cieloModular"
  | "aislacion"
  | "reparacionTabique";

export type ConfiguracionCampoRegistroApi = {
  campo: CampoConfiguracionRegistro;
  visible: boolean;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;
let obrasCache: ObraApi[] | null = null;
const configuracionRegistroCache = new Map<string, ConfiguracionCampoRegistroApi[]>();

export function isObraDisponible(estado?: string | null) {
  return estado === "activa" || estado === "pausada";
}

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (!bodyText) return null;

  if (!contentType.includes("application/json")) {
    throw new Error("El servidor no respondió correctamente.");
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Error("El servidor no respondió correctamente.");
  }
}

export function clearMisObrasCache() {
  obrasCache = null;
  configuracionRegistroCache.clear();
}

export async function getMisObras(forceRefresh = false): Promise<ObraApi[]> {
  if (forceRefresh) {
    configuracionRegistroCache.clear();
  }

  if (obrasCache && !forceRefresh) {
    return obrasCache;
  }

  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await fetch(`${API_BASE_URL}/api/obras/mis-obras`, {
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

  obrasCache = (result.data as ObraApi[]).filter((obra) =>
    isObraDisponible(obra.estado),
  );
  return obrasCache;
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

  const response = await fetch(
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

  const data = result.data as ConfiguracionCampoRegistroApi[];
  configuracionRegistroCache.set(cacheKey, data);
  return data;
}
