/** México — celular 10 dígitos */
const MX_MOBILE_RE = /^[1-9]\d{9}$/;

export function normalizeMexicanPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('52')) {
    return digits.slice(2);
  }
  if (digits.length === 13 && digits.startsWith('521')) {
    return digits.slice(3);
  }
  if (digits.length === 10) {
    return digits;
  }
  return digits.slice(-10);
}

export function formatMexicanPhone(input: string): string {
  const d = normalizeMexicanPhone(input);
  if (d.length !== 10) return input;
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
}

export function toE164Mexican(input: string): string {
  const d = normalizeMexicanPhone(input);
  return `+52${d}`;
}

export function validateMexicanPhone(input: string): string | null {
  const digits = normalizeMexicanPhone(input);
  if (digits.length !== 10) {
    return 'El celular debe tener 10 dígitos (México)';
  }
  if (!MX_MOBILE_RE.test(digits)) {
    return 'Número de celular no válido';
  }
  return null;
}

export function maskPhone(input: string): string {
  const d = normalizeMexicanPhone(input);
  if (d.length < 4) return '***';
  return `*** *** ${d.slice(-4)}`;
}
