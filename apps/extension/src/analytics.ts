// Fires from the popup by message-passing into the background service worker,
// which owns the actual GA4 request (see public/background.js). Never let a
// tracking call affect extension functionality — always fail silently.
export function track(name: string, params: Record<string, unknown> = {}): void {
  try {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;
    const maybePromise = chrome.runtime.sendMessage({ type: 'srb-track-event', name, params });
    if (maybePromise && typeof (maybePromise as Promise<unknown>).catch === 'function') {
      (maybePromise as Promise<unknown>).catch(() => {});
    }
  } catch {
    // ignore — analytics must never break the popup
  }
}
