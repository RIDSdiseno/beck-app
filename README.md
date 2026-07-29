# Beck App

Aplicación móvil para la gestión de registros de obra de Beck. Permite a técnicos, jefes de obra, ingenieros y administradores crear, revisar y aprobar registros de sellos cortafuego y juntas lineales directamente desde el dispositivo.

---

## Tabla de contenidos

- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura del proyecto](#arquitectura-del-proyecto)
- [Autenticación](#autenticación)
- [Roles y permisos](#roles-y-permisos)
- [Pantallas principales](#pantallas-principales)
- [Capa de servicios](#capa-de-servicios)
- [Seguridad](#seguridad)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y desarrollo](#instalación-y-desarrollo)
- [Build y distribución (EAS)](#build-y-distribución-eas)

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | React Native + Expo SDK 54 |
| Navegación | Expo Router v6 (file-based routing) |
| Estilos | NativeWind v4 (Tailwind CSS para React Native) |
| UI | React Native Paper (MD3) |
| Animaciones | Moti + Reanimated v4 |
| Autenticación | Credenciales creadas en el CRM + JWT |
| Almacenamiento seguro | `expo-secure-store` (Keychain en iOS / Keystore en Android) |
| HTTP | `fetch` nativo con wrapper `authenticatedFetch` |
| Imágenes | `expo-image-picker` + `expo-image-manipulator` |
| Gráficos | `react-native-chart-kit` |
| Build / distribución | EAS Build + EAS Update |

---

## Arquitectura del proyecto

```
beck-app/
├── app/                        # Rutas (Expo Router file-based routing)
│   ├── _layout.tsx             # Root layout: providers globales (Paper, Navigation, Context)
│   ├── index.tsx               # Splash de arranque y redirección según sesión
│   ├── login.tsx               # Pantalla de login con credenciales del CRM
│   ├── modal.tsx               # Modal genérico reutilizable
│   └── (tabs)/                 # Navegación por pestañas (requiere sesión activa)
│       ├── _layout.tsx         # Tab navigator con acceso condicional por rol
│       ├── index.tsx           # Inicio / Dashboard
│       ├── registros.tsx       # Crear y gestionar registros de obra
│       ├── historial.tsx       # Historial de registros del usuario
│       ├── mis-obras.tsx       # Obras asignadas al usuario
│       ├── cotizaciones.tsx    # Módulo de cotizaciones (en desarrollo)
│       ├── reportes.tsx        # Reportes y estadísticas
│       └── perfil.tsx          # Perfil de usuario y cierre de sesión
│
├── services/
│   ├── api/
│   │   ├── config.ts           # URL base, readJsonResponse, ensureArray (fuente única)
│   │   ├── authenticatedFetch.ts # Wrapper fetch: maneja 401, limpia caché, redirige a login
│   │   ├── authApi.ts          # Login por email/password y validación de token
│   │   ├── obrasApi.ts         # CRUD de obras + configuración de campos por obra
│   │   ├── registrosApi.ts     # CRUD de registros, fotos y flujo de estados
│   │   └── itemizadoOpcionesApi.ts # Búsqueda y listado de opciones de itemizado
│   └── auth/
│       ├── session.ts          # Lectura/escritura de sesión en SecureStore + migración
│       └── roles.ts            # Guards y helpers de control de acceso por rol
│
├── context/
│   ├── RegistrosContext.tsx    # Estado local de registros (operaciones CRUD)
│   └── HistorialContext.tsx    # Historial de movimientos local
│
├── components/
│   ├── BrandHeader.tsx         # Cabecera con logo Beck
│   ├── BeckSplash.tsx          # Splash screen animado
│   ├── RegistroContextBox.tsx  # Caja de contexto de registro activo
│   └── ui/                     # Componentes de UI genéricos (iconos, collapsible)
│
├── constants/
│   └── theme.ts                # Tokens de color y tipografía del design system
│
├── utils/
│   └── registroEstado.ts       # Helpers de estado: colores, labels, fechas formateadas
│
├── types/
│   └── beck.ts                 # Tipos base de dominio (Registro, EstadoRegistro, etc.)
│
├── hooks/                      # Hooks de utilidad (color scheme, theme color)
├── assets/                     # Imágenes, logo e íconos
├── app.json                    # Configuración Expo (bundle ID, ATS, plugins)
└── eas.json                    # Configuración EAS Build (sin credenciales)
```

---

## Autenticación

La app admite únicamente las credenciales creadas desde el CRM. El inicio de
sesión se realiza contra `POST /api/mobile/auth/email`; el backend devuelve un
JWT propio y los datos del usuario autorizado.

### Gestión de sesión

`services/auth/session.ts` centraliza toda la lógica:

- **Guardado**: JWT + datos de usuario en `SecureStore`. Al guardar se elimina automáticamente la copia legacy de `AsyncStorage`.
- **Migración**: Si existe sesión previa en `AsyncStorage` (versiones anteriores de la app), se migra silenciosamente a `SecureStore` en el primer acceso.
- **Expiración**: `isJwtExpired` decodifica el claim `exp` del JWT. Si el payload es inválido o falta `exp`, la sesión se considera expirada (fail-closed).
- **Cierre**: `clearSession` borra SecureStore y elimina las claves legacy de AsyncStorage.

---

## Roles y permisos

El backend asigna un rol a cada usuario. La app adapta la navegación y las acciones disponibles según el rol:

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `terreno` | Técnico de terreno | Solo pestañas de registros e historial propio |
| `jefeobra` | Jefe de obra | Igual que terreno + puede revisar registros del equipo |
| `ingenieria` | Ingeniero | Acceso completo a todos los módulos |
| `admin` | Administrador | Acceso completo + gestión de usuarios |
| `visualizador` | Solo lectura | Puede ver registros y reportes, sin crear |
| `vendedor` | Ventas | Acceso al módulo de cotizaciones |

`services/auth/roles.ts` expone `canViewAllModules(rol)` que devuelve `false` para `terreno` y `jefeobra`, restringiendo las pestañas visibles en `(tabs)/_layout.tsx`.

---

## Pantallas principales

### Registros (`/registros`)

Pantalla principal de operación para técnicos. Permite:

- Seleccionar obra asignada.
- Elegir tipo de registro: **sello cortafuego** o **junta lineal espuma**.
- Rellenar los campos configurados por obra (el backend define qué campos son visibles y obligatorios).
- Adjuntar y comprimir fotografías (`expo-image-manipulator`).
- Enviar el registro al flujo de revisión.

El flujo de estados de un registro es:

```
pendiente → en_revision → validado
                       ↘ rechazado → (técnico corrige) → en_revision
```

### Historial (`/historial`)

Lista paginada de todos los registros del usuario con filtros por estado y obra. Muestra el contexto completo de cada registro, incluyendo motivo de rechazo y correcciones anteriores.

### Mis Obras (`/mis-obras`)

Listado de las obras activas y pausadas asignadas al usuario con detalles de cada obra.

### Reportes (`/reportes`)

Gráficos de cantidad de registros por estado y por obra usando `react-native-chart-kit`.

---

## Capa de servicios

### `services/api/config.ts`

Fuente única para:
- `API_BASE_URL`: URL del backend normalizada (elimina slashes finales). Se puede sobreescribir con `EXPO_PUBLIC_API_BASE_URL`.
- `readJsonResponse(response)`: Lee el cuerpo de una respuesta HTTP como JSON de forma segura. Lanza error si el Content-Type no es `application/json` o el cuerpo está vacío.
- `ensureArray<T>(data, message)`: Verifica que un valor sea un array y lo tipifica. Lanza error descriptivo si no lo es.

### `services/api/authenticatedFetch.ts`

Wrapper sobre `fetch` nativo que intercepta errores de autenticación:

- **401 No autorizado**: llama a `closeExpiredSession()` que limpia las cachés en memoria de obras y registros, borra la sesión de SecureStore y redirige a `/login`. Luego lanza un error para interrumpir el flujo del llamador.
- **403 Prohibido**: registra una advertencia en consola (solo en desarrollo) sin interrumpir.
- Usa lazy `require()` para importar las funciones de caché y evitar dependencias circulares.

### `services/api/obrasApi.ts`

- `getMisObras(forceRefresh?)`: obtiene las obras activas y pausadas del usuario. Cachea en memoria por `user.id`.
- `getConfiguracionRegistro(obraId, rol, forceRefresh?)`: obtiene los campos configurados para una obra y rol. Cachea por `rol:obraId`. Normaliza los nombres de campo del backend al formato camelCase del frontend.
- `clearMisObrasCache()`: limpia ambas cachés (llamado al cerrar sesión).

### `services/api/registrosApi.ts`

- `getMisRegistros(forceRefresh?, params?)`: lista de registros del usuario con filtros opcionales por obra, estado y scope. Cachea por usuario + parámetros.
- `createRegistro(payload)`: crea un registro nuevo e invalida la caché.
- `enviarRegistroAIngenieria(id, payload)`: envía un registro al flujo de revisión de ingeniería.
- `reenviarRegistroComoTecnico(id, payload)`: reenvía un registro corregido.
- `uploadRegistroFotos(registroId, fotos, options?)`: sube fotos de a una para evitar timeouts. El flag `replaceExisting` reemplaza la foto principal en la primera subida.
- `clearMisRegistrosCache()`: invalida toda la caché de registros.

---

## Seguridad

### Almacenamiento

Los datos sensibles (JWT, información del usuario) se almacenan exclusivamente en `expo-secure-store`, que usa **Keychain** en iOS y **Keystore** en Android. Ningún dato de sesión queda en `AsyncStorage` (texto plano).

### Transporte (iOS)

`NSAllowsArbitraryLoads` está deshabilitado en `app.json`. Solo `localhost` tiene excepción explícita para el servidor de desarrollo local. En producción, toda la comunicación va por HTTPS.

### Credenciales en build

`EXPO_PUBLIC_API_BASE_URL` no contiene un secreto, pero se configura por ambiente para separar preview y producción:

```bash
eas env:create --scope project --name EXPO_PUBLIC_API_BASE_URL --value <valor> --environment production
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto para desarrollo local:

```bash
# URL del backend (en dispositivo físico usar la IP de tu máquina, no localhost)
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.x:3001

```

> Las variables `EXPO_PUBLIC_*` son públicas en el bundle de la app. Nunca pongas secrets de servidor aquí.

---

## Instalación y desarrollo

### Requisitos

- Node.js 18+
- npm
- Expo CLI: `npx expo`
- Backend `beck-mobile-backend` ejecutándose y accesible desde el dispositivo/emulador

### Pasos

```bash
# Instalar dependencias
npm install

# Copiar y configurar variables de entorno
cp .env.example .env   # (o crear .env manualmente con los valores de arriba)

# Iniciar el servidor de desarrollo
npm start
```

### Iniciar por plataforma

```bash
npm run ios      # Simulador iOS
npm run android  # Emulador/dispositivo Android
npm run web      # Navegador (modo desarrollo)
```

### Verificación de tipos y lint

```bash
npx tsc --noEmit   # Chequeo de TypeScript sin emitir archivos
npm run lint       # ESLint con reglas de Expo
```

---

## Build y distribución (EAS)

El proyecto usa **EAS Build** para generar los binarios de producción y **EAS Update** para actualizaciones OTA.

### Perfiles de build

| Perfil | Canal | Formato | Uso |
|--------|-------|---------|-----|
| `preview` | `production` | APK (Android) | Testing interno, distribución directa |
| `production` | `production` | AAB (Android) / IPA (iOS) | Google Play / App Store |

### Generar un build

```bash
# Build de preview para Android (APK descargable)
eas build --profile preview --platform android

# Build de producción para Android
eas build --profile production --platform android

# Build de producción para iOS
eas build --profile production --platform ios
```

### Actualización OTA

```bash
# Publicar actualización sin necesidad de nuevo build
eas update --channel production --message "Descripción del cambio"
```

> Las actualizaciones OTA solo funcionan para cambios en JavaScript/assets. Cambios en código nativo (plugins, permisos, etc.) requieren nuevo build.

### IDs de la app

| Plataforma | Bundle ID |
|-----------|-----------|
| iOS | `com.beckcrm.app` |
| Android | `com.expotest2sorganization.beckapp` |
