// Configuración dinámica de Expo: extiende app.json sin duplicarlo.
//
// Los builds (preview, staging, producción) usan la policy "appVersion" de
// app.json: su runtime es la versión de la app y reciben las OTA de su canal.
//
// Canal "expo-go": sirve para mostrar la app desde Expo Go en iPhone (demos a
// clientes). Expo Go identifica su runtime como "exposdk:<major>.0.0", así que
// esos updates se publican con ese runtime literal, activado con EXPO_GO_UPDATE=1.
// Expo Go 57 para Android no carga updates de EAS (bug del cliente), por eso este
// canal es solo para iPhone. Publicar con: node ./scripts/publish-update.js expo-go
const { version: versionExpo } = require("expo/package.json");

const runtimeExpoGo = `exposdk:${versionExpo.split(".")[0]}.0.0`;

module.exports = ({ config }) => {
  if (process.env.EXPO_GO_UPDATE !== "1") {
    return config;
  }

  return { ...config, runtimeVersion: runtimeExpoGo };
};
