import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNetworkStatus } from './useNetworkStatus';

interface QueuedOperation {
  id: string;
  table: string;
  type: 'insert' | 'update' | 'delete';
  data: any;
  filter?: { column: string; value: string };
  timestamp: number;
}

const QUEUE_KEY = 'biztrack_offline_queue';

function getQueue(): QueuedOperation[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
}

function saveQueue(queue: QueuedOperation[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueOfflineOperation(op: Omit<QueuedOperation, 'id' | 'timestamp'>) {
  const queue = getQueue();
  queue.push({ ...op, id: crypto.randomUUID(), timestamp: Date.now() });
  saveQueue(queue);
}

export function useOfflineQueue() {
  const isOnline = useNetworkStatus();
  const syncingRef = useRef(false);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    const failed: QueuedOperation[] = [];
    let synced = 0;

    for (const op of queue) {
      try {
        if (op.type === 'insert') {
          const { error } = await supabase.from(op.table as any).insert(op.data);
          if (error) throw error;
        } else if (op.type === 'update' && op.filter) {
          const { error } = await supabase.from(op.table as any).update(op.data).eq(op.filter.column, op.filter.value);
          if (error) throw error;
        } else if (op.type === 'delete' && op.filter) {
          const { error } = await supabase.from(op.table as any).delete().eq(op.filter.column, op.filter.value);
          if (error) throw error;
        }
        synced++;
      } catch (err) {
        console.error('Offline sync failed for op:', op, err);
        failed.push(op);
      }
    }

    saveQueue(failed);
    syncingRef.current = false;

    if (synced > 0) {
      toast.success(`✅ ${synced} offline record(s) synced successfully!`);
    }
    if (failed.length > 0) {
      toast.error(`${failed.length} record(s) failed to sync. Will retry.`);
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline, syncQueue]);

  // Also try periodic sync every 30s when online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(syncQueue, 30000);
    return () => clearInterval(interval);
  }, [isOnline, syncQueue]);

  return { isOnline, syncQueue, pendingCount: getQueue().length };
}
