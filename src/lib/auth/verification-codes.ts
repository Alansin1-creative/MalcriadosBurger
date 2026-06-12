import { createHash, randomInt } from 'crypto';

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 10;
export const MAX_VERIFY_ATTEMPTS = 5;

export function generateNumericCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashVerificationCode(sessionId: string, code: string): string {
  return createHash('sha256').update(`${sessionId}:${code.trim()}`).digest('hex');
}

export function verifyCode(sessionId: string, code: string, expectedHash: string): boolean {
  if (!/^\d{6}$/.test(code.trim())) return false;
  return hashVerificationCode(sessionId, code) === expectedHash;
}

export function codeExpiresAt(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + CODE_TTL_MINUTES);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
