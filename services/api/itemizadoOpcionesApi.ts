import { API_BASE_URL, ensureArray, readJsonResponse } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";

export type ItemizadoOpcionApi = {
  id: string;
  codigo_beck?: string | null;
  tipo?: string | null;
  elemento_pasante?: string | null;
  elemento_penetra?: string | null;
  materialidad?: string | null;
  nombre_personalizado?: string | null;
};

export type GetItemizadoOpcionesParams = {
  search?: string;
  elementoPenetra?: string;
  materialidad?: string;
  limit?: number;
  obraId?: string;
  visible?: boolean;
};

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
  if (params?.limit !== undefined) query.set("limit", String(params.limit));
  if (params?.obraId?.trim()) query.set("obraId", params.obraId.trim());
  if (params?.visible !== undefined) query.set("visible", String(params.visible));

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

  return ensureArray<ItemizadoOpcionApi>(
    result.data,
    "Respuesta inválida del servidor al obtener los itemizados.",
  );
}
