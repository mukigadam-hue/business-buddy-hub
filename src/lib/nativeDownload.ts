/**
 * Real file downloads inside native WebView shells (WebViewGold / Despia).
 *
 * Android WebViews silently drop `<a download>` clicks pointing at `blob:`
 * URLs — the UI looks like it downloaded, but nothing lands in the phone's
 * storage. To make downloads actually save, we:
 *
 *   1. Try the native share sheet (`navigator.share` with a File) — the user
 *      can pick "Save to Files"/gallery. Works when the shell supports it.
 *   2. Upload the file to a private Cloud storage bucket and hand the native
 *      shell a real `https://` URL with `Content-Disposition: attachment`.
 *      Android's DownloadListener handles that and writes to /Download.
 *   3. Fall back to the classic anchor download (plain web browsers).
 */

import { supabase } from '@/integrations/supabase/client';
import { isNativeShell } from '@/lib/nativeAdBridge';

const BUCKET = 'receipt-exports';

export function anchorDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Share a file through the OS share sheet. Returns true if handled. */
export async function nativeFileShare(blob: Blob, name: string, mime: string): Promise<boolean> {
  try {
    const file = new File([blob], name, { type: mime });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.canShare?.({ files: [file] }) && typeof nav.share === 'function') {
      await nav.share({ files: [file], title: name });
      return true;
    }
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') return true;
  }
  return false;
}

/**
 * Upload to private storage and return a short-lived signed URL that forces a
 * file download (attachment) with the correct filename.
 */
export async function uploadForDownload(blob: Blob, name: string, mime: string): Promise<string | null> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return null;
    const path = `${uid}/${Date.now()}-${name.replace(/[^\w.-]+/g, '_')}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: mime, upsert: true, cacheControl: '3600' });
    if (error) return null;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60, { download: name });
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

/** Hand a real http(s) URL to the native shell so its download manager saves it. */
function openNativeUrl(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  try {
    if (typeof w.despia === 'function') {
      w.despia(url);
      return;
    }
  } catch { /* ignore */ }
  // WebViewGold + stock Android WebView: a top-level navigation to an
  // attachment URL triggers the native DownloadListener.
  const opened = window.open(url, '_blank');
  if (!opened) window.location.href = url;
}

export type DownloadResult = 'shared' | 'native-download' | 'browser-download' | 'failed';

/**
 * Save a generated file to the device, using the most reliable channel for
 * the current environment.
 */
export async function saveFile(blob: Blob, name: string, mime: string): Promise<DownloadResult> {
  if (!isNativeShell()) {
    anchorDownload(blob, name);
    return 'browser-download';
  }

  const signedUrl = await uploadForDownload(blob, name, mime);
  if (signedUrl) {
    openNativeUrl(signedUrl);
    return 'native-download';
  }

  // Offline or not signed in — let the user route it through the share sheet.
  if (await nativeFileShare(blob, name, mime)) return 'shared';

  anchorDownload(blob, name);
  return 'failed';
}

/** Share a file, falling back to a real device download. */
export async function shareFile(blob: Blob, name: string, mime: string): Promise<DownloadResult> {
  if (await nativeFileShare(blob, name, mime)) return 'shared';
  return saveFile(blob, name, mime);
}
