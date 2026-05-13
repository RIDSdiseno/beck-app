# Beck CRM App

App mobile Expo/React Native para el CRM de Beck.

## Requisitos

- Node.js
- npm
- Expo CLI mediante `npx expo`
- Backend `beck-mobile-backend` disponible desde el dispositivo o emulador

## Instalación

```bash
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raíz de `beck-app`:

```bash
EXPO_PUBLIC_AZURE_TENANT_ID=tu-tenant-id
EXPO_PUBLIC_AZURE_CLIENT_ID=tu-client-id
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001
```

En dispositivo físico, `EXPO_PUBLIC_API_BASE_URL` debe apuntar a una URL accesible desde el teléfono, no a `localhost`.

## Desarrollo

```bash
npm start
```

También puedes iniciar por plataforma:

```bash
npm run ios
npm run android
npm run web
```

## Verificación

```bash
npm run lint
npx tsc --noEmit
```
