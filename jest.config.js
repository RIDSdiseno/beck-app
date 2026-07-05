/** @type {import('jest').Config} */
module.exports = {
  // ts-jest para archivos TypeScript puros (services, utils)
  // sin el preset de jest-expo para evitar conflictos de versiones con Expo 54
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        module: "CommonJS",
        moduleResolution: "Node",
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        types: ["jest", "node"],
      },
    }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  testTimeout: 10000,
};
