import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getClientDb } from './config';

const SETTINGS_DOC = 'restaurant';

export async function getRestaurantStatus(): Promise<{ isOpen: boolean; updatedAt: string | null }> {
  const snap = await getDoc(doc(getClientDb(), 'settings', SETTINGS_DOC));
  if (!snap.exists()) return { isOpen: true, updatedAt: null };
  const data = snap.data();
  return {
    isOpen: data.isOpen !== false,
    updatedAt: (data.updatedAt as string) ?? null,
  };
}

export async function setRestaurantOpen(open: boolean): Promise<{ isOpen: boolean; updatedAt: string }> {
  const updatedAt = new Date().toISOString();
  await setDoc(
    doc(getClientDb(), 'settings', SETTINGS_DOC),
    { isOpen: open, updatedAt },
    { merge: true }
  );
  return { isOpen: open, updatedAt };
}
