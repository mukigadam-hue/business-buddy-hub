import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PremiumGateProps {
  allowed: boolean;
  featureName: string;
  children: ReactNode;
  /** If true, renders nothing instead of a lock message */
  hideCompletely?: boolean;
}

/**
 * Wraps a feature that requires premium. If not allowed, shows a lock overlay or hides content.
 */
export default function PremiumGate({ allowed, featureName, children, hideCompletely }: PremiumGateProps) {
  if (allowed) return <>{children}</>;
  if (hideCompletely) return null;

  return (
    <div className="relative">
      <div className="opacity-40 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg z-10">
        <Lock className="h-5 w-5 text-amber-500 mb-1" />
        <p className="text-xs font-medium text-foreground">Premium Feature</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{featureName}</p>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 text-xs border-amber-500/50 text-amber-600"
          onClick={() => toast.info('Premium plan coming soon! $52/year for unlimited features.')}
        >
          Upgrade
        </Button>
      </div>
    </div>
  );
}
