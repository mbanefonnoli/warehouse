const PENDING_KEY = 'srb_pending_names';
const MENU_ID = 'add-to-spoke-bridge';

// Register the context menu every time the service worker starts up.
// removeAll() first avoids the "duplicate ID" error on restarts.
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Add to Spoke Bridge',
    contexts: ['selection'],
  });
});

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

  chrome.storage.local.get(PENDING_KEY, (result) => {
    const existing = Array.isArray(result[PENDING_KEY]) ? result[PENDING_KEY] : [];
    const existingSet = new Set(existing);
    const newLines = lines.filter((line) => !existingSet.has(line));
    if (newLines.length === 0) return;

    const updated = [...existing, ...newLines];
    chrome.storage.local.set({ [PENDING_KEY]: updated }, () => {
      chrome.action.setBadgeText({ text: String(updated.length) });
      chrome.action.setBadgeBackgroundColor({ color: '#1D9E75' });
    });
  });
});
