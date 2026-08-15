import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Rocket, Store, PackagePlus, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBusiness } from '@/context/BusinessContext';

type Stage = 'auth' | 'personal' | 'noStock' | 'noRecords';

const ICONS: Record<Stage, typeof Rocket> = {
  auth: Rocket,
  personal: Store,
  noStock: PackagePlus,
  noRecords: ClipboardList,
};

function seenKey(stage: Stage, scope: string) {
  return `bm:growth-nudge:${stage}:${scope}`;
}

function alreadySeenToday(stage: Stage, scope: string) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    return localStorage.getItem(seenKey(stage, scope)) === today;
  } catch {
    return false;
  }
}

function markSeenToday(stage: Stage, scope: string) {
  try {
    localStorage.setItem(seenKey(stage, scope), new Date().toISOString().slice(0, 10));
  } catch {}
}

/** Shared dialog used by every stage. */
function NudgeDialog({
  stage,
  scope,
  onAction,
}: {
  stage: Stage;
  scope: string;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const Icon = ICONS[stage];

  useEffect(() => {
    if (alreadySeenToday(stage, scope)) return;
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, [stage, scope]);

  const close = () => {
    markSeenToday(stage, scope);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-[92vw] sm:max-w-md rounded-xl">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-base sm:text-lg">
            {t(`growth.${stage}.title`)}
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {t(`growth.${stage}.body`)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full min-h-[44px]"
            onClick={() => {
              close();
              onAction?.();
            }}
          >
            {t(`growth.${stage}.cta`)}
          </Button>
          <Button variant="ghost" className="w-full min-h-[44px]" onClick={close}>
            {t('growth.later')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Auth screen nudge — no business context available here. */
export function AuthGrowthNudge() {
  return <NudgeDialog stage="auth" scope="guest" />;
}

/** In-app nudge: picks the message that matches how far the user has come. */
export default function GrowthNudge() {
  const { currentBusiness, stock, sales, services, loading } = useBusiness();
  const navigate = useNavigate();

  const stage = useMemo<Stage | null>(() => {
    if (loading || !currentBusiness) return null;
    if (currentBusiness.business_type === 'personal') return 'personal';
    if (currentBusiness.business_type === 'property') return null;
    if ((stock?.length || 0) === 0) return 'noStock';

    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = (rows: { created_at?: string }[] | undefined) =>
      (rows || []).some((r) => r.created_at && new Date(r.created_at).getTime() >= since);
    if (!recent(sales as any) && !recent(services as any)) return 'noRecords';
    return null;
  }, [loading, currentBusiness, stock, sales, services]);

  if (!stage || !currentBusiness) return null;

  const target =
    stage === 'personal' ? '/register-business' : stage === 'noStock' ? '/stock' : '/sales';

  return (
    <NudgeDialog
      key={`${stage}-${currentBusiness.id}`}
      stage={stage}
      scope={currentBusiness.id}
      onAction={() => navigate(target)}
    />
  );
}
