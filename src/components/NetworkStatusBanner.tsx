import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { Wifi, WifiOff, CloudOff, CheckCircle2, Loader2 } from 'lucide-react';

export default function NetworkStatusBanner() {
  const { isOnline, pendingCount, syncQueue } = useOfflineQueue();

  return (
    <div className={`flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors ${
      isOnline 
        ? pendingCount > 0
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        : 'bg-destructive/10 text-destructive'
    }`}>
      {isOnline ? (
        pendingCount > 0 ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Syncing {pendingCount} pending record(s)…</span>
            <button onClick={syncQueue} className="underline ml-1 font-semibold">Sync now</button>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3 w-3" />
            <span>All data synced</span>
          </>
        )
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline — {pendingCount > 0 ? `${pendingCount} pending` : 'data will sync when reconnected'}</span>
        </>
      )}
    </div>
  );
}
