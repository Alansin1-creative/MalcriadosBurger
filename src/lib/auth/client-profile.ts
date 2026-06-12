import { normalizeMexicanPhone, validateMexicanPhone } from './phone-validation';

export type OrderContactProfile = {
  email?: string | null;
  phone?: string | null;
};

export function userCanPlaceOrders(profile: OrderContactProfile): boolean {
  const email = profile.email?.trim();
  if (!email) return false;
  const phone = profile.phone ? normalizeMexicanPhone(profile.phone) : '';
  if (!phone) return false;
  return validateMexicanPhone(phone) === null;
}

export function missingOrderContactMessage(profile: OrderContactProfile): string {
  const missing: string[] = [];
  if (!profile.email?.trim()) missing.push('correo electrónico');
  const phone = profile.phone ? normalizeMexicanPhone(profile.phone) : '';
  if (!phone || validateMexicanPhone(profile.phone ?? '') !== null) {
    missing.push('número de celular');
  }
  if (missing.length === 0) return 'Completa tu perfil para poder pedir.';
  return `Agrega tu ${missing.join(' y ')} en Mi perfil para poder hacer pedidos.`;
}

export function assertClientCanPlaceOrders(profile: OrderContactProfile): void {
  if (!userCanPlaceOrders(profile)) {
    throw new Error(missingOrderContactMessage(profile));
  }
}
