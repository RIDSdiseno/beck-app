import { getSession } from "@/services/auth/session";

export type ObraApi = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  estado?: string | null;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;
let obrasCache: ObraApi[] | null = null;

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
}

export async function getMisObras(forceRefresh = false): Promise<ObraApi[]> {
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

  obrasCache = result.data as ObraApi[];
  return obrasCache;
}
