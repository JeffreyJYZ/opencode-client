# Status board

Last updated: 2026-10-15 · Current focus: **M0 — Foundations** (`M0.2` and `M0.2b` done and reviewed, `M0.6` done, `M0.1` nearly — its `e2e` script waits on M2; `M0` complete but for `M0.1`'s `e2e`, which is parked on M2; `M1.1`, the tab strip, is next)

| Milestone | Done / total | Gate |
| --- | --- | --- |
| M0 Foundations | 8 / 9 | `bun run verify` (now ending in `cargo check`) and `cargo test`; `bun tauri dev` opens a window with the target injected |
| M1 Shell and home | 5 / 10 | home → session view end to end; restart restores tabs |
| M2 Session view | 0 / 10 | a live session streams, interrupts, queues and replies from the keyboard |
| M3 Type and theme | 0 / 6 | both faces change live and survive a restart; theme applies and clears |
| M4 Plugin host 0.1 | 0 / 8 | four example plugins install, work and uninstall through the documented API |
| M5 Desktop polish | 0 / 5 | packaged app, updater, `verify-release` exits 0 |

## M0 — Foundations

- [ ] `M0.1` Repo hygiene: `verify`/`fix` scripts, Biome config, ESLint removed, strict tsconfig + `@/*` alias — evidence: `bun run verify` green on the scaffold — **doing**: ESLint deps (5) and the `lint: eslint .` script removed, `@biomejs/biome` **2.5.15** installed as the only formatter/linter with `biome.json` (tabs, indentWidth 4, lineWidth 100), `strict` + `@/*` in both tsconfigs mirrored by the Vite alias, `bun run verify` exits 0, the 150-line gate (`scripts/check-file-length.ts`) is wired into `verify`, and `.superpowers/` is ignored; remaining: the `e2e` script, which lands with M2's browser proof (and the `lint` script goes in M0.2b)
- [x] `M0.2` Tauri 2 shell: Rust `setup` window + `initialization_script` injecting `__OC_TARGET__`, `bundle.targets: ["app"]`, window state — evidence: the window opened on probe port `:1420` (the main checkout holds `:5173`) and the page itself read the injected global (`?present&url=…&passwordLength=10`), with `[shell] target url=http://127.0.0.1:49374 password=<18 chars>` from the real service file; a quote-carrying password round-tripped intact and `?absent` when nothing was configured; the webview held an established connection to the dev server — **done** (`5601733`; gate fix `769e19d`), **reviewed** `accept with fixes` (no blocker; the fixes are `M0.2b`)
- [x] `M0.2b` M0.2 follow-ups: resolution completeness (`XDG_STATE_HOME` + `service-<channel>.json`), a **navigation guard** (no foreign origin may receive the injected target), redacted `Target` `Debug`, the unused `window-state:default` grant dropped, `/gen/` gitignore parity, `cargo check` in `verify`, the `lint` script gone, dev port 1420, trimmed url — **done** (`1f79319`), **reviewed** `accept with fixes` (the fixes are `M0.2c`): 20 `cargo test` cases pass, `cargo check` is part of `verify`, and the guard was proven in situ by the dev server's request log — the allowed origin fetched the document and its whole module graph, a non-allowlisted origin produced no request at all
- [x] `M0.2c` M0.2b review fixes: production guard arm pins the host (`tauri://localhost`, with `tauri://evil/index.html` refused in both dev modes), a `devUrl`/`DEV_PORT` agreement test, an attack-string test for the injected literal, the uncovered pure edges (mtime tie, empty state home), the dev-only residual risk named — **done** (`1f6f913`), controller-verified: `cargo test` 20→25 and the drift assertion shown failing on a one-token config change, then passing
- [x] `M0.3` Tokens + theme baseline: `tokens.css` three layers, the v2 opencode theme document vendored **byte-identical** (`packages/tui/src/theme/assets/v2/opencode.json`), dark + light — **done** (`0b135ed`), controller-verified: `cmp` silent and both sha256 `2673cbe2…`; the primitive scales are redefined per theme block, so light resolves surface `#ffffff` / text `#1a1a1a` and dark the inverse; all ten semantic tokens declared in both blocks
- [x] `M0.4` App skeleton: router (`home`, `session/:id`, `settings`), providers, slot registry + `<Slot>` — **done** (`efbc3ce`), **reviewed** `accept` (no blockers, no majors; the reviewer replicated the browser proof on its own port): 33 `bun test` cases and `bun test` now ends the gate, the slot tuple matches spec 040 name-for-name, both component tests carry their own `afterEach(cleanup)`, and the empty slot is a fragment asserting `innerHTML === ""`
- [x] `M0.4b` Registry hardening from M0.4's review (**done** `e89bf6c`, controller-verified, `cat-jam-free`, ~4 min): a non-function component is refused as malformed; a registered route may not replace a built-in path; `homeRoute()`'s identity gets a comment — evidence: tests for both refusals, `bun test` output quoted
- [x] `M0.5` opencode client provider + offline state — **done** (`9dba6ff`), **reviewed** `accept` (nothing blocks M1.1): 33→82 tests; the acceptance proven in a browser against **its own** isolated server (closed port → banner naming the url; up → online; killed → banner returns; restart + retry → recovered); `?auth_token=` stripped before first paint; the registered service untouched (74/609 sessions and `service.json`'s mtime identical)
- [x] `M0.6` Repository under git: `git init`, `.gitignore` verified, one initial commit of the scaffold + docs — evidence: `ebf7280` on `main`, 26 files, `git status --short` empty — **done**

## M1 — Shell and home

- [x] `M1.1` Top nav: tab strip (sessions, plus the settings view while it is open), status dot from `session.active()`, close/reorder/overflow, ⌘1…⌘9, ⌘W, ⌘T — **done** (`4870a17`, 13m11s on muse-spark), **reviewed** `accept with fixes` (no blocker; the fixes are `M1.1b`): 86→109 tests, browser proof re-run by the reviewer on its own port including 9 tabs at a 500px viewport
- [x] `M1.1b` M1.1 review fixes — **done** (`926eda3`, `cat-jam-free`), controller-verified: 109→**126** tests, `closeTabAndGo` compares by `sameTab`, the poll reuses its set, `hydrateTabState` clears unread, dismissal extracted to `useMenuDismiss`, and the six test gaps closed (middle-click close, drag reorder, Escape/click-outside, poll identity, clamping, `sessionActivity`)
- [x] `M1.2` Home: recents (root sessions, day-grouped by `time.updated`, location per row), empty state naming the server, and it owns the first `useSessions` — **done** (`f735885`, `cat-jam-free`), **reviewed** `accept with fixes` (no blocker; the fixes are `M1.2b`): 126→132 tests and an isolated-server proof that rendered seeded recents in order (the reviewer reproduced it and clicked a row through the tab store)
- [ ] `M1.2b` M1.2 review fixes: the client is injected into `useSessions` (no more `mock.module`, which leaks process-wide and is why the required tests were dropped), the seven missing tests restored (root-only filter, empty state naming url+version, the failed state naming the target, row click through the store, the settings entry through the store, home slots, the hook's five states), `groupSessionsByDay` sorts its own copy, and the page splits at the cap — evidence: `bun test` (132→) with each new test mapped to its item
- [ ] `M1.2` Home: recents (root sessions, day-grouped, location per row), empty state naming the server — evidence: list matches `session.list({ parentID: null })`
- [ ] `M1.3` New session: directory picker + recent-dir chips → `session.create()` → open it — evidence: created in a picked dir, appears in recents
- [ ] `M1.3b` M1.3 review fixes: the capability description no longer matches its own grant ("core set only" while `dialog:allow-open` is granted), M1.3's report corrects its `cargo test` excerpt and drops its unreproducible service-count claim, and the crate gets `cargo fmt` + a `cargo fmt --check` line in `verify` (a pre-existing one-space indent in `build.rs` fails a strict format gate today) as its own commit — evidence: `bun run verify` with the new step green, and the corrected quotes
- [ ] `M1.4` Session picker `⌕`: all root sessions, search, keyboard — evidence: opens a session older than the first page
- [ ] `M1.5` Persistence: versioned settings blob + forward-only migrations (tabs incl. settings, last route, sidebar, fonts, recent dirs) — evidence: restart restores both
- [ ] `M1.7` Connect flow: `settings.server` (url + password) with connect/disconnect states, so a build not served by its own server has somewhere to point; the "stored target" step of spec 050's order has no key without it — evidence: a wrong url shows the offline banner with a retry; a correct one connects; the target survives a restart
- [ ] `M1.6` Command palette + keymap registry — evidence: ⌘K lists sessions, commands, settings sections and open tabs

## M2 — Session view

- [ ] `M2.0` CSP on the webview (`default-src 'self'` for bundled assets + a `connect-src` limited to the resolved server origin, assembled after target resolution) — evidence: a script injected into the page cannot reach a third-party origin while the app's own calls still work
- [ ] `M2.1` Event ingest: single subscription, `accept` filter, per-session reducer, resync policy — evidence: two sessions stream at once; killed server resumes with no duplicate rows
- [ ] `M2.2` Transcript rows: user band (queued/sent rail), prose, reasoning, tool, subagent, shell, error, per-prompt footer — evidence: each row renders from a seeded session
- [ ] `M2.3` Markdown + highlighting: position keys, debounced memoised highlight, language cap, **external links open in the OS browser and never navigate the webview** — evidence: a fence streamed in many deltas highlights once; a link does not change the page's origin
- [ ] `M2.4` Ingest/render caps + index-scan counting — evidence: long output collapses with the right `(N more lines)`
- [ ] `M2.5` Prompt box: identity controls, send/interrupt, queued state, attachments, `@` mentions, slash menu (client ∪ server) — evidence: a server command inserts `/<name> ` and sends nothing
- [ ] `M2.6` Docks: permission (`once`/`always`/`reject`) + question form — evidence: both replied from the keyboard only
- [ ] `M2.7` Sidebar panels: Session, Context, Subagents, MCP, Files; ⌘B; drag-resize; persisted — evidence: figures match `session.stats` / `vcs.status`
- [ ] `M2.8` Statusline: location + branch (bounded retry), subagents, tokens, spend, contextual hints — evidence: branch appears after the location resolves
- [ ] `M2.9` Scroll: tail-follow, unpin, jump-to-latest, per-tab memory — evidence: scroll position survives a tab switch

## M3 — Type and theme

- [ ] `M3.0` Interface font at the root: one rule applying `--oc-font-ui`/size (headings currently render serif — the tokens are applied per component, 17 copies), the copies deleted, the code-face rule parked for M2.2, and a test that fails on a new inline font — evidence: computed `font-family` in a browser resolves to the interface stack for an `h2`, a day `h3`, a row and two controls, and zero inline font declarations remain
- [ ] `M3.1` Bundle Geist + Geist Mono (OFL); code default `GeistMono Nerd Font` by family name (brew cask) with bundled `Geist Mono` as fallback; wire `--oc-font-ui` / `--oc-font-code` + sizes — evidence: fresh install renders UI in Geist and code in `GeistMono Nerd Font`; with the cask removed, code falls back to `Geist Mono`
- [ ] `M3.2` Font settings section (both roles, live sample, reset, persisted) — evidence: change both, restart, still applied
- [ ] `M3.3` Face picker: bundled + machine families by resolved name + generics; misspelt refused — evidence: a misspelt family cannot be selected
- [ ] `M3.4` Theme service: one `<style>` + `data-theme`, dark/light built-ins, plugin themes, fonts win — evidence: apply/clear a theme, fonts unchanged
- [ ] `M3.5` Settings **surface**, a tab while it is open (sections: Appearance, Typography, Server, Plugins) + plugin sections, four entries in, no nav entry of its own — evidence: no settings tab in the strip while closed; every section keyboard reachable

## M4 — Plugin host `0.1`

- [ ] `M4.1` Manifest schema, id allowlist mirrored in Rust `safe_id`, `engines.app`, `apiVersion` — evidence: bad id / unknown capability fails at install
- [ ] `M4.2` Loader: blob import, globals, two-phase reload, dispose order, `PluginFault` log — evidence: disabling `hello-world` clears slot and marker
- [ ] `M4.3` Registries + slots (`ui`, `commands`, `panels`, `routes`, `settings`, `renderers`, `themes`), inert on refusal — evidence: unknown slot logs a fault and renders nothing
- [ ] `M4.4` Services: `opencode.*`, `transcript.snapshot`, `storage` (capped), `native` (path-scoped), `notify`, `log`, `signal`, `version` — evidence: a plugin reaches only its own data dir
- [ ] `M4.5` Plugin manager as a settings section (enable/disable/reload/uninstall, capabilities, faults, log) — evidence: the section is always present, never disableable
- [ ] `M4.6` `scripts/build-plugins.ts` → `public/plugins/<id>/main.js`, bare-specifier check — evidence: build fails on a surviving bare import
- [ ] `M4.7` Example plugins: `hello-world`, `theme-gruvbox`, `session-export`, `context-meter` — evidence: each installs, works, uninstalls cleanly
- [ ] `M4.8` Generated in-app API reference from the SDK types + slot table — evidence: the page lists every registry and slot in code

## M5 — Desktop polish

- [ ] `M5.1` Context menus on tabs, recents, transcript rows, panels — evidence: every action reachable by keyboard
- [ ] `M5.2` Native integrations: open-in-editor (and external links to the OS browser), clipboard + toast, unfocused turn-end notification, drag-drop attach — evidence: each fires from a real interaction
- [ ] `M5.3` Window state restore, menu bar, version display — evidence: restart restores size and position
- [ ] `M5.4` Tauri updater + committed `verify-release` — evidence: `bun scripts/verify-release.ts <tag>` prints one verdict line, exits non-zero on a gap
- [ ] `M5.5` Packaging: macOS `app` bundle + README install steps — evidence: `bun tauri build` produces a runnable app

## Decisions log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-15 | Interface font default is **Geist** (bundled, OFL); **code face default is `GeistMono Nerd Font`** — the brew cask `font-geist-mono-nerd-font` (3.5.1 here), offered by family name with bundled `Geist Mono` as the offline fallback | user instruction; the Nerd Font cut carries the box-drawing/icon glyphs the row vocabulary uses, and a distributed app cannot bundle it |
| 2026-10-15 | **Plugins are a settings section**, not a route | the sketch's shell: settings is where configuration lives |
| 2026-10-15 | **Settings renders as a tab while it is open** — no settings tab in the strip when it is closed, no entry of its own in the nav; four entries: nav gear, ⌘,, the home page button, the palette; closeable and reopenable | user instruction, refined the same day: "like a tab when opened but not only accessible through nav… no settings tab in nav when not opened" |
| 2026-10-15 | **ESLint removed entirely; Biome 2.5.15 is the only formatter and linter** (`biome.json`: tabs, indentWidth 4, lineWidth 100, `ignoreUnknown`, vendored/generated paths excluded). `bun run verify` = `tsc -b && biome check . && scripts/check-file-length.ts` | house rule (one tool); the scaffold's ESLint deps and `lint` script were template leftovers |
| 2026-10-15 | **150-line cap on code and config files**, enforced by `scripts/check-file-length.ts` in `bun run verify`; docs exempt | user instruction; a file past the cap is two responsibilities in one file (and unreadable in one pass) |
| 2026-10-15 | **Execution is subagent-driven** — one fresh implementer per plan task with a written brief, a spec+quality review after each, controller rules and keeps the ledger, no two writers on a file | user instruction; matches the plan's parallelism rules and keeps the controller's context for rulings |
| 2026-10-15 | **Biome formats every change, always** — `bun run fix` before each commit, `verify` fails on unformatted code | user instruction; one formatter, no editor assumptions |
| 2026-10-15 | **TUI-structural, not a replica**: no cell grid, no comparator, no glyph borders | the sketch asks for a similar structure with desktop UX |
| 2026-10-15 | **Ordering: vertical slices, logic first inside each** — every milestone ships a surface *with* its real data; the two logic-only tasks are front-loaded (M0.5 client provider before any page, M2.1 event ingest before any transcript row); mock data only in unit fixtures and seeded browser proofs | confirmed by the user; a UI-first phase runs ahead of the transcript model and the layout then keeps being re-derived from a moving shape (the previous build's cost) |
| 2026-10-15 | **No `effect`** in the plugin API — Promise + subscriptions + `AbortSignal` | `ai-client-oss`'s host ships no Effect runner and pushes that cost onto plugin authors |
| 2026-10-15 | The previous build at `~/dev/apps/opencode-tauri-client-legacy` is abandoned: read for facts, never restore or copy code | user instruction; its specs describe a build that no longer exists |
| 2026-10-15 | **The file-length gate skips machine-generated trees**: `src-tauri/gen/` (Tauri's capability schemas — 2358 lines each) joins `target/`, `dist/` and `node_modules/` in `SKIP_PREFIXES` | M0.2: as written, `bun run verify` could not pass once a Tauri build had run, so the gate would have been red for every task after M0.2 |
| 2026-10-15 | **The shell's `OPENCODE_*` override is the shell's own, not an opencode interface**; the service file resolves under `$XDG_STATE_HOME` and may be channel-suffixed (`service-local.json`) | the implementer's report, confirmed by M0.2's review: none of those names appear upstream, and a non-default `XDG_STATE_HOME` or channel silently produced "no target" — the implementation followed spec 010, so 010 was the thing to fix |
| 2026-10-15 | **The injected target is readable by any script in the page** — accepted, and bounded: the navigation guard (M0.2b) refuses any origin but the app's own, and a CSP (M2.0) limits where a page script can send data | the plugin host is in-process and full-trust (only `plugin-data` is enforced), so this is the reach the app itself has, not a new boundary (spec 010 §Window) |
| 2026-10-15 | **The shell refuses every main-frame navigation except its own origin** (M0.2b), and external links open in the OS browser (M2.3/M5.2) | M0.2's review: wry registers the init script at document start on the main frame, so it re-runs per navigation — a markdown link would have handed a foreign origin `window.__OC_TARGET__`, password included |
| 2026-10-15 | **A CSP is a planned task (M2.0), not a comment** — the policy is assembled after target resolution, before the window is created | M0.2's review: with a credential in page scope and server-supplied markdown arriving in M2, no task owned the cheapest defence in depth |
| 2026-10-15 | **Dev-only: the dev port is 1420 and `beforeDevCommand` carries `--strictPort`** (Tauri's own convention, not Vite's 5173) | the main checkout holds `:5173`, so the committed `devUrl` could not start beside it and every run needed a `--config` override; without `--strictPort` a busy port silently loads another checkout's app |
| 2026-10-15 | **The theme documents are vendored byte-identical, with provenance in a README** — spec 030's "only the header comment" is impossible in a JSON file | M0.3's recon: JSON has no comments, and the documents live at `packages/tui/src/theme/assets/` (spec 030 cited `packages/theme/src/tui/*`, which is TypeScript) |
| 2026-10-15 | **The production guard arm pins the host** (`tauri://localhost`), not the scheme alone — accepted as defence in depth, **not** as a leak being plugged | M0.2b's review found the looseness; its impact is overstated, since a foreign `tauri://` authority is still served by this app's own asset handler, so the document it would receive is our own bundle (our own code, which already holds the credential). One condition, no cost, so it lands in `M0.2c` |
| 2026-10-15 | **A `service.json` that exists but does not parse is no target** — it suppresses the channel fallback rather than being skipped past | M0.2b: the surprising half of "prefer `service.json`"; recorded as a contract in spec 010 so a future reader does not "fix" it into a silent redirect to an older channel's server |
| 2026-10-15 | **Dev-only residual: a dev build trusts whatever owns `localhost:1420`** | M0.2b's review; `--strictPort` makes Vite fail loudly rather than substitute, and the arm is compiled out of a production build, so the exposure cannot reach one — but it is named rather than assumed |
| 2026-10-15 | **A registered route serves unknown paths only — it may not replace a built-in path** | M0.4's review asked; ruled no, because `/settings` is the route to the plugin manager and spec 040 locks the substrate rather than letting a contribution hide the way to its own manager. Goes to `M0.4b`, and spec 010 §Routes now states it |
| 2026-10-15 | **A non-function component is a malformed entry**: refused, faulted, never rendered | spec 040 requires that a malformed entry never breaks the app, and a truthy non-component currently fails at render. Goes to `M0.4b` |
| 2026-10-15 | **`src/plugins/registry.ts` must be split by M4.3**, not extended | it is at 144/150 lines; the next behaviour added to it would force a truncation rather than a seam, and validation vs storage is the natural split |
| 2026-10-15 | **Spec 040 contradicted itself on the order key**: the `ui.register` row listed no `order` while §Slots grants one | M0.4's implementer found it; the table row is corrected, and `routes.register` now states the unknown-path rule there too |
| 2026-10-15 | **The session list (`useSessions`) belongs to M1.2**, not M0.5 — a list needs a consumer; M0.5's row is amended and M1.2 owns the first hook | M0.5's review confirmed the row-vs-brief gap; a stub with no data path would have been theatre |
| 2026-10-15 | **The opencode server CORS-reflects any `localhost`/`127.0.0.1` origin on any port** (and `tauri://localhost`), and omits the header for a non-local origin | measured by M0.5 with curl against its own server; it is why the browser proof needed no proxy, and `docs/opencode-api.md`'s note is being corrected to say so |
| 2026-10-15 | **M0.5's liveness poll is a stand-in**: M2.1 deletes it and keeps the store (`check`/`reportFailure`) when the event stream brings its own idle watchdog | two detectors for one failure is how a reconnect loop is born; recorded on M2.1's row |
| 2026-10-15 | **A connect flow is required and no row owned it** → new **M1.7**: `settings.server` (url + password) with connect/disconnect states | spec 050's resolution order includes "a stored target" but spec 010 §Persistence defines no key, so that step returned absent forever |

## Blocked

Nothing yet. (A `blocked` row must name what blocks it and the date.)
