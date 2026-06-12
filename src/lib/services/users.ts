import { getDb } from '../db';
import { hashPassword } from '../auth/password';
import { normalizeMexicanPhone, validateMexicanPhone } from '../auth/phone-validation';
import type { User, UserRole } from '../types';

export function findUserByEmail(email: string): (User & { password_hash: string }) | undefined {
  const db = getDb();
  return db
    .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
    .get(email.trim().toLowerCase()) as (User & { password_hash: string }) | undefined;
}

export function findUserByPhone(phone: string): User | undefined {
  const db = getDb();
  const digits = phone.replace(/\D/g, '').slice(-10);
  return db
    .prepare('SELECT id, email, name, role, active, phone, email_verified, phone_verified, created_at FROM users WHERE phone = ?')
    .get(digits) as User | undefined;
}

export function findUserById(id: number): User | undefined {
  const db = getDb();
  return db
    .prepare(
      'SELECT id, email, name, role, active, phone, email_verified, phone_verified, created_at FROM users WHERE id = ?'
    )
    .get(id) as User | undefined;
}

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  return createVerifiedUser({
    email: input.email,
    passwordHash,
    name: input.name,
    role: input.role,
    phone: null,
    emailVerified: input.role === 'admin' ? 1 : 0,
    phoneVerified: input.role === 'admin' ? 1 : 0,
  });
}

export async function createVerifiedUser(input: {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string | null;
  role?: UserRole;
  emailVerified?: number;
  phoneVerified?: number;
}): Promise<User> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const existing = findUserByEmail(email);
  if (existing) throw new Error('Ya existe una cuenta con ese correo');

  const phone = input.phone ? input.phone.replace(/\D/g, '').slice(-10) : null;
  if (phone && findUserByPhone(phone)) {
    throw new Error('Ese número de celular ya está registrado');
  }

  const result = db
    .prepare(
      `INSERT INTO users (email, password_hash, name, role, phone, email_verified, phone_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      email,
      input.passwordHash,
      input.name.trim(),
      input.role ?? 'client',
      phone,
      input.emailVerified ?? 1,
      input.phoneVerified ?? 1
    );

  return findUserById(Number(result.lastInsertRowid))!;
}

export function listUsers(): User[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, email, name, role, active, phone, email_verified, phone_verified, created_at
       FROM users ORDER BY created_at DESC`
    )
    .all() as User[];
}

export function updateUser(
  id: number,
  patch: Partial<{ name: string; role: UserRole; active: number }>
): User {
  const db = getDb();
  const user = findUserById(id);
  if (!user) throw new Error('Usuario no encontrado');

  const name = patch.name ?? user.name;
  const role = patch.role ?? user.role;
  const active = patch.active ?? user.active;

  db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?').run(
    name,
    role,
    active,
    id
  );

  return findUserById(id)!;
}

export function updateUserProfile(
  id: number,
  patch: { name?: string; phone?: string }
): User {
  const db = getDb();
  const user = findUserById(id);
  if (!user) throw new Error('Usuario no encontrado');

  const name = patch.name !== undefined ? patch.name.trim() : user.name;
  if (!name) throw new Error('El nombre es obligatorio');

  let phone = user.phone;
  if (patch.phone !== undefined) {
    const phoneError = validateMexicanPhone(patch.phone);
    if (phoneError) throw new Error(phoneError);
    phone = normalizeMexicanPhone(patch.phone);
    const taken = findUserByPhone(phone);
    if (taken && taken.id !== id) {
      throw new Error('Ese número de celular ya está registrado');
    }
  }

  db.prepare('UPDATE users SET name = ?, phone = ?, phone_verified = 1 WHERE id = ?').run(
    name,
    phone,
    id
  );

  return findUserById(id)!;
}
