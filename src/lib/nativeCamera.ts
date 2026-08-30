/**
 * Reliable image picker for browsers AND Android WebView shells
 * (WebViewGold / Despia).
 *
 * Two problems broke the camera in the native app:
 *
 * 1. The file inputs were rendered with Tailwind's `hidden`
 *    (`display: none`). Several Android WebView versions refuse to open the
 *    file chooser for a `display:none` input, so tapping "camera" did
 *    nothing at all. We therefore mount a real, visible-but-offscreen input.
 *
 * 2. Camera and gallery must be separate native intents. Omitting `capture`
 *    inside WebViewGold opens its generic "Upload File" action sheet. On some
 *    Android builds, choosing "Take Photo" from that sheet destroys the app's
 *    WebView before the camera activity starts (the app drops to the launcher
 *    and then cold-starts). A camera input with `capture="environment"` takes
 *    WebViewGold's direct camera path instead and avoids that crashing sheet.
 */
export type PickSource = 'camera' | 'gallery';

export function pickImage(source: PickSource): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') {
      // Keep this on native shells too. It bypasses WebViewGold's generic
      // Upload File chooser, whose indirect Take Photo action crashes on a
      // number of Android/OEM combinations.
      input.setAttribute('capture', 'environment');
    }
    // Offscreen but NOT display:none — required by old Android WebViews.
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '0';
    input.style.opacity = '0';
    input.style.width = '1px';
    input.style.height = '1px';
    document.body.appendChild(input);

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      try { input.remove(); } catch { /* noop */ }
      resolve(file);
    };

    input.addEventListener('change', () => {
      const selected = input.files?.[0] ?? null;
      // Some Android content providers return an empty MIME type. Preserve the
      // bytes but normalize the File so image validation does not reject a
      // valid camera result before compression can inspect it.
      if (selected && !selected.type) {
        finish(new File([selected], selected.name || `camera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: selected.lastModified,
        }));
        return;
      }
      finish(selected);
    });
    // Chrome/WebView fire `cancel` when the chooser is dismissed.
    input.addEventListener('cancel', () => finish(null));

    try {
      input.click();
    } catch {
      finish(null);
    }

    // Safety net: never leak the node if no event ever arrives.
    setTimeout(() => { if (!settled) { try { input.remove(); } catch { /* noop */ } } }, 5 * 60 * 1000);
  });
}

/** True when an in-page webcam stream is realistically available. */
export function canUseWebcam(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    !isNativeShell()
  );
}
