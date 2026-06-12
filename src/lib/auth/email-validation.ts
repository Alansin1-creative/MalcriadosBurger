const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  '10minutemail.com',
  'yopmail.com',
  'throwaway.email',
  'fakeinbox.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'temp-mail.org',
  'dispostable.com',
]);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmailFormatValid(email: string): boolean {
  const normalized = normalizeEmail(email);
  if (normalized.length > 254) return false;
  return EMAIL_RE.test(normalized);
}

export function isDisposableEmail(email: string): boolean {
  const domain = normalizeEmail(email).split('@')[1];
  if (!domain) return true;
  return DISPOSABLE_DOMAINS.has(domain) || domain.endsWith('.tk') || domain.endsWith('.ml');
}

/** Formato + dominios desechables. La entrega real se valida al enviar el código de verificación. */
export async function validateEmailDeliverable(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!isEmailFormatValid(normalized)) {
    return 'Ingresa un correo electrónico válido';
  }
  if (isDisposableEmail(normalized)) {
    return 'No se permiten correos temporales o desechables';
  }
  return null;
}

export function maskEmail(email: string): string {
  const [local, domain] = normalizeEmail(email).split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}
