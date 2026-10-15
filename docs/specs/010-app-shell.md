# 010 — Shell, navigation and the home page

## Window

- One Tauri 2 window, sized by the OS the first time and restored afterwards (window state persisted by the shell, not by React).
- The window is created in **Rust `setup`**, not in `tauri.conf.json` (`app.windows: []`), because only `WebviewWindowBuilder` can carry an `initialization_script` that runs before the app's own scripts (`src-tauri/README.md` documents the shell; written in M0.2).
- That script injects the server target: `window.__OC_TARGET__ = { url, password }`, JSON-serialised so a password containing a quote or a backslash cannot break out of the literal. Resolution, first match wins:
  1. the shell's **own** override — `OPENCODE_SERVER_URL` with `OPENCODE_PASSWORD` or `OPENCODE_AUTH_TOKEN`, and `OPENCODE_SERVICE_FILE` for the file path. These names are the shell's, for dev and CI; they are **not** an opencode interface (upstream honours `OPENCODE_PASSWORD` and `OPENCODE_SERVER_PASSWORD`);
  2. the registered service file — `$XDG_STATE_HOME/opencode/service.json` when that variable is set to something **non-blank** (the shell hardens this; upstream's `??` would take an empty value as a relative path), defaulting to `~/.local/state/opencode/service.json`, and otherwise the newest `service-<channel>.json` in that directory, which is the filename a non-release channel writes (upstream `packages/cli/src/services/service-config.ts`). A `service.json` that **exists but does not parse is no target**: it suppresses the channel fallback instead of being skipped, so one stale file cannot silently point the shell at an older channel's server (decided in M0.2b, contract);
  3. nothing — **no global at all**, so the web build falls back to its own origin or a stored target. That is a normal state, not an error.
- The global carries **no username**: the client's HTTP basic auth is `opencode:<password>`, with the username a constant in the client (`auth: { type: "basic", username, password }`).
- The password is readable by any script running in the page. The plugin host is in-process and full-trust (spec 040), so this is not a boundary a plugin could cross *later* — it is the same reach the app itself has.
- **The init script re-runs on every main-frame navigation** (wry registers it at document start on the main frame only), so the shell **allows only its own origin and refuses every other navigation**; an external link opens in the OS browser (M2.3 and M5.2) instead of navigating the webview, and a refusal leaves the app where it is. The guard pins scheme **and** host **and**, in dev, port: `tauri://localhost` in production, `http://localhost:1420` only in a dev build. Without that guard a link in rendered markdown would hand a foreign origin the credential. A CSP (M2.0) is the second shell-side defence, and the two are the reason the credential in page scope stays acceptable.
- No custom title bar in v1; the window title is `<session title> — opencode client` on a session route, `opencode client` elsewhere — the shipped `WINDOW_TITLE`, matching the plan's M0.2 row. The macOS traffic lights stay where they are.
- Menu: `File` (New session…, Close tab, Quit), `View` (Toggle sidebar, Command palette, Reload), `Help` (Docs, Report issue). Everything in the menu also has a keybinding and a palette entry; the menu bar is a convenience, never the only path.

## Routes

| Route | Renders | Notes |
| --- | --- | --- |
| `/` (home) | recents, new session, settings entry | the app's landing surface; opens even with no sessions |
| `/session/:id` | the session view (spec 020) | `:id` is the server's session id; an unknown or child session id renders the same "no session" state as home's empty case |
| `/settings` | settings sections, built-in + plugin | **a view that renders as a tab while it is open** — no settings tab sits in the strip while it is closed, and it is not an entry of its own in the nav. Four ways in: the nav gear, ⌘,, the home page's settings button, and the palette. Closes and reopens like a session tab. Each section is a foldable panel and a plugin registers one. The plugin manager is a section here, not a route of its own (spec 040): always registered, never disableable |

- The router is internal (`src/app/router.ts`, `src/app/useRoute.ts`): a `Route` union, `useRoute()` (history API + `popstate`), `navigate(route)`, and a registry so a plugin may contribute a route (`src/app/routeRegistry.ts`). No router dependency. Registry rules, decided in M0.4/M0.4b: a registered route serves a path the built-in router **does not already serve** — it may not replace `home`, a session or `settings`, because `/settings` is the route to the plugin manager and a contribution must not be able to hide the way to its own manager; a duplicate route id **or** a duplicate path is refused and recorded as a `PluginFault` rather than silently winning; and one snapshot is cached so `useSyncExternalStore` never sees a fresh object per read (a fresh object re-renders forever).
- Depth is two: a top-level surface and, inside a session, its panels. No nested navigators.
- Back/forward work through the browser history (⌘[ / ⌘]), because this is a webview and users expect it.

## Top nav — sessions and tabs

The sketch's "top nav contains sessions/tabs". One row, full width, always visible; it is what makes several sessions usable in one window.

| Region | Contents |
| --- | --- |
| left | the app mark (click → home), plus plugin contributions |
| centre | **the tab strip** — the region that takes the remaining width, so it is the one that flexes and scrolls (M1.1 resolved an earlier "left-flowing" reading: a contribution into `left` must not be able to disturb the strip) — one tab per open view: a **session** (status dot, title, close on hover) or the **settings view** while it is open (a labelled tab, closeable like any other). A tab is a view, not only a session |
| right | `+ New session`, session picker `⌕` (all root sessions, searchable), settings gear (a trigger for the settings tab, never a tab itself), overflow `⋯` (plugin-contributed nav items) |

- Tab status dot comes from the session's execution state (`session.execution.*`), so a background tab shows that a turn is running. A tab that has produced output while unfocused gets a subtle unread mark until visited.
- Overlap with the TUI: the TUI's horizontal strip is its sessions rail. We keep the shape (one strip, one row, status per session) and add desktop affordances — middle-click close, drag to reorder, overflow menu past the window width, ⌘1…⌘9 to switch, ⌘W to close, ⌘T for new session.
- The strip is a **slot host**: `topnav.left`, `topnav.center`, `topnav.right`. Built-in controls register into it through the same API a plugin uses (spec 040 §Modularity).

## Home page

Opens by default on launch when no tab is restored — the sketch's "homepage should open with recents, with a settings button".

| Block | Contents |
| --- | --- |
| Recents | root sessions from `session.list({ parentID: null, order: "desc", limit: SESSION_PAGE_LIMIT })`, newest first, grouped by the **day of `time.updated`** (`Today`, then `Date.prototype.toDateString()`), one line per session: title, directory (last path segment, truncated), relative time, agent·model if known. Click → opens the session view. |
| New session | one primary button: pick a directory (native directory picker, spec 040 `host.native.pickDirectory`), then `session.create()` in that directory and open it. Recent directories are listed as one-click chips; the picker remembers the last used directory. |
| Settings | a button in the top-right of the page, one of the four ways into the settings tab (the others: nav gear, ⌘,, palette). |
| Continue where you left off | the last opened session, as a single card, if any (local UI state). |
| Plugin surface | `home.hero`, `home.widgets` (a grid), `home.actions` — e.g. a plugin offering "new session in this repo". |

- Empty state: when the server has no root sessions, the page shows the new-session action, the settings button, and one line naming the connected server (`url`, version from `server.info()`), so a misconfigured target is visible rather than a blank page.
- A child session (a subagent's) never appears in recents or in the picker — root sessions only, the same rule the previous build measured out of `session.list`.

## Desktop behaviours (the "UX like desktop" half)

- **Command palette** (⌘K / ctrl+K): sessions, commands (server `command.list` + client commands + plugin commands), settings sections (including the Plugins section), theme switch, font size, and every open tab — Settings included — which it can focus. Keyboard driven, and **substring-filtered today, with fuzzy as the target for the rows that complete this list**: `M1.6b` lifts the session source's one-page limit (it silently omitted older roots), theme switch arrives with M3.4, font size with M3.2, and plugin commands with M4.4.
- **Keyboard map** (single table in `src/constants/keys.ts`, rendered into the palette's help): ⌘K palette, ⌘T new session, ⌘W close tab, ⌘1…⌘9 tab switch, ⌘B toggle sidebar, ⌘, settings, ⌘R reload session, Esc interrupt a running turn, ⌘↩ send vs ↩ newline (configurable), ⌥↑/⌥↓ jump between prompts.
- **Context menus** (right-click): tab (close, close others, rename, copy directory), recent row (open, copy path, delete session), transcript row (copy text, copy code, expand/collapse, open file at path), sidebar panel (collapse, detach later).
- **Hover affordances** the TUI cannot have: copy buttons on code blocks and tool output, "expand/collapse all" on long outputs, per-row timestamps on hover, a jump-to-latest pill while scrolled up.
- **Resizable panes**: sidebar width by drag on its edge, persisted; transcript area takes the rest; minimum widths so nothing collapses to zero.
- **Native integrations**: directory/file pickers, open-in-editor (a row's path with the OS default handler), copy-to-clipboard with a toast, system notifications on turn end while the window is unfocused, drag-and-drop files onto the prompt box to attach.
- **Self-update** through the Tauri updater on the desktop build; the web build shows its own version only.
- **Never a silent failure**: every server error surfaces as a toast or an inline row (`Prompt not sent`, `Interrupt failed`), never only in the console.

## Persistence

Two stores, deliberately. The window state is the **shell's** (`opencode.window`); everything else is **one versioned blob under a single `settings` key**, whose `dataVersion` and forward-only migration registry the next line describes. So the `settings.*` names below are **field paths inside that one blob**, not separate keys — the table is a list of names, not of stores.

| Stored name | Holds |
| --- | --- |
| `opencode.window` | window size/position (shell side) |
| `settings.tabs` | open views — session ids, plus the settings view while it is open — in order, plus the active tab |
| `settings.lastRoute` | where to land on next launch |
| `settings.lastOpened` | the session the app was last in, so a relaunch can offer it (`src/app/lastOpened.ts` always named M1.5 as its hydration seam; added to the table when M1.5 landed) |
| `settings.server` | the stored target — url + password — for a build that is not served by its own server (M1.7). Never written to a log and never carried in a URL; the credential reaches the wire only as the `Authorization` header |
| `settings.sidebar` | visible + width |
| `settings.fonts` | interface face/size, code face/size (spec 030) |
| `settings.recentDirectories` | the new-session chips |
| `settings.pluginsEnabled`, `settings.plugins[]` | plugin master switch, per-plugin state + `data` (spec 040) |

- Settings are one versioned blob with `dataVersion` and a forward-only migration registry: a newer build reads and migrates an older blob, never drops a field it does not know.
- Nothing user-visible is stored per-window that a second window would need to duplicate (the plugin manager's state lives in the blob, not in a component).

## Acceptance

- Fresh install with a running server: launch lands on home, recents list matches `session.list` for root sessions, the picker creates a session in a chosen directory, and clicking a recent opens the session view.
- Two sessions open: tabs switch with keyboard and mouse, a running turn in one tab is visible from the other, closing a tab does not kill the session.
- Settings opens as a tab from each of its four entries (nav gear, ⌘,, the home page button, the palette); **no settings tab is present in the strip while settings is closed**; it closes and reopens without losing its expanded sections; a plugin-contributed section appears there (spec 040 acceptance).
- Window size, sidebar width, tab set and font choice survive a restart.
- A server that is down or a wrong target produces a named error state with the url it tried, not a blank page.
