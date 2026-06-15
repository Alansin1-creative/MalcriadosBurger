import { doc, runTransaction } from 'firebase/firestore';
import { getClientDb } from './config';

export async function nextNumericId(counter: string): Promise<number> {
  const db = getClientDb();
  const ref = doc(db, '_counters', counter);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? Number(snap.data().value ?? 0) : 0;
    const next = current + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}
