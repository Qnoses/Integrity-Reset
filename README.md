# Integrity Reset

*A one-menu reset for heavy ad-blocker / userscript users who trip site
bot-detection ("integrity") checks — disables your extensions and clears the
tab's client state without ever touching cookies.*

If you run a thick stack of **content blockers and userscripts**, you've
probably hit this: a site's **bot-detection / integrity check** (Kasada-style)
decides your browser looks untrusted and quietly breaks *specific* actions —
following someone, loading notifications, claiming points — while passive
browsing keeps working fine. The cause is usually some mix of live content-script
perturbation and stale client state, and figuring out *which* of your dozen
extensions did it (or whether it's stale state at all) by hand is miserable:
you're toggling extensions and clearing data against a non-deterministic,
moving target.

This packages the reset into one menu. Disable all your extensions and/or clear
the tab's client state, **without clearing cookies** — so you keep your session
and whatever device/IP trust you've banked instead of cold-resetting it and
making things worse. It's site-agnostic: point it at whatever's misbehaving.

## The menu (left-click the toolbar icon, or press the shortcut)

Left-click opens a small menu — nothing fires on click alone, so there's no
accidental-destruction path. The shortcut opens the same menu.

- **Reset ritual** — disable all other extensions, clear the active tab's site
  state, and reload. The full forward ritual.
- **Disable all extensions** — disable the stack only (no clear, no reload).
- **Clear this tab + reload** — clear **localStorage, sessionStorage, IndexedDB,
  CacheStorage, and service workers** and reload, without touching extensions.
- **Re-enable all extensions** — restore exactly what this tool disabled.

A status line shows how many extensions are currently disabled by the tool, and
a red **OFF** badge appears on the icon while any are.

**Cookies are never touched.** The clear runs in the page's origin and can't
reach cookies — a property of the mechanism, not a setting — so your login
session and trust cookies survive. That's the whole point.

## Install (any Chromium browser)

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `Integrity-Reset` folder.
4. Pin the icon to the toolbar (puzzle-piece menu → pin).
5. After editing any file later, click **Reload** on the extension's card.

## Triggers

- **Toolbar click** — opens the menu.
- **Keyboard shortcut** — suggested `Alt+Shift+R`, opens the menu. Set/change/clear
  it at `chrome://extensions/shortcuts`.

## Recurrence playbook (the canonical case: Twitch)

1. Open the menu on the broken tab → **Reset ritual** → extensions off, tab
   cleared + reloaded.
2. Try the broken action (follow / open notifications) — confirm it works.
3. Open the menu → **Re-enable all extensions** (they ride the freshly-minted
   clean token).

## Using it on a new platform

When probing a *new* trust-state failure, reach for **Clear this tab + reload**
first — it isolates "is this stale client state?" without spending the
extension-disable step. Escalate to **Reset ritual** only if the clear alone
doesn't move it. Because cookies are always preserved, both are safe to try
speculatively: worst case you lose cached UI state and a reload, never your
session or banked trust.

## Config

- `KEEP_ENABLED` (top of `background.js`) — extension IDs to leave enabled during
  a disable/reset, e.g. a password manager. Empty by default. Find IDs at
  `chrome://extensions`. Reload the extension after editing.

## Caveats

- **Re-enabling**: in current Chromium this should re-enable silently because the
  action is triggered by your click (a user gesture). If your browser ever shows
  a per-extension confirmation, accept it once. This is the one behavior worth
  verifying the first time.
- **Won't act on internal pages**: it can't inject into `chrome://` /
  browser-internal or web-store tabs — run it on the actual site that's broken.
- **It disables *all* other extensions** by design (the ritual removes the whole
  perturbation surface rather than trying to isolate one culprit). Use
  `KEEP_ENABLED` for exceptions.
- This is an unpacked tool holding the `management` permission (the power to
  toggle your other extensions). Appropriate for a personal utility; just know
  that's what it is.

## License

MIT — see [LICENSE.md](LICENSE.md).
