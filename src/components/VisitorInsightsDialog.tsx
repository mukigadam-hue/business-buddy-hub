import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Eye, Loader2, ImagePlus, TrendingUp, Globe2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/context/BusinessContext';
import { getCountryByCode, getCountryFlag } from '@/lib/countries';
import { timeAgo } from '@/lib/relativeTime';

interface VisitorRow {
  country_code: string;
  visit_count: number;
  last_visited_at: string;
  first_visited_at: string;
}

/**
 * VisitorInsightsDialog — shows business owners WHO is looking at their shop
 * without revealing any identity: country flag, when they last looked, and how
 * many times they came back. Doubles as a growth nudge: when the shop has few
 * item photos or no fresh records, it points the owner to the next best action.
 */
export default function VisitorInsightsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentBusiness, stock, sales, services } = useBusiness();
  const [rows, setRows] = useState<VisitorRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const { data } = await (supabase.rpc as any)('get_business_visitors', {
        _business_id: currentBusiness.id,
        _limit: 100,
      });
      setRows((data as VisitorRow[]) || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const totalViews = rows.reduce((s, r) => s + (r.visit_count || 0), 0);
  const itemsWithImages = (stock || []).filter((s: any) => s.image_url_1).length;
  const needsImages = (stock || []).length === 0 || itemsWithImages < Math.min(3, (stock || []).length);

  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = (list: any[] | undefined) =>
    (list || []).some((r) => r.created_at && new Date(r.created_at).getTime() >= since);
  const needsRecords = !recent(sales as any) && !recent(services as any);

  const go = (path: string) => { onOpenChange(false); navigate(path); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[94vw] sm:max-w-md rounded-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <Eye className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-base sm:text-lg">
            {t('visitors.title')}
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            {t('visitors.subtitle')}
          </DialogDescription>
        </DialogHeader>

        {rows.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold text-primary">{rows.length}</p>
              <p className="text-[11px] text-muted-foreground">{t('visitors.visitorsLabel')}</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-center">
              <p className="text-xl font-bold text-primary">{totalViews}</p>
              <p className="text-[11px] text-muted-foreground">{t('visitors.viewsLabel')}</p>
            </div>
          </div>
        )}

        <div className="space-y-2 mt-1">
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('visitors.empty')}</p>
          ) : (
            rows.map((r, i) => {
              const country = getCountryByCode(r.country_code);
              return (
                <div
                  key={`${r.country_code}-${r.last_visited_at}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 min-h-[44px]"
                >
                  <span className="text-2xl leading-none">
                    {r.country_code ? getCountryFlag(r.country_code) : '🌐'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate flex items-center gap-1">
                      {country?.name || t('visitors.unknownCountry')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('visitors.lastViewed')} {timeAgo(r.last_visited_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 text-primary text-[11px] font-semibold px-2 py-1">
                    {t('visitors.timesViewed', { count: r.visit_count || 1 })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {needsImages && (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-primary" />
              {t('visitors.addImagesTitle')}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('visitors.addImagesBody')}</p>
            <Button className="w-full min-h-[44px]" onClick={() => go('/stock')}>
              {t('visitors.addImagesCta')}
            </Button>
          </div>
        )}

        {needsRecords && (
          <div className="rounded-lg border border-dashed border-warning/50 bg-warning/5 p-3 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-warning" />
              {t('visitors.recordsTitle')}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{t('visitors.recordsBody')}</p>
            <Button variant="outline" className="w-full min-h-[44px]" onClick={() => go('/sales')}>
              {t('visitors.recordsCta')}
            </Button>
          </div>
        )}

        <Button variant="ghost" className="w-full min-h-[44px]" onClick={() => go('/discover')}>
          <Globe2 className="h-4 w-4 mr-2" />
          {t('visitors.exploreCta')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
