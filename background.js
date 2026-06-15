// background.js — MV3 service worker
//
// Menu-driven (see popup.html). Exposes four actions via messages:
//   reset    = disable all other extensions, then clear the active tab + reload
//   disable  = disable all other extensions only (no clear, no reload)
//   clear    = clear the active tab's site state + reload only (no ext changes)
//   reenable = re-enable exactly what this tool disabled
//
// Never disables itself. Never touches cookies. Site-agnostic (acts on the
// active tab), so it works as a general trust-state / integrity debug tool.

// Extension IDs to ALWAYS keep enabled during a disable/reset (e.g. a password
// manager). Empty by default. Find IDs at vivaldi://extensions.
const KEEP_ENABLED = [
  // "aeblfdkhhhdcdjpifhhbdiojplfjncoa",
];

const SELF = chrome.runtime.id;

// Injected into the active tab; runs in the page's ORIGIN (isolated world).
// Reaches that origin's storage + service workers, but CANNOT reach cookies —
// which is the safety property we want (session + device/trust state survive).
function clearSiteStateAndReload() {
  (async () => {
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
    try {
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        await Promise.all(dbs.map(d => d && d.name && new Promise(res => {
          const q = indexedDB.deleteDatabase(d.name);
          q.onsuccess = q.onerror = q.onblocked = () => res();
        })));
      }
    } catch (e) {}
    try {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) {}
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch (e) {}
    location.reload();
  })();
}

async function activeTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ? tab.id : undefined;
}

async function injectClear() {
  const tabId = await activeTabId();
  if (tabId == null) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, func: clearSiteStateAndReload });
  } catch (e) {
    // active tab is a vivaldi:// / chrome:// / web-store page, etc.
    console.warn('[Integrity Reset] could not clear this tab:', e.message);
  }
}

async function disableAll() {
  const all = await chrome.management.getAll();
  const targets = all.filter(it =>
    it.type === 'extension' &&
    it.id !== SELF &&
    it.enabled &&
    it.mayDisable !== false &&
    !KEEP_ENABLED.includes(it.id)
  );
  const newly = [];
  for (const it of targets) {
    try { await chrome.management.setEnabled(it.id, false); newly.push(it.id); }
    catch (e) { console.warn('[Integrity Reset] could not disable', it.id, e.message); }
  }
  const { disabledIds = [] } = await chrome.storage.local.get('disabledIds');
  const merged = Array.from(new Set([...disabledIds, ...newly]));
  await chrome.storage.local.set({ disabledIds: merged });
  await syncBadge();
}

async function reEnableAll() {
  const { disabledIds = [] } = await chrome.storage.local.get('disabledIds');
  for (const id of disabledIds) {
    try { await chrome.management.setEnabled(id, true); }
    catch (e) { console.warn('[Integrity Reset] could not re-enable', id, e.message); }
  }
  await chrome.storage.local.set({ disabledIds: [] });
  await syncBadge();
}

async function getDisabledCount() {
  const { disabledIds = [] } = await chrome.storage.local.get('disabledIds');
  return disabledIds.length;
}

async function syncBadge() {
  const n = await getDisabledCount();
  try {
    await chrome.action.setBadgeText({ text: n > 0 ? 'OFF' : '' });
    await chrome.action.setBadgeBackgroundColor({ color: '#cc0000' });
  } catch (e) {}
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg && msg.cmd) {
      case 'reset':    await disableAll(); await injectClear(); break;
      case 'disable':  await disableAll(); break;
      case 'clear':    await injectClear(); break;
      case 'reenable': await reEnableAll(); break;
      // 'getState' falls through to just report the current count
    }
    sendResponse({ disabledCount: await getDisabledCount() });
  })();
  return true; // keep the channel open for the async response
});

chrome.runtime.onStartup.addListener(syncBadge);
chrome.runtime.onInstalled.addListener(syncBadge);
