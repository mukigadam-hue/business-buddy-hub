import { useEffect, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DEMO_EMAIL = 'reviewer@biztrack.demo';
const DISMISS_KEY = 'bm:demo-banner-dismissed-until';

/**
 * Shown to users signed in via the demo/reviewer account. Prompts them to
 * register a real phone + email so their data isn't lost. Dismissible for
 * 6 hours to avoid nagging during a session, but returns on next visit.
 */
export default function DemoAccountBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDemo =
      user?.email?.toLowerCase() === DEMO_EMAIL ||
      (user?.user_metadata as any)?.is_demo === true;
    if (!isDemo) { setVisible(false); return; }
    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) || '0');
      if (until && Date.now() < until) { setVisible(false); return; }
    } catch {}
    setVisible(true);
  }, [user]);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 6 * 60 * 60 * 1000)); } catch {}
    setVisible(false);
  };

  return (
    <div className="mx-3 sm:mx-4 mt-2 rounded-lg border-2 border-amber-400/70 bg-amber-50 dark:bg-amber-500/10 p-3 flex items-start gap-2 shadow-sm">
      <UserPlus className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-tight">
          You're using a demo account
        </p>
        <p className="text-xs text-amber-800/90 dark:text-amber-100/80 mt-0.5">
          Register your phone number &amp; email so your business data is saved and can
          be recovered if you switch devices.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => navigate('/settings')}
          >
            Register my details
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={dismiss}>
            Remind me later
          </Button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="h-7 w-7 rounded-md flex items-center justify-center text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-500/20 shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
