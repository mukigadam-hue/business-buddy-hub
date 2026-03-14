import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff } from 'lucide-react';

export default function NetworkStatusBanner() {
  const isOnline = useNetworkStatus();

  return (
    <div className={`flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors ${
      isOnline 
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
        : 'bg-destructive/10 text-destructive'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline — data will sync when reconnected</span>
        </>
      )}
    </div>
  );
}
