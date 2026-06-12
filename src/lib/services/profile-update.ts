import { randomUUID } from 'crypto';
import { getDb } from '../db';
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
import { sendPhoneVerificationPin, getDevVerificationHint } from './notifications';
import { findUserById, findUserByPhone, updateUserProfile } from './users';

type ProfileChangeSession = {
  id: string;
  user_id: number;
  pending_name: string;
  pending_phone: string;
  pin_hash: string;
  verify_phone: string;
  attempts: number;
  expires_at: string;
};

function getSession(id: string): ProfileChangeSession | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM profile_change_sessions WHERE id = ?').get(id) as
    | ProfileChangeSession
    | undefined;
}

function deleteSession(id: string) {
  getDb().prepare('DELETE FROM profile_change_sessions WHERE id = ?').run(id);
}

function isExpired(session: ProfileChangeSession): boolean {
  const exp = new Date(session.expires_at.replace(' ', 'T') + 'Z').getTime();
  return Date.now() > exp;
}

export async function startProfileChange(
  userId: number,
  input: { name: string; phone: string }
) {
  const user = findUserById(userId);
  if (!user) throw new Error('Usuario no encontrado');

  const name = input.name.trim();
  if (name.length < 2) throw new Error('Ingresa tu nombre completo');

  const phoneError = validateMexicanPhone(input.phone);
  if (phoneError) throw new Error(phoneError);

  const phone = normalizeMexicanPhone(input.phone);
  const currentPhone = user.phone ? normalizeMexicanPhone(user.phone) : '';

  if (name === user.name && phone === currentPhone) {
    throw new Error('No hay cambios por guardar');
  }

  const taken = findUserByPhone(phone);
  if (taken && taken.id !== userId) {
    throw new Error('Ese número de celular ya está registrado');
  }

  const verifyPhone = phone !== currentPhone ? phone : currentPhone || phone;
  if (!verifyPhone) {
    throw new Error('Agrega un celular válido para recibir el NIP de confirmación');
  }

  const db = getDb();
  db.prepare('DELETE FROM profile_change_sessions WHERE user_id = ?').run(userId);

  const sessionId = randomUUID();
  const pin = generateNumericCode();

  const sms = await sendPhoneVerificationPin(toE164Mexican(verifyPhone), pin);
  if (!sms.ok) throw new Error(sms.message);

  db.prepare(
    `INSERT INTO profile_change_sessions
     (id, user_id, pending_name, pending_phone, pin_hash, verify_phone, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sessionId,
    userId,
    name,
    phone,
    hashVerificationCode(sessionId, pin),
    verifyPhone,
    codeExpiresAt()
  );

  return {
    sessionId,
    phoneMasked: maskPhone(verifyPhone),
    expiresInMinutes: 10,
    devHint: getDevVerificationHint()
      ? 'Modo desarrollo: revisa la consola del servidor para el NIP'
      : undefined,
  };
}

export function verifyProfileChange(userId: number, sessionId: string, pin: string) {
  const session = getSession(sessionId);
  if (!session) throw new Error('Sesión de confirmación no encontrada o expirada');
  if (session.user_id !== userId) throw new Error('Sesión no válida');
  if (isExpired(session)) {
    deleteSession(sessionId);
    throw new Error('El NIP expiró. Vuelve a guardar tus datos.');
  }

  const pinOk = verifyCode(sessionId, pin, session.pin_hash);
  if (!pinOk) {
    const db = getDb();
    const attempts = session.attempts + 1;
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      deleteSession(sessionId);
      throw new Error('Demasiados intentos. Vuelve a guardar tus datos.');
    }
    db.prepare('UPDATE profile_change_sessions SET attempts = ? WHERE id = ?').run(
      attempts,
      sessionId
    );
    throw new Error('NIP incorrecto');
  }

  deleteSession(sessionId);
  return updateUserProfile(userId, {
    name: session.pending_name,
    phone: session.pending_phone,
  });
}
