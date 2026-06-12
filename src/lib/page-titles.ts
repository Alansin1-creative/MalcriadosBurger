const PAGE_TITLES: Record<string, string> = {
  '/inicio': 'Inicio',
  '/pedir': 'Hacer pedido',
  '/mis-pedidos': 'Mis pedidos',
  '/perfil': 'Mi perfil',
  '/local': 'Comer en local',
  '/': 'Panel',
  '/pos': 'POS',
  '/caja': 'Caja',
  '/cocina': 'Cocina',
  '/mesas': 'Mesas y barra',
  '/inventario': 'Despensa',
  '/recetas': 'Recetas',
  '/reportes': 'Ventas',
  '/asistente': 'Asistente IA',
  '/ocr': 'Tickets OCR',
  '/admin/cuentas': 'Cuentas',
  '/admin/menu': 'Editar menú',
};

export function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const segment = pathname.split('/').filter(Boolean).pop();
  if (!segment) return 'Malcriados';
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}
