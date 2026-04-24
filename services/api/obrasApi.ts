import { getSession } from "@/services/auth/session";

export type ObraApi = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  estado?: string | null;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

export async function getMisObras(): Promise<ObraApi[]> {
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

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result?.error || "No se pudieron obtener las obras");
  }

  return result.data as ObraApi[];
}
