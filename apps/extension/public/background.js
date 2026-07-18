const PENDING_KEY = 'srb_pending_names';

// Register the context menu every time the service worker starts up.
// removeAll() first avoids the "duplicate ID" error on restarts.
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: 'srb-add-name',
    title: 'Add to Spoke Bridge',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== 'srb-add-name') return;
  const text = (info.selectionText ?? '').trim();
  if (!text) return;

  chrome.storage.local.get(PENDING_KEY, (result) => {
    const existing = Array.isArray(result[PENDING_KEY]) ? result[PENDING_KEY] : [];
    const updated = [...existing, text];
    chrome.storage.local.set({ [PENDING_KEY]: updated }, () => {
      chrome.action.setBadgeText({ text: String(updated.length) });
      chrome.action.setBadgeBackgroundColor({ color: '#1D9E75' });
    });
  });
});
