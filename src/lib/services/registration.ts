import { randomUUID } from 'crypto';
import { getDb } from '../db';
import { validatePassword } from '../auth/password-policy';
import { validateEmailDeliverable, normalizeEmail, maskEmail } from '../auth/email-validation';
import {
  validateMexicanPhone,
  normalizeMexicanPhone,
  toE164Mexican,
  maskPhone,
} from '../auth/phone-validation';
import {
  generateNumericCode,
  hashVerificationCode,
  verifyCode,
  codeExpiresAt,
  MAX_VERIFY_ATTEMPTS,
} from '../auth/verification-codes';
import { hashPassword } from '../auth/password';
import {
  sendEmailVerificationCode,
  sendPhoneVerificationPin,
  getDevVerificationHint,
} from './notifications';
import { findUserByEmail, findUserByPhone, createVerifiedUser } from './users';

type SessionRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  email_code_hash: string;
  phone_code_hash: string;
  email_verified: number;
  phone_verified: number;
  attempts: number;
  expires_at: string;
};

function getSession(id: string): SessionRow | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM registration_sessions WHERE id = ?').get(id) as
    | SessionRow
    | undefined;
}

function deleteSession(id: string) {
  getDb().prepare('DELETE FROM registration_sessions WHERE id = ?').run(id);
}

function isSessionExpired(session: SessionRow): boolean {
  const exp = new Date(session.expires_at.replace(' ', 'T') + 'Z').getTime();
  return Date.now() > exp;
}

export async function startRegistration(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
}) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const phone = normalizeMexicanPhone(input.phone);

  if (name.length < 2) throw new Error('Ingresa tu nombre completo');

  const passwordError = validatePassword(input.password);
  if (passwordError) throw new Error(passwordError);

  const emailError = await validateEmailDeliverable(email);
  if (emailError) throw new Error(emailError);

  const phoneError = validateMexicanPhone(phone);
  if (phoneError) throw new Error(phoneError);

  if (findUserByEmail(email)) throw new Error('Ya existe una cuenta con ese correo');
  if (findUserByPhone(phone)) throw new Error('Ese número de celular ya está registrado');

  const db = getDb();
  db.prepare('DELETE FROM registration_sessions WHERE email = ? OR phone = ?').run(email, phone);

  const sessionId = randomUUID();
  const emailCode = generateNumericCode();
  const phonePin = generateNumericCode();
  const passwordHash = await hashPassword(input.password);

  const emailSend = await sendEmailVerificationCode(email, emailCode, name);
  if (!emailSend.ok) throw new Error(emailSend.message);

  const smsSend = await sendPhoneVerificationPin(toE164Mexican(phone), phonePin);
  if (!smsSend.ok) throw new Error(smsSend.message);

  db.prepare(
    `INSERT INTO registration_sessions
     (id, name, email, phone, password_hash, email_code_hash, phone_code_hash, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sessionId,
    name,
    email,
    phone,
    passwordHash,
    hashVerificationCode(sessionId, emailCode),
    hashVerificationCode(sessionId, phonePin),
    codeExpiresAt()
  );

  return {
    sessionId,
    emailMasked: maskEmail(email),
    phoneMasked: maskPhone(phone),
    expiresInMinutes: 10,
    devHint: getDevVerificationHint()
      ? 'Modo desarrollo: revisa la consola del servidor para los códigos'
      : undefined,
  };
}

export async function resendRegistrationCode(sessionId: string, channel: 'email' | 'phone') {
  const session = getSession(sessionId);
  if (!session) throw new Error('Sesión de registro no encontrada o expirada');
  if (isSessionExpired(session)) {
    deleteSession(sessionId);
    throw new Error('El código expiró. Vuelve a registrarte');
  }

  const code = generateNumericCode();
  const db = getDb();

  if (channel === 'email') {
    const send = await sendEmailVerificationCode(session.email, code, session.name);
    if (!send.ok) throw new Error(send.message);
    db.prepare(
      'UPDATE registration_sessions SET email_code_hash = ?, expires_at = ?, attempts = 0 WHERE id = ?'
    ).run(hashVerificationCode(sessionId, code), codeExpiresAt(), sessionId);
  } else {
    const send = await sendPhoneVerificationPin(toE164Mexican(session.phone), code);
    if (!send.ok) throw new Error(send.message);
    db.prepare(
      'UPDATE registration_sessions SET phone_code_hash = ?, expires_at = ?, attempts = 0 WHERE id = ?'
    ).run(hashVerificationCode(sessionId, code), codeExpiresAt(), sessionId);
  }

  return { ok: true as const };
}

export async function completeRegistration(
  sessionId: string,
  emailCode: string,
  phonePin: string
) {
  const session = getSession(sessionId);
  if (!session) throw new Error('Sesión de registro no encontrada o expirada');
  if (isSessionExpired(session)) {
    deleteSession(sessionId);
    throw new Error('El código expiró. Vuelve a registrarte');
  }

  if (session.attempts >= MAX_VERIFY_ATTEMPTS) {
    deleteSession(sessionId);
    throw new Error('Demasiados intentos. Inicia el registro de nuevo');
  }

  const emailOk = verifyCode(sessionId, emailCode, session.email_code_hash);
  const phoneOk = verifyCode(sessionId, phonePin, session.phone_code_hash);

  if (!emailOk || !phoneOk) {
    getDb()
      .prepare('UPDATE registration_sessions SET attempts = attempts + 1 WHERE id = ?')
      .run(sessionId);
    const parts: string[] = [];
    if (!emailOk) parts.push('código de correo');
    if (!phoneOk) parts.push('NIP del celular');
    throw new Error(`${parts.join(' y ')} incorrecto(s)`);
  }

  if (findUserByEmail(session.email)) {
    deleteSession(sessionId);
    throw new Error('Ya existe una cuenta con ese correo');
  }
  if (findUserByPhone(session.phone)) {
    deleteSession(sessionId);
    throw new Error('Ese número de celular ya está registrado');
  }

  const user = await createVerifiedUser({
    email: session.email,
    passwordHash: session.password_hash,
    name: session.name,
    phone: session.phone,
  });

  deleteSession(sessionId);
  return user;
}
