#!/usr/bin/env node
// Publica un update de EAS tomando las variables desde .env (backend de
// producción) e ignorando por completo .env.local, que apunta al servidor de
// desarrollo en la red local. Sin esto, un `eas update` lanzado desde una
// máquina de desarrollo hornea la IP LAN en el bundle de todos los usuarios.
//
//   node scripts/publish-update.js production "Mensaje del update"
//   node scripts/publish-update.js expo-go    "Mensaje del update"

const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "..");
const DESTINOS = {
  production: { canal: "production", expoGo: false },
  "expo-go": { canal: "expo-go", expoGo: true },
};

function leerEnv(archivo) {
  let contenido;

  try {
    contenido = readFileSync(path.join(RAIZ, archivo), "utf8");
  } catch {
    console.error(`No se encontró ${archivo} en la raíz del proyecto.`);
    process.exit(1);
  }

  const variables = {};

  for (const linea of contenido.split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;

    const corte = limpia.indexOf("=");
    if (corte === -1) continue;

    const clave = limpia.slice(0, corte).trim();
    const valor = limpia
      .slice(corte + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");

    if (clave) variables[clave] = valor;
  }

  return variables;
}

const [destinoPedido, ...restoArgs] = process.argv.slice(2);
const destino = DESTINOS[destinoPedido];

if (!destino) {
  console.error(
    `Destino inválido: "${destinoPedido ?? ""}". Usa uno de: ${Object.keys(DESTINOS).join(", ")}`
  );
  process.exit(1);
}

const mensaje = restoArgs.join(" ").trim();

if (!mensaje) {
  console.error("Falta el mensaje del update.");
  process.exit(1);
}

const variables = leerEnv(".env");
const faltantes = ["EXPO_PUBLIC_API_BASE_URL"].filter((clave) => !variables[clave]);

if (faltantes.length > 0) {
  console.error(`Faltan variables en .env: ${faltantes.join(", ")}`);
  process.exit(1);
}

console.log(`Canal: ${destino.canal}`);
console.log(`API: ${variables.EXPO_PUBLIC_API_BASE_URL}`);
console.log(`Runtime: ${destino.expoGo ? "exposdk (Expo Go)" : "appVersion (builds de tienda)"}\n`);

const resultado = spawnSync(
  "npx",
  [
    "eas-cli",
    "update",
    "--channel",
    destino.canal,
    "--message",
    mensaje,
    // Requerido por EAS CLI en modo no interactivo (CI). Las variables que
    // importan ya vienen fijadas desde .env; esto solo elige el entorno de EAS.
    "--environment",
    "production",
  ],
  {
    cwd: RAIZ,
    stdio: "inherit",
    env: {
      ...process.env,
      ...variables,
      // Desactiva la carga de .env/.env.local dentro de Expo CLI: las
      // variables de arriba ya quedaron fijadas y son las únicas válidas.
      EXPO_NO_DOTENV: "1",
      ...(destino.expoGo ? { EXPO_GO_UPDATE: "1" } : {}),
    },
  }
);

process.exit(resultado.status ?? 1);
