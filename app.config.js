// Configuración dinámica de Expo: extiende app.json sin duplicarlo.
//
// Los builds de tienda usan la policy "appVersion" definida en app.json, de modo
// que su runtime es la versión de la app (1.0.5) y reciben las OTA del canal
// "production". Expo Go, en cambio, solo identifica su runtime nativo como
// "exposdk:<major>.0.0", así que los updates destinados a Expo Go deben
// publicarse con ese runtime literal. Se activa con EXPO_GO_UPDATE=1.
const { version: versionExpo } = require("expo/package.json");

const runtimeExpoGo = `exposdk:${versionExpo.split(".")[0]}.0.0`;

module.exports = ({ config }) => {
  if (process.env.EXPO_GO_UPDATE !== "1") {
    return config;
  }

  return { ...config, runtimeVersion: runtimeExpoGo };
};
