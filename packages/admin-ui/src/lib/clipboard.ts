export async function copyToClipboard(text: string): Promise<void> {
  // Prefer the async Clipboard API when available (secure contexts).
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for non-secure contexts (e.g. http://<server-ip>) where
  // navigator.clipboard is unavailable.
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);

  const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const ok = document.execCommand('copy');
    if (!ok) {
      throw new Error('Copy command was rejected');
    }
  } finally {
    textarea.remove();
    previousActive?.focus?.();
  }
}

