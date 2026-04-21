import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const tenantId = "9b1d2116-2dff-4efa-89a3-465b62215224";
const clientId = "7bcbc920-c3d3-4d9f-811f-7cf3013361be";

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
