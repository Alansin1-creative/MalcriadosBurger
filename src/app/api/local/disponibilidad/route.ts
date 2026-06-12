import { NextResponse } from 'next/server';
import { ensureInitialized } from '@/lib/init';
import { listRestaurantSeating, seatingSummary } from '@/lib/services/seating';
import { getRestaurantStatus } from '@/lib/services/restaurant-settings';

export async function GET() {
  ensureInitialized();
  const { isOpen } = getRestaurantStatus();
  const seats = listRestaurantSeating();
  const summary = seatingSummary(seats, isOpen);
  return NextResponse.json({
    ...summary,
    updatedAt: new Date().toISOString(),
  });
}
