/**
 * Gallery-only image picker. Camera capture deliberately lives in the
 * HTML5 getUserMedia/canvas UI (WebcamCapture), so this helper must never add
 * a `capture` attribute or launch the Android camera intent.
 */
export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
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
