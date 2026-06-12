'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { OrderLeaveConfirmModal } from '@/components/OrderLeaveConfirmModal';
import { useOrderEditGuard } from '@/contexts/OrderEditGuardContext';
import {
  cloneOrderCartLines,
  orderCartLinesEqual,
  syncOrderCartLines,
  type OrderCartLine,
} from '@/lib/order-cart';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type LeaveResolver = (decision: 'keep' | 'discard' | 'cancel') => void;

export function useOrderAutoSave(options: {
  orderId: number | null;
  lines: OrderCartLine[];
  enabled?: boolean;
  debounceMs?: number;
  onRevert?: (lines: OrderCartLine[]) => void;
}) {
  const { orderId, lines, enabled = true, debounceMs = 600, onRevert } = options;
  const { registerGuard } = useOrderEditGuard();

  const [baselineLines, setBaselineLines] = useState<OrderCartLine[]>([]);
  const [baselineReady, setBaselineReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const leaveResolverRef = useRef<LeaveResolver | null>(null);
  const linesRef = useRef(lines);
  const saveInFlightRef = useRef(false);

  linesRef.current = lines;

  const hasSessionChanges =
    baselineReady && orderId !== null && !orderCartLinesEqual(lines, baselineLines);

  const setBaseline = useCallback((next: OrderCartLine[]) => {
    setBaselineLines(cloneOrderCartLines(next));
    setBaselineReady(true);
    setSaveStatus('saved');
    setSaveError('');
  }, []);

  const resetBaseline = useCallback(() => {
    setBaselineLines([]);
    setBaselineReady(false);
    setSaveStatus('idle');
    setSaveError('');
  }, []);

  const saveNow = useCallback(
    async (targetLines?: OrderCartLine[]): Promise<boolean> => {
      if (!orderId || !enabled) return true;
      const payload = targetLines ?? linesRef.current;
      if (saveInFlightRef.current) return true;
      saveInFlightRef.current = true;
      setSaveStatus('saving');
      setSaveError('');
      const result = await syncOrderCartLines(orderId, payload);
      saveInFlightRef.current = false;
      if (!result.ok) {
        setSaveStatus('error');
        setSaveError(result.message);
        return false;
      }
      setSaveStatus('saved');
      return true;
    },
    [orderId, enabled]
  );

  const revertToBaseline = useCallback(async (): Promise<boolean> => {
    if (!orderId || !baselineReady) return true;
    const restored = cloneOrderCartLines(baselineLines);
    const ok = await saveNow(restored);
    if (!ok) return false;
    onRevert?.(restored);
    return true;
  }, [orderId, baselineReady, baselineLines, saveNow, onRevert]);

  const promptLeave = useCallback((): Promise<'keep' | 'discard' | 'cancel'> => {
    if (!hasSessionChanges) return Promise.resolve('keep');
    return new Promise((resolve) => {
      leaveResolverRef.current = resolve;
      setLeaveOpen(true);
    });
  }, [hasSessionChanges]);

  const confirmBeforeLeave = useCallback(async (): Promise<boolean> => {
    const decision = await promptLeave();
    if (decision === 'cancel') return false;
    if (decision === 'discard') {
      return revertToBaseline();
    }
    const ok = await saveNow();
    if (ok) {
      setBaseline(linesRef.current);
    }
    return ok;
  }, [promptLeave, revertToBaseline, saveNow, setBaseline]);

  const resolveLeave = useCallback((decision: 'keep' | 'discard' | 'cancel') => {
    setLeaveOpen(false);
    leaveResolverRef.current?.(decision);
    leaveResolverRef.current = null;
  }, []);

  useEffect(() => {
    if (!orderId || !enabled || !baselineReady) return;
    const timer = setTimeout(() => {
      void saveNow();
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [orderId, enabled, baselineReady, lines, debounceMs, saveNow]);

  useEffect(() => {
    if (!hasSessionChanges) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasSessionChanges]);

  useEffect(() => {
    const unregister = registerGuard(confirmBeforeLeave);
    return unregister;
  }, [registerGuard, confirmBeforeLeave]);

  const leaveModal = (
    <OrderLeaveConfirmModal
      open={leaveOpen}
      orderId={orderId}
      onKeep={() => resolveLeave('keep')}
      onDiscard={() => resolveLeave('discard')}
      onCancel={() => resolveLeave('cancel')}
    />
  );

  return {
    setBaseline,
    resetBaseline,
    hasSessionChanges,
    saveStatus,
    saveError,
    saveNow,
    revertToBaseline,
    confirmBeforeLeave,
    leaveModal,
  };
}
