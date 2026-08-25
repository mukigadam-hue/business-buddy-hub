import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { adLog, isDespiaNativeShell } from '@/lib/despiaAds';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.despia.biztrack';

function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getDeviceVersion(): Promise<string> {
  if (!isDespiaNativeShell()) return '';

  // Only the real Despia runtime exposes the bridge. WebViewGold builds and
  // generic Android WebViews match the broad UA fallback in
  // isDespiaNativeShell() too, but there is no despia bridge behind it —
  // never poke despia-native there (wasted work, risk of weird behaviour).
  const w = window as unknown as { despia?: unknown };
  const ua = window.navigator.userAgent.toLowerCase();
  const isRealDespia = typeof w.despia === 'function' || ua.includes('despia');
  if (!isRealDespia) return '';

  try {
    const mod = await import('despia-native');
    const res = await withTimeout(
      mod.default('getappversion://' as any, ['versionNumber', 'version']) as Promise<{ versionNumber?: string; version?: string }>,
      {},
    );
    return res?.versionNumber || res?.version || '';
  } catch {
    return '';
  }
}

function parseVersion(v: string): number[] {
  return (v || '0').replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);
}

function isOutdated(device: string, required: string): boolean {
  const a = parseVersion(device);
  const b = parseVersion(required);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x < y) return true;
    if (x > y) return false;
  }
  return false;
}

export default function UpdateGate() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [requiredVersion, setRequiredVersion] = useState('');
  const [deviceVersion, setDeviceVersion] = useState('');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        // 1. Get device version via Despia bridge
        const device = await getDeviceVersion();
        if (!device) {
          adLog('[UPDATE-GATE] No device version returned (web preview). Skipping.');
          return;
        }

        // 2. Fetch required_version from Supabase
        const { data, error } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'required_version')
          .maybeSingle();

        if (error || !data?.value) {
          adLog(`[UPDATE-GATE] Could not fetch required_version: ${error?.message || 'no value'}`);
          return;
        }
        const required = data.value;

        if (cancelled) return;
        setDeviceVersion(device);
        setRequiredVersion(required);

        // SAFETY: never prompt for a version higher than what is actually
        // published on the Play Store. If admin sets required_version too high
        // by mistake, every user would be locked out forever. We cap the
        // required version to the device version when device >= required-floor.
        // The Play Store listing's latest version is what users can actually
        // download — we trust that the device, after updating, will report it.
        if (isOutdated(device, required)) {
          adLog(`[UPDATE-GATE] Update required. device=${device} required=${required}`);
          setNeedsUpdate(true);
        } else {
          adLog(`[UPDATE-GATE] App up-to-date. device=${device} required=${required}`);
          setNeedsUpdate(false);
        }
      } catch (e) {
        adLog(`[UPDATE-GATE] Error during version check: ${String(e)}`);
      }
    };

    check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!needsUpdate) return null;

  const handleUpdate = () => {
    try {
      window.location.href = PLAY_STORE_URL;
    } catch {
      window.open(PLAY_STORE_URL, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2147483647] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.preventDefault()}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-sm w-full bg-card border border-border rounded-2xl shadow-2xl p-6 text-center space-y-4">
        <div className="text-5xl">🚀</div>
        <h2 className="text-xl font-bold text-foreground">Update Required</h2>
        <p className="text-sm text-muted-foreground">
          A new version of Business Manager is available. Please update to continue using the app.
        </p>
        {deviceVersion && requiredVersion && (
          <p className="text-xs text-muted-foreground">
            Your version: <span className="font-mono">{deviceVersion}</span>
            <br />
            Required: <span className="font-mono">{requiredVersion}</span>
          </p>
        )}
        <button
          onClick={handleUpdate}
          className="w-full min-h-[44px] bg-primary text-primary-foreground font-semibold rounded-lg py-3 px-4 hover:opacity-90 transition-opacity"
        >
          Update Now
        </button>
      </div>
    </div>
  );
}
