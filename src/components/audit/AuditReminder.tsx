import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/context/BusinessContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { localDayKey, enumerateDays, fetchPeriodTotals } from '@/lib/auditData';

const SNOOZE_MS = 6 * 60 * 60 * 1000; // re-appear every 6 hours
const MAX_LOOKBACK_DAYS = 30;

function snoozeKey(businessId: string) {
  return `bm:audit-reminder-snooze:${businessId}`;
}

/**
 * Reminds owners/admins to record the cash found in the drawer for every past
 * day that has not been recorded yet. They can always skip — the reminder just
 * comes back after six hours, and lists every day still missing.
 */
export default function AuditReminder() {
  const { t } = useTranslation();
  const { currentBusiness, userRole } = useBusiness();
  const businessId = currentBusiness?.id;

  const [missing, setMissing] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const type = (currentBusiness as any)?.business_type;
    if (!businessId || type === 'personal') return;
    if (userRole !== 'owner' && userRole !== 'admin') return;

    try {
      const until = Number(localStorage.getItem(snoozeKey(businessId)) || 0);
      if (until && Date.now() < until) return;
    } catch { /* ignore */ }

    let cancelled = false;
    (async () => {
      const today = localDayKey(new Date());
      const created = (currentBusiness as any)?.created_at
        ? localDayKey(new Date((currentBusiness as any).created_at))
        : today;
      const earliest = localDayKey(new Date(Date.now() - MAX_LOOKBACK_DAYS * 86400000));
      const start = created > earliest ? created : earliest;
      const end = localDayKey(new Date(Date.now() - 86400000)); // yesterday
      if (end < start) return;

      const { data: rows } = await supabase.from('audit_daily_cash')
        .select('audit_date').eq('business_id', businessId).gte('audit_date', start).lte('audit_date', end);
      const done = new Set((rows || []).map((r: any) => r.audit_date));
      const gaps = enumerateDays(start, end).filter(d => !done.has(d)).sort().reverse();
      if (!cancelled && gaps.length) {
        setMissing(gaps);
        setValues(Object.fromEntries(gaps.map(d => [d, ''])));
        setOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, currentBusiness, userRole]);

  const filledCount = useMemo(
    () => Object.values(values).filter(v => v.trim() !== '' && !isNaN(Number(v))).length,
    [values],
  );

  function snooze() {
    if (businessId) {
      try { localStorage.setItem(snoozeKey(businessId), String(Date.now() + SNOOZE_MS)); } catch { /* ignore */ }
    }
    setOpen(false);
    setShowForm(false);
  }

  async function saveAll() {
    if (!businessId) return;
    const entries = Object.entries(values)
      .filter(([, v]) => v.trim() !== '' && !isNaN(Number(v)))
      .map(([date, v]) => ({ date, counted: Number(v) }));
    if (!entries.length) { toast.error(t('audit.enterAtLeastOne', 'Enter the cash for at least one day')); return; }

    setSaving(true);
    try {
      const dates = entries.map(e => e.date).sort();
      const totals = await fetchPeriodTotals(businessId, dates[0], dates[dates.length - 1]);
      const expectedBy = new Map(totals.days.map(d => [d.date, d.expected]));

      const { data: sessions } = await supabase.from('audit_sessions')
        .select('id').eq('business_id', businessId).eq('status', 'open').limit(1);
      const sessionId = (sessions || [])[0]?.id ?? null;

      const { error } = await supabase.from('audit_daily_cash').upsert(
        entries.map(e => {
          const expected = expectedBy.get(e.date) ?? 0;
          return {
            business_id: businessId,
            session_id: sessionId,
            audit_date: e.date,
            expected_cash: expected,
            counted_cash: e.counted,
            variance: e.counted - expected,
            note: '',
          } as any;
        }),
        { onConflict: 'business_id,audit_date' },
      );
      if (error) { toast.error(error.message); return; }

      const saved = new Set(entries.map(e => e.date));
      const left = missing.filter(d => !saved.has(d));
      toast.success(t('audit.daysRecorded', 'Daily cash recorded. Thank you for keeping your books accurate!'));
      setMissing(left);
      if (!left.length) { setOpen(false); setShowForm(false); }
      else setValues(Object.fromEntries(left.map(d => [d, ''])));
    } catch (e: any) {
      toast.error(e?.message || t('audit.sheetFailed', 'Could not save'));
    } finally {
      setSaving(false);
    }
  }

  if (!open || !missing.length) return null;

  return (
    <AlertDialog open onOpenChange={o => { if (!o) snooze(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            💰 {t('audit.reminderTitle', 'Record your daily cash')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-left">
              <p>
                {t('audit.reminderBody', 'You still have {{count}} day(s) without the cash you found in the drawer recorded.', { count: missing.length })}
              </p>
              <p>
                {t('audit.reminderEncourage', 'Recording your money every day keeps your accountability clean, shows exactly where losses come from, and helps you grow your profits. It only takes a few seconds — even a day with no business is worth recording as 0.')}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {showForm && (
          <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {missing.map(d => (
              <div key={d} className="flex items-center gap-2">
                <span className="text-xs font-medium w-28 shrink-0">{d}</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="0"
                  className="h-11"
                  value={values[d] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [d]: e.target.value }))}
                />
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              {t('audit.reminderHint', 'Enter the total money you found in the drawer for each day. Use 0 for days you did not work.')}
            </p>
          </div>
        )}

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={snooze} className="mt-0">
            {t('audit.skipForNow', 'Skip for now')}
          </AlertDialogCancel>
          {showForm ? (
            <Button onClick={saveAll} disabled={saving || !filledCount}>
              {saving ? t('audit.saving', 'Saving…') : t('audit.saveDays', 'Save {{count}} day(s)', { count: filledCount })}
            </Button>
          ) : (
            <AlertDialogAction onClick={e => { e.preventDefault(); setShowForm(true); }}>
              {t('audit.fillNow', 'OK, fill them in')}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
