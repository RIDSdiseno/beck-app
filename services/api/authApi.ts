import { API_BASE_URL, readJsonResponse } from "@/services/api/config";

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
    empresa: "beck" | "firemat";
  };
};

export async function loginWithMicrosoftIdToken(
  idToken: string,
  empresa?: "beck" | "firemat",
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/microsoft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken, empresa }),
  });

  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.error || "No se pudo iniciar sesión con Microsoft");
  }

  return data;
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
  empresa: "beck" | "firemat",
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, empresa }),
  });

  // 404 aquí significa que el endpoint de login por email no está habilitado.
  if (response.status === 404) {
    throw new Error("El backend no tiene habilitado el login por correo.");
  }

  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.error || "No se pudo iniciar sesión");
  }

  return data;
}
