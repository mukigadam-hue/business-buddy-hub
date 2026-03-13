import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Megaphone, X } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  announcement_type: string;
  created_at: string;
}

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('dismissed_announcements');
    if (stored) setDismissedIds(JSON.parse(stored));

    async function load() {
      const { data } = await supabase
        .from('app_announcements' as any)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setAnnouncements(data as any[]);
    }
    load();
  }, []);

  const visible = announcements.filter(a => !dismissedIds.includes(a.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('dismissed_announcements', JSON.stringify(updated));
  }

  const typeStyles: Record<string, string> = {
    info: 'border-primary/30 bg-primary/5',
    update: 'border-success/30 bg-success/5',
    warning: 'border-warning/30 bg-warning/5',
    critical: 'border-destructive/30 bg-destructive/5',
  };

  const typeIcons: Record<string, string> = {
    info: '📢',
    update: '🆕',
    warning: '⚠️',
    critical: '🚨',
  };

  return (
    <div className="space-y-2">
      {visible.map(a => (
        <Card key={a.id} className={typeStyles[a.announcement_type] || typeStyles.info}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Megaphone className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{typeIcons[a.announcement_type] || '📢'} {a.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => dismiss(a.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
