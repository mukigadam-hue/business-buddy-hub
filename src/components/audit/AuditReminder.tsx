import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/context/BusinessContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { localDayKey } from '@/lib/auditData';

/**
 * Reminds owners/admins to record yesterday's drawer cash before they carry on.
 * Workers are never interrupted — they keep recording normally.
 */
export default function AuditReminder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentBusiness, userRole } = useBusiness();
  const [openDate, setOpenDate] = useState<string | null>(null);

  useEffect(() => {
    const businessId = currentBusiness?.id;
    const type = (currentBusiness as any)?.business_type;
    if (!businessId || type === 'personal') return;
    if (userRole !== 'owner' && userRole !== 'admin') return;

    const yesterday = localDayKey(new Date(Date.now() - 86400000));
    const dismissKey = `bm:audit-reminder:${businessId}:${yesterday}`;
    try { if (localStorage.getItem(dismissKey)) return; } catch { /* ignore */ }

    let cancelled = false;
    (async () => {
      const { data: sessions } = await supabase.from('audit_sessions')
        .select('id, start_date').eq('business_id', businessId).eq('status', 'open').limit(1);
      const session = (sessions || [])[0] as any;
      if (!session || session.start_date > yesterday) return;
      const { data: rows } = await supabase.from('audit_daily_cash')
        .select('id').eq('business_id', businessId).eq('audit_date', yesterday).limit(1);
      if (!cancelled && !(rows || []).length) setOpenDate(yesterday);
    })();
    return () => { cancelled = true; };
  }, [currentBusiness, userRole]);

  function dismiss() {
    const businessId = currentBusiness?.id;
    if (businessId && openDate) {
      try { localStorage.setItem(`bm:audit-reminder:${businessId}:${openDate}`, '1'); } catch { /* ignore */ }
    }
    setOpenDate(null);
  }

  if (!openDate) return null;

  return (
    <AlertDialog open onOpenChange={o => { if (!o) dismiss(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>🧾 {t('audit.reminderTitle', 'Record yesterday\'s cash')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('audit.reminderBody', 'You have not recorded the cash found in the drawer for')} {openDate}.{' '}
            {t('audit.reminderBody2', 'Record it now so your audit stays accurate.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={dismiss}>{t('audit.later', 'Later')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => { dismiss(); navigate('/settings'); }}>
            {t('audit.recordNow', 'Record now')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
