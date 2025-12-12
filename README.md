# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.


1️⃣ Clonar el proyecto
git clone <URL_DEL_REPOSITORIO>
cd <nombre-carpeta-proyecto>
(Reemplaza <URL_DEL_REPOSITORIO> y <nombre-carpeta-proyecto> por los tuyos.)

2️⃣ Instalar dependencias

Dentro de la carpeta del proyecto:
npm install


3️⃣ Crear archivo .env (opcional pero recomendado)

En la raíz del proyecto (donde está package.json) crea un archivo llamado .env con:

VITE_API_BASE_URL=http://localhost:3000

Si no lo crean, el front usará por defecto https://localhost:3000.
Para solo ver la UI basta con que el front levante; si quieren login funcional, el backend debe estar arriba en esa URL.


4️⃣ Levantar el proyecto en modo desarrollo
npm run dev


La consola de Vite mostrará algo como:

  ➜  Local:   http://localhost:5173/

5️⃣ Abrir en el navegador

Abrir en el navegador:

http://localhost:5173/




comandos que use 
npx rn-new --nativewind
npm install nativewind react-native-reanimated@~3.17.4 react-native-safe-area-context@5.4.0
npm install --dev tailwindcss@^3.4.17 prettier-plugin-tailwindcss@^0.5.11