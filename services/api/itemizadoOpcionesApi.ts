import { API_BASE_URL } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";

export type ItemizadoOpcionApi = {
  id: string;
  codigo_beck?: string | null;
  tipo?: string | null;
  elemento_pasante?: string | null;
  elemento_penetra?: string | null;
  materialidad?: string | null;
};

export type GetItemizadoOpcionesParams = {
  search?: string;
  elementoPenetra?: string;
  materialidad?: string;
  limit?: number;
};

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

export async function getItemizadoOpciones(
  params?: GetItemizadoOpcionesParams,
): Promise<ItemizadoOpcionApi[]> {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const query = new URLSearchParams();
  if (params?.search?.trim()) query.set("search", params.search.trim());
  if (params?.elementoPenetra?.trim()) {
    query.set("elementoPenetra", params.elementoPenetra.trim());
  }
  if (params?.materialidad?.trim()) {
    query.set("materialidad", params.materialidad.trim());
  }
  if (params?.limit) query.set("limit", String(params.limit));

  const queryString = query.toString();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/itemizado-opciones${queryString ? `?${queryString}` : ""}`,
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
    throw new Error(result?.error || "No se pudieron obtener los itemizados");
  }

  return result.data as ItemizadoOpcionApi[];
}
