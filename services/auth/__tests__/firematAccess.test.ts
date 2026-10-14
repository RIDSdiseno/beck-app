import { esAdministradorBeck, puedeAccederFiremat, puedeGestionarFiremat } from "../firematAccess";

test("administrador cambia de plataforma sin modificar su identidad", () => {
  const user = Object.freeze({ rol: "administrador", empresa: "beck" });
  expect(esAdministradorBeck(user)).toBe(true);
  expect(puedeAccederFiremat(user)).toBe(true);
  expect(puedeGestionarFiremat(user)).toBe(true);
  expect(user).toEqual({ rol: "administrador", empresa: "beck" });
});

test.each(["terreno", "supervisor", "jefeobra", "ingenieria", "cliente"])("no permite cambiar a %s de Beck", (rol) => {
  const user = { rol, empresa: "beck" };
  expect(puedeAccederFiremat(user)).toBe(false);
  expect(puedeGestionarFiremat(user)).toBe(false);
});

test.each(["bodeguero", "vendedor_firemat", "visualizador_firemat"])("conserva permisos de %s", (rol) => {
  const user = { rol, empresa: "firemat" };
  expect(puedeAccederFiremat(user)).toBe(true);
  expect(puedeGestionarFiremat(user)).toBe(rol === "bodeguero");
  expect(esAdministradorBeck(user)).toBe(false);
});

test("no permite una sesión ausente", () => {
  expect(puedeAccederFiremat(null)).toBe(false);
  expect(puedeGestionarFiremat(undefined)).toBe(false);
});
