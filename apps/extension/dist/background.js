const PENDING_KEY = 'srb_pending_names';
const SESSION_KEY = 'srb_match_session';
const LICENSE_KEY = 'srb_license';
const ANALYTICS_CLIENT_ID_KEY = 'srb_analytics_client_id';
const MENU_ID = 'add-to-spoke-bridge';
const FREE_NAME_CAP = 10;

// TODO: replace with the real GA4 property's measurement ID and API secret.
const GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX';
const GA4_API_SECRET = 'XXXXXXXXXXXX';
const GA4_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

// Register the context menu every time the service worker starts up.
// removeAll() first avoids the "duplicate ID" error on restarts.
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Add to Spoke Bridge',
    contexts: ['selection'],
  });
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    trackEvent('extension_installed', {});
  }
});

// Re-validate a cached Pro license once per service worker wake, rather than
// on every popup open, to minimize calls to the license server.
revalidateLicense();

async function revalidateLicense() {
  const { [LICENSE_KEY]: license } = await chrome.storage.local.get(LICENSE_KEY);
  if (!license || license.status !== 'active') return;

  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: license.key,
        instance_id: license.instanceId ?? undefined,
      }),
    });
    const data = await response.json();
    if (data.valid) {
      await chrome.storage.local.set({
        [LICENSE_KEY]: { ...license, validatedAt: new Date().toISOString() },
      });
    } else {
      // Revoked/expired — revert to free tier.
      await chrome.storage.local.remove(LICENSE_KEY);
    }
  } catch {
    // Network error — keep the cached license as-is rather than locking the
    // user out while offline.
  }
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) return;
  const rawText = info.selectionText ?? '';

  // A highlighted block can span multiple lines (e.g. a pasted WhatsApp
  // chunk) — treat each non-empty line as its own name.
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return;

  addPendingNames(lines);
});

async function addPendingNames(lines) {
  const { [LICENSE_KEY]: license } = await chrome.storage.local.get(LICENSE_KEY);
  const isPro = license && license.status === 'active';

  const { [PENDING_KEY]: pendingRaw, [SESSION_KEY]: sessionRaw } = await chrome.storage.local.get([
    PENDING_KEY,
    SESSION_KEY,
  ]);
  const existing = Array.isArray(pendingRaw) ? pendingRaw : [];
  const sessionCount = Array.isArray(sessionRaw?.results) ? sessionRaw.results.length : 0;

  const existingSet = new Set(existing);
  let newLines = lines.filter((line) => !existingSet.has(line));
  if (newLines.length === 0) return;

  if (!isPro) {
    const remaining = FREE_NAME_CAP - (sessionCount + existing.length);
    if (remaining <= 0) {
      chrome.action.setBadgeText({ text: 'MAX' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      trackEvent('free_limit_hit', {});
      return;
    }
    newLines = newLines.slice(0, remaining);
  }

  const updated = [...existing, ...newLines];
  chrome.storage.local.set({ [PENDING_KEY]: updated }, () => {
    const atCap = !isPro && sessionCount + updated.length >= FREE_NAME_CAP;
    chrome.action.setBadgeText({ text: atCap ? 'MAX' : String(updated.length) });
    chrome.action.setBadgeBackgroundColor({ color: atCap ? '#ef4444' : '#1D9E75' });
    if (atCap) trackEvent('free_limit_hit', {});
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'srb-track-event') {
    trackEvent(message.name, message.params ?? {});
  }
});

async function trackEvent(eventName, params) {
  try {
    let { [ANALYTICS_CLIENT_ID_KEY]: clientId } = await chrome.storage.local.get(ANALYTICS_CLIENT_ID_KEY);
    if (!clientId) {
      clientId = crypto.randomUUID();
      await chrome.storage.local.set({ [ANALYTICS_CLIENT_ID_KEY]: clientId });
    }

    await fetch(GA4_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name: eventName,
            params: {
              ...params,
              engagement_time_msec: '1',
              session_id: Date.now().toString(),
            },
          },
        ],
      }),
    });
  } catch (err) {
    // Analytics should never break the extension — silently fail.
    console.debug('Analytics event failed:', err);
  }
}
