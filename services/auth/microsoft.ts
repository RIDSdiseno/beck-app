import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const tenantId = process.env.EXPO_PUBLIC_AZURE_TENANT_ID?.trim() || "";
const clientId = process.env.EXPO_PUBLIC_AZURE_CLIENT_ID?.trim() || "";

export const microsoftDiscovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${tenantId || "common"}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${tenantId || "common"}/oauth2/v2.0/token`,
};

export function isMicrosoftConfigured() {
  return Boolean(tenantId && clientId);
}

export function getMicrosoftRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: "beckcrmapp",
    path: "auth",
  });
}

export function getMicrosoftAuthRequestConfig(redirectUri: string) {
  return {
    clientId: clientId || "microsoft-login-disabled",
    scopes: ["openid", "profile", "email", "offline_access"],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: {
      prompt: "select_account",
    },
  };
}

export function getMicrosoftClientId() {
  if (!clientId) {
    throw new Error("El acceso con Microsoft aún no está configurado.");
  }

  return clientId;
}
