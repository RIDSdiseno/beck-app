import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const tenantId = process.env.EXPO_PUBLIC_AZURE_TENANT_ID!;
const clientId = process.env.EXPO_PUBLIC_AZURE_CLIENT_ID!;

export const microsoftDiscovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
};

export function getMicrosoftRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: "beckcrmapp",
    path: "auth",
  });
}

export const microsoftAuthConfig = {
  clientId,
  scopes: ["openid", "profile", "email", "offline_access"],
};
