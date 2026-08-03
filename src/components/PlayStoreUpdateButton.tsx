import { useTranslation } from 'react-i18next';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.despia.biztrack';

/**
 * PlayStoreUpdateButton — "Check updates on Google Play".
 *
 * Always rendered (web visitors AND users inside the native shell) so everyone
 * has a one-tap path to the store listing when a new version ships.
 * It is a normal in-flow element, so the fixed bottom banner ad never covers it
 * (AppLayout already reserves BANNER_HEIGHT_PX of bottom padding).
 */
export default function PlayStoreUpdateButton({
  variant = 'dark',
  className = '',
}: {
  variant?: 'dark' | 'card';
  className?: string;
}) {
  const { t } = useTranslation();
  const label = t('common.checkUpdatesPlay', { defaultValue: 'Check updates on Google Play' });

  const open = () => {
    try {
      const w = window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
      if (!w) window.location.href = PLAY_STORE_URL;
    } catch {
      window.location.href = PLAY_STORE_URL;
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label={label}
      className={`inline-flex min-h-[44px] items-center justify-center gap-3 rounded-xl px-5 py-3 shadow-xl border transition-transform hover:scale-[1.02] active:scale-[0.98] ${
        variant === 'dark'
          ? 'bg-black/90 hover:bg-black text-white border-white/10'
          : 'w-full bg-card hover:bg-accent text-foreground border-border'
      } ${className}`}
    >
      <svg viewBox="0 0 512 512" className="h-6 w-6 shrink-0" aria-hidden="true">
        <path fill="#EA4335" d="M325.3 234.3 104.6 13l280.8 161.2z" />
        <path fill="#FBBC04" d="m408.6 351.9-83.3-48.1-58.2 51.1 141.5 81.3c19.1-11 32.2-30.4 32.2-52.3-.1-13.7-11.9-25.5-32.2-32z" />
        <path fill="#4285F4" d="M104.6 499 325.3 277.7l-58.2-51.1L104.6 13z" />
        <path fill="#34A853" d="M104.6 13v486l162.5-146.3z" />
      </svg>
      <span className="text-sm font-semibold leading-tight">{label}</span>
    </button>
  );
}
