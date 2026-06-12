export const AUTH_PATHS = ['/login', '/register'];

export const PUBLIC_PATHS = ['/local'];

export const CLIENT_PATHS = ['/inicio', '/pedir', '/mis-pedidos', '/perfil'];

export const ADMIN_PREFIXES = [
  '/',
  '/pos',
  '/caja',
  '/cocina',
  '/mesas',
  '/inventario',
  '/recetas',
  '/reportes',
  '/asistente',
  '/ocr',
  '/admin',
];

export function isAuthPath(pathname: string) {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isClientPath(pathname: string) {
  return CLIENT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isAdminPath(pathname: string) {
  if (isAuthPath(pathname) || isClientPath(pathname) || isPublicPath(pathname)) return false;
  if (pathname.startsWith('/api')) return false;
  return ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function defaultPathForRole(role: 'client' | 'admin') {
  return role === 'admin' ? '/' : '/inicio';
}
