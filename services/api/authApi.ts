export type LoginResponse = {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
};

type MicrosoftLoginPayload = {
  code: string;
  codeVerifier: string;
  redirectUri: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

export async function loginWithMicrosoft(
  payload: MicrosoftLoginPayload,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/microsoft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "No se pudo iniciar sesión con Microsoft");
  }

  return data;
}
