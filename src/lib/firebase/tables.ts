import { collection, doc, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import type { Table, TableStatus } from '@/lib/types';
import { getClientDb } from './config';

export function isSeatAvailable(status: string): boolean {
  return status === 'free';
}

export async function listRestaurantSeating(): Promise<Table[]> {
  const snap = await getDocs(collection(getClientDb(), 'tables'));
  return snap.docs
    .map((d) => d.data() as Table)
    .sort((a, b) => a.id - b.id);
}

export async function getTableName(tableId: number | null): Promise<string | null> {
  if (!tableId) return null;
  const snap = await getDoc(doc(getClientDb(), 'tables', String(tableId)));
  return snap.exists() ? ((snap.data().name as string) ?? null) : null;
}

export async function updateTableStatus(tableId: number, status: TableStatus): Promise<void> {
  await updateDoc(doc(getClientDb(), 'tables', String(tableId)), { status });
}

export function seatingSummary(seats: Table[], restaurantOpen = true) {
  if (!restaurantOpen) {
    return {
      isOpen: false,
      seats,
      availableCount: 0,
      totalCount: seats.length,
      hasTableFree: false,
      barStoolsFree: 0,
    };
  }
  const available = seats.filter((s) => isSeatAvailable(s.status));
  return {
    isOpen: true,
    seats,
    availableCount: available.length,
    totalCount: seats.length,
    hasTableFree: seats.some((s) => s.zone === 'Salón' && isSeatAvailable(s.status)),
    barStoolsFree: seats.filter((s) => s.zone === 'Barra' && isSeatAvailable(s.status)).length,
  };
}
