export type LoginResponse = {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (!bodyText) return null;

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 404
        ? "El backend no tiene habilitado el login por correo."
        : "El servidor no respondió correctamente.",
    );
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Error("El servidor no respondió correctamente.");
  }
}

export async function loginWithMicrosoftIdToken(
  idToken: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/microsoft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const data = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(data?.error || "No se pudo iniciar sesión con Microsoft");
  }

  return data;
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await readApiResponse(response);

  if (!response.ok) {
    throw new Error(data?.error || "No se pudo iniciar sesión");
  }

  return data;
}
