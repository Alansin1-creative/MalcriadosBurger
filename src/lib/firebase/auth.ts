import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { normalizeMexicanPhone, validateMexicanPhone } from '@/lib/auth/phone-validation';
import { userCanPlaceOrders } from '@/lib/auth/client-profile';
import type { SessionUser, UserRole } from '@/lib/types';
import { getClientAuth, getClientDb } from './config';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  active: number;
  created_at: string;
};

function profileRef(uid: string) {
  return doc(getClientDb(), 'profiles', uid);
}

export function profileToSessionUser(profile: UserProfile): SessionUser {
  return {
    uid: profile.uid,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    phone: profile.phone,
    canOrder: userCanPlaceOrders({ email: profile.email, phone: profile.phone }),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const cred = await signInWithEmailAndPassword(getClientAuth(), email.trim(), password);
  const profile = await getUserProfile(cred.user.uid);
  if (!profile || profile.active !== 1) {
    await signOut(getClientAuth());
    throw new Error('Cuenta no encontrada o desactivada');
  }
  return profileToSessionUser(profile);
}

export async function signUp(input: {
  email: string;
  password: string;
  name: string;
  phone: string;
}): Promise<SessionUser> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const phoneError = validateMexicanPhone(input.phone);
  if (phoneError) throw new Error(phoneError);
  const phone = normalizeMexicanPhone(input.phone);
  if (name.length < 2) throw new Error('Ingresa tu nombre completo');

  const cred = await createUserWithEmailAndPassword(getClientAuth(), email, input.password);
  const profile: UserProfile = {
    uid: cred.user.uid,
    email,
    name,
    role: 'client',
    phone,
    active: 1,
    created_at: new Date().toISOString(),
  };
  await setDoc(profileRef(cred.user.uid), profile);
  return profileToSessionUser(profile);
}

export async function signOutUser(): Promise<void> {
  await signOut(getClientAuth());
}

export function subscribeAuth(
  callback: (user: SessionUser | null) => void
): () => void {
  return onAuthStateChanged(getClientAuth(), async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    const profile = await getUserProfile(firebaseUser.uid);
    if (!profile || profile.active !== 1) {
      callback(null);
      return;
    }
    callback(profileToSessionUser(profile));
  });
}
