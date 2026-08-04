import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/context/BusinessContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { localDayKey, enumerateDays, fetchPeriodTotals } from '@/lib/auditData';
import { isReminderEnabled, setReminderEnabled, onReminderPrefChange } from '@/lib/auditReminderPref';


const SNOOZE_MS = 6 * 60 * 60 * 1000; // re-appear every 6 hours
const MAX_LOOKBACK_DAYS = 30;
const MAX_LIST_DAYS = 7; // never ask for more than a week at a time
const MANY_DAYS = 5; // from this many missing days we offer the fresh-start option
const AUDIT_LINK = '/settings?section=audit#audit';


function snoozeKey(businessId: string) {
  return `bm:audit-reminder-snooze:${businessId}`;
}
function baselineKey(businessId: string) {
  return `bm:audit-baseline:${businessId}`;
}
function nudgeKey(businessId: string) {
  return `bm:audit-period-nudge:${businessId}`;
}

/** ISO-week token like 2026-W31, used to show the weekly nudge only once per week. */
function weekToken(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Reminds owners/admins to record the cash found in the drawer for every past
 * day that has not been recorded yet. They can always skip — the reminder just
 * comes back after six hours, and lists every day still missing.
 * It also nudges them to run a full audit at the end of each week and month.
 */
export default function AuditReminder() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentBusiness, userRole } = useBusiness();
  const businessId = currentBusiness?.id;

  const [missing, setMissing] = useState<string[]>([]);
  const [totalMissing, setTotalMissing] = useState(0);

  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [nudge, setNudge] = useState<'week' | 'month' | null>(null);
  const [nudgeCash, setNudgeCash] = useState('');
  const [nudgeSaving, setNudgeSaving] = useState(false);
  const [remindOn, setRemindOn] = useState(() => isReminderEnabled(businessId));

  useEffect(() => { setRemindOn(isReminderEnabled(businessId)); }, [businessId]);
  useEffect(() => onReminderPrefChange(() => setRemindOn(isReminderEnabled(businessId))), [businessId]);

  /** Owner turns the daily popup off — accountability in Settings keeps working. */
  function disableReminder() {
    if (!businessId) return;
    setReminderEnabled(businessId, false);
    setRemindOn(false);
    setOpen(false);
    setNudge(null);
    toast.info(t('audit.reminderOffNotice', 'Daily reminder turned off. Recording your money every day is still important — you can switch the reminder back on any time in Settings → Business Audit & Accountability.'), { duration: 8000 });
  }

  // Only real trading businesses (not personal accounts and not FlexRent
  // property rentals, which rarely take cash every day) that are at least one
  // full day old, and only for the owner / admin. Rental owners can still use
  // the optional accountability panel in Settings whenever they want.
  const createdAt = (currentBusiness as any)?.created_at;
  const businessIsOldEnough = !!createdAt
    && localDayKey(new Date(createdAt)) < localDayKey(new Date());

  const businessType = (currentBusiness as any)?.business_type;

  const eligible = !!businessId
    && businessType !== 'personal'
    && businessType !== 'property'
    && businessIsOldEnough
    && remindOn
    && (userRole === 'owner' || userRole === 'admin');


  // ---- weekly / monthly accountability nudge (independent of the 6h snooze) ----
  useEffect(() => {
    if (!eligible || !businessId) {
      setOpen(false);
      setMissing([]);
      setTotalMissing(0);
      return;
    }
    const now = new Date();
    const isMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
    const isWeekEnd = now.getDay() === 0; // Sunday closes the week
    if (!isMonthEnd && !isWeekEnd) return;
    const kind: 'week' | 'month' = isMonthEnd ? 'month' : 'week';
    const token = `${kind}:${kind === 'month' ? localDayKey(now).slice(0, 7) : weekToken(now)}`;
    try {
      if (localStorage.getItem(nudgeKey(businessId)) === token) return;
    } catch { /* ignore */ }
    setNudge(kind);
  }, [eligible, businessId]);

  function dismissNudge() {
    if (businessId) {
      const now = new Date();
      const token = nudge === 'month'
        ? `month:${localDayKey(now).slice(0, 7)}`
        : `week:${weekToken(now)}`;
      try { localStorage.setItem(nudgeKey(businessId), token); } catch { /* ignore */ }
    }
    setNudge(null);
  }

  useEffect(() => {
    if (!eligible || !businessId) return;

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
      let start = created > earliest ? created : earliest;
      // a fresh start chosen by the owner ignores everything before that date
      try {
        const baseline = localStorage.getItem(baselineKey(businessId));
        if (baseline && baseline > start) start = baseline;
      } catch { /* ignore */ }
      const end = localDayKey(new Date(Date.now() - 86400000)); // yesterday
      if (end < start) return;

      // Load the complete cloud history in one request. Never treat a failed cloud
      // request as an empty history: doing so would incorrectly ask for old days
      // after a reinstall or during a temporary connection problem.
      const { data: rows, error } = await supabase.from('audit_daily_cash')
        .select('audit_date')
        .eq('business_id', businessId)
        .lte('audit_date', end)
        .order('audit_date', { ascending: true });
      if (error) return;

      const firstSaved = (rows || [])[0]?.audit_date as string | undefined;
      if (firstSaved && firstSaved > start) {
        start = firstSaved;
        try { localStorage.setItem(baselineKey(businessId), firstSaved); } catch { /* ignore */ }
      }

      const done = new Set((rows || []).map((r: any) => r.audit_date));

      const gaps = enumerateDays(start, end).filter(d => !done.has(d)).sort().reverse();
      if (cancelled) return;
      if (gaps.length) {
        // Never confront the owner with a month-long list: ask for at most a week
        // (the most recent days) and point the rest to the audit in Settings.
        const shown = gaps.slice(0, MAX_LIST_DAYS);
        setTotalMissing(gaps.length);
        setMissing(shown);
        setValues(Object.fromEntries(shown.map(d => [d, ''])));
        setOpen(true);
      } else {
        setMissing([]);
        setTotalMissing(0);
        setOpen(false);
      }

    })();
    return () => { cancelled = true; };
  }, [eligible, businessId, currentBusiness]);

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

  /** Owner cannot remember the old days — start clean from yesterday. */
  function startFresh() {
    if (!businessId) return;
    const yesterday = localDayKey(new Date(Date.now() - 86400000));
    try { localStorage.setItem(baselineKey(businessId), yesterday); } catch { /* ignore */ }
    setMissing([yesterday]);
    setTotalMissing(1);
    setValues({ [yesterday]: '' });

    setShowForm(true);
    toast.success(t('audit.freshStartDone', 'Fresh start set. Only yesterday onwards will be tracked from now on.'));
  }



  /** Writes counted cash for the given days straight into the audit tables. */
  async function persistDays(entries: { date: string; counted: number }[]) {
    if (!businessId || !entries.length) return false;
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
    if (error) { toast.error(error.message); return false; }
    return true;
  }

  /** Saves yesterday's cash straight from the weekly / monthly nudge. */
  async function saveNudgeCash() {
    const raw = nudgeCash.trim();
    if (raw === '' || isNaN(Number(raw))) {
      toast.error(t('audit.enterAtLeastOne', 'Enter the cash for at least one day'));
      return;
    }
    setNudgeSaving(true);
    try {
      const yesterday = localDayKey(new Date(Date.now() - 86400000));
      const ok = await persistDays([{ date: yesterday, counted: Number(raw) }]);
      if (!ok) return;
      toast.success(t('audit.daysRecorded', 'Daily cash recorded. Thank you for keeping your books accurate!'));
      setMissing(m => m.filter(d => d !== yesterday));
      setNudgeCash('');
      dismissNudge();
    } catch (e: any) {
      toast.error(e?.message || t('audit.sheetFailed', 'Could not save'));
    } finally {
      setNudgeSaving(false);
    }
  }

  async function saveAll() {
    if (!businessId) return;
    const entries = Object.entries(values)
      .filter(([, v]) => v.trim() !== '' && !isNaN(Number(v)))
      .map(([date, v]) => ({ date, counted: Number(v) }));
    if (!entries.length) { toast.error(t('audit.enterAtLeastOne', 'Enter the cash for at least one day')); return; }

    setSaving(true);
    try {
      const ok = await persistDays(entries);
      if (!ok) return;

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


  const switchRow = (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
      <span className="text-[11px] leading-tight">
        {t('audit.reminderShowDaily', "Show this daily reminder (turn off if you don't want it again)")}
      </span>
      <Switch checked={remindOn} onCheckedChange={v => { if (!v) disableReminder(); }} />
    </div>
  );

  const nudgeDialog = nudge ? (
    <AlertDialog open onOpenChange={o => { if (!o) dismissNudge(); }}>
      <AlertDialogContent className="max-w-md">
        {switchRow}
        <AlertDialogHeader>

          <AlertDialogTitle>
            📊 {nudge === 'month'
              ? t('audit.nudgeMonthTitle', 'A full month of records saved')
              : t('audit.nudgeWeekTitle', 'A full week of records saved')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nudge === 'month'
              ? t('audit.nudgeMonthBody', 'It has been a month of saving your daily business records. For total accountability, please open Settings → Business Audit and make an accountability for your business, so your records stay organized and your profits keep growing.')
              : t('audit.nudgeWeekBody', 'It has been a week of saving your daily business records. For total accountability, please open Settings → Business Audit and make an accountability for your business, so your records stay organized and your profits keep growing.')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border p-3 space-y-2">
          <p className="text-xs font-medium">
            {t('audit.nudgeRecordYesterday', "Record yesterday's cash right here")}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs w-28 shrink-0">{localDayKey(new Date(Date.now() - 86400000))}</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              placeholder="0"
              className="h-11"
              value={nudgeCash}
              onChange={e => setNudgeCash(e.target.value)}
            />
          </div>
          <Button className="w-full h-11" onClick={saveNudgeCash} disabled={nudgeSaving}>
            {nudgeSaving ? t('audit.saving', 'Saving…') : t('audit.saveAndContinue', 'Save and continue')}
          </Button>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={dismissNudge} className="mt-0">
            {t('audit.later', 'Later')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => { dismissNudge(); navigate(AUDIT_LINK); }}>
            {t('audit.goToAudit', 'Go to audit')}
          </AlertDialogAction>
        </AlertDialogFooter>

      </AlertDialogContent>
    </AlertDialog>
  ) : null;

  if (!open || !missing.length) return nudgeDialog;

  return (
    <>
    {nudgeDialog}
    <AlertDialog open onOpenChange={o => { if (!o) snooze(); }}>

      <AlertDialogContent className="left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+8px)] bottom-[calc(72px+env(safe-area-inset-bottom,0px))] mx-auto grid w-auto max-w-md translate-x-0 translate-y-0 grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden p-4 sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-h-[calc(100dvh-2rem)]">
        <div className="min-h-0 overflow-y-auto space-y-3 pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {switchRow}
          <AlertDialogHeader>
            <AlertDialogTitle>
              💰 {t('audit.reminderTitle', 'Record your daily cash')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left">
                <p>
                  {t('audit.reminderBody', 'You still have {{count}} day(s) without the total cash collected recorded.', { count: totalMissing || missing.length })}
                </p>

                {totalMissing > missing.length && (
                  <p className="text-xs">
                    {t('audit.reminderCapped', 'To keep it simple, only the last {{count}} day(s) are listed here. Older days can be filled in from the accountability page in Settings.', { count: missing.length })}
                  </p>
                )}
                <p>
                  {t('audit.reminderEncourage', 'Recording your money every day keeps your accountability clean, shows exactly where losses come from, and helps you grow your profits. It only takes a few seconds — even a day with no business is worth recording as 0.')}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {showForm && (
          <div className="space-y-2">
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

        {missing.length >= MANY_DAYS && (
          <div className="rounded-md border border-dashed p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              {t('audit.freshStartHint', "Too many old days to remember? Start clean from yesterday — older days will be left out so your new accountability (and any new workers) start on a clear record.")}
            </p>
            <Button variant="outline" className="w-full h-11" onClick={startFresh}>
              {t('audit.freshStart', 'Start with yesterday and continue from there')}
            </Button>
          </div>
        )}

        {(totalMissing >= MANY_DAYS || missing.length >= MANY_DAYS) && (
          <div className="rounded-md border border-dashed p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              {t('audit.paperRecordsHint', 'Have you been writing the daily money in a book or on paper? Open the accountability page and enter all those days there at once.')}
            </p>
            <Button
              variant="secondary"
              className="w-full h-11"
              onClick={() => { snooze(); navigate(AUDIT_LINK); }}
            >
              {t('audit.openAccountability', 'Open accountability in Settings')}
            </Button>
          </div>
        )}
        </div>

        <AlertDialogFooter className="shrink-0 gap-2 border-t bg-background pt-3">
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
    </>
  );
}

