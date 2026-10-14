type Usuario = { rol?: string; empresa?: string } | null | undefined;

export function esAdministradorBeck(user: Usuario): boolean {
  return user?.rol === "administrador" && user.empresa === "beck";
}

export function puedeAccederFiremat(user: Usuario): boolean {
  return user?.empresa === "firemat" || esAdministradorBeck(user);
}

export function puedeGestionarFiremat(user: Usuario): boolean {
  return (user?.empresa === "firemat" && user.rol === "bodeguero") || esAdministradorBeck(user);
}
