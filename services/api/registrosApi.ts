import { getSession } from "@/services/auth/session";

export type CreateRegistroPayload = {
  obraId: string;
  fecha: string;
  descripcionMaterial: string;
  modulo: string;
  piso: string;
  ejeNumerico: number;
  ejeAlfabetico: string;
  numeroSello: string;
  cantidadSellos: number;
  nombreSellador: string;
  holgura: number;
  accesibilidad: number;
  observaciones?: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

export async function createRegistro(payload: CreateRegistroPayload) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await fetch(`${API_BASE_URL}/api/registros`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result?.error || "No se pudo crear el registro");
  }

  return result.data;
}

export async function uploadRegistroFotos(
  registroId: string,
  fotos: {
    uri: string;
    name: string;
    type: string;
  }[],
) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const formData = new FormData();

  fotos.forEach((foto) => {
    formData.append("fotos", {
      uri: foto.uri,
      name: foto.name,
      type: foto.type,
    } as any);
  });

  const response = await fetch(
    `${API_BASE_URL}/api/registros/${registroId}/fotos`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      body: formData,
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result?.error || "No se pudieron subir las fotos");
  }

  return result.data;
}
