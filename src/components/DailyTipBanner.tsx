import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Tip {
  id: string;
  title: string;
  content: string;
  category: string;
}

export default function DailyTipBanner() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed today
    const dismissedDate = localStorage.getItem('tip_dismissed_date');
    if (dismissedDate === new Date().toDateString()) {
      setDismissed(true);
      return;
    }

    async function fetchTip() {
      try {
        const { data, error } = await supabase.functions.invoke('daily-tip');
        if (!error && data?.tip) {
          setTip(data.tip);
        }
      } catch {
        // silently fail
      }
    }
    fetchTip();
  }, []);

  if (dismissed || !tip) return null;

  function dismiss() {
    localStorage.setItem('tip_dismissed_date', new Date().toDateString());
    setDismissed(true);
  }

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary">💡 Please read — this is a useful idea for your business!</p>
              <p className="text-sm font-semibold mt-1">{tip.title}</p>
              {!expanded ? (
                <button onClick={() => setExpanded(true)} className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-1">
                  Read more <ChevronDown className="h-3 w-3" />
                </button>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mt-1">{tip.content}</p>
                  <p className="text-[10px] text-primary/70 mt-2 italic">📱 Do you know this app manages your business well? Keep using it!</p>
                  <button onClick={() => setExpanded(false)} className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-1">
                    Show less <ChevronUp className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={dismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
