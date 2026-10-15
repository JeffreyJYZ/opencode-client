# Status board

Last updated: 2026-10-15 · Current focus: **M0 — Foundations** (`M0.6` done, `M0.1` nearly — the `e2e` script waits on M2)

| Milestone | Done / total | Gate |
| --- | --- | --- |
| M0 Foundations | 1 / 6 | `bun run verify`; `bun tauri dev` opens a window naming the server |
| M1 Shell and home | 0 / 6 | home → session view end to end; restart restores tabs |
| M2 Session view | 0 / 9 | a live session streams, interrupts, queues and replies from the keyboard |
| M3 Type and theme | 0 / 5 | both faces change live and survive a restart; theme applies and clears |
| M4 Plugin host 0.1 | 0 / 8 | four example plugins install, work and uninstall through the documented API |
| M5 Desktop polish | 0 / 5 | packaged app, updater, `verify-release` exits 0 |

## M0 — Foundations

- [ ] `M0.1` Repo hygiene: `verify`/`lint`/`fix`/`e2e` scripts, Biome config, ESLint removed, strict tsconfig + `@/*` alias — evidence: `bun run verify` green on the scaffold — **doing**: ESLint deps (5) and the `lint: eslint .` script removed, `@biomejs/biome` **2.5.15** installed as the only formatter/linter with `biome.json` (tabs, indentWidth 4, lineWidth 100), `strict` + `@/*` in both tsconfigs mirrored by the Vite alias, `bun run verify` exits 0 (`Checked 11 files`), the 150-line gate (`scripts/check-file-length.ts`) is wired into `verify`, and `.superpowers/` is ignored; remaining: the `e2e` script, which lands with M2's browser proof
- [ ] `M0.2` Tauri 2 shell: Rust `setup` window + `initialization_script` injecting `__OC_TARGET__`, `bundle.targets: ["app"]`, window state — evidence: `bun tauri dev` window names the connected server
- [ ] `M0.3` Tokens + theme baseline: `tokens.css` three layers, vendored theme documents byte-identical, dark + light — evidence: diff against the mirror shows only the header comment
- [ ] `M0.4` App skeleton: router (`home`, `session/:id`, `settings`), providers, slot registry + `<Slot>` — evidence: routes navigate; an empty slot renders nothing with no warning
- [ ] `M0.5` opencode client provider + offline state — evidence: kill the server → banner with the url; restart → recovers
- [x] `M0.6` Repository under git: `git init`, `.gitignore` verified, one initial commit of the scaffold + docs — evidence: `ebf7280` on `main`, 26 files, `git status --short` empty — **done**

## M1 — Shell and home

- [ ] `M1.1` Top nav: tabs (sessions + settings), status dots, close/reorder/overflow, ⌘1…⌘9, ⌘W, ⌘T — evidence: two sessions + settings open, switch and close both ways
- [ ] `M1.2` Home: recents (root sessions, day-grouped, location per row), empty state naming the server — evidence: list matches `session.list({ parentID: null })`
- [ ] `M1.3` New session: directory picker + recent-dir chips → `session.create()` → open it — evidence: created in a picked dir, appears in recents
- [ ] `M1.4` Session picker `⌕`: all root sessions, search, keyboard — evidence: opens a session older than the first page
- [ ] `M1.5` Persistence: versioned settings blob + forward-only migrations (tabs incl. settings, last route, sidebar, fonts, recent dirs) — evidence: restart restores both
- [ ] `M1.6` Command palette + keymap registry — evidence: ⌘K lists sessions, commands, settings sections and open tabs

## M2 — Session view

- [ ] `M2.1` Event ingest: single subscription, `accept` filter, per-session reducer, resync policy — evidence: two sessions stream at once; killed server resumes with no duplicate rows
- [ ] `M2.2` Transcript rows: user band (queued/sent rail), prose, reasoning, tool, subagent, shell, error, per-prompt footer — evidence: each row renders from a seeded session
- [ ] `M2.3` Markdown + highlighting: position keys, debounced memoised highlight, language cap — evidence: a fence streamed in many deltas highlights once
- [ ] `M2.4` Ingest/render caps + index-scan counting — evidence: long output collapses with the right `(N more lines)`
- [ ] `M2.5` Prompt box: identity controls, send/interrupt, queued state, attachments, `@` mentions, slash menu (client ∪ server) — evidence: a server command inserts `/<name> ` and sends nothing
- [ ] `M2.6` Docks: permission (`once`/`always`/`reject`) + question form — evidence: both replied from the keyboard only
- [ ] `M2.7` Sidebar panels: Session, Context, Subagents, MCP, Files; ⌘B; drag-resize; persisted — evidence: figures match `session.stats` / `vcs.status`
- [ ] `M2.8` Statusline: location + branch (bounded retry), subagents, tokens, spend, contextual hints — evidence: branch appears after the location resolves
- [ ] `M2.9` Scroll: tail-follow, unpin, jump-to-latest, per-tab memory — evidence: scroll position survives a tab switch

## M3 — Type and theme

- [ ] `M3.1` Bundle Geist + Geist Mono (OFL); code default `GeistMono Nerd Font` by family name (brew cask) with bundled `Geist Mono` as fallback; wire `--oc-font-ui` / `--oc-font-code` + sizes — evidence: fresh install renders UI in Geist and code in `GeistMono Nerd Font`; with the cask removed, code falls back to `Geist Mono`
- [ ] `M3.2` Font settings section (both roles, live sample, reset, persisted) — evidence: change both, restart, still applied
- [ ] `M3.3` Face picker: bundled + machine families by resolved name + generics; misspelt refused — evidence: a misspelt family cannot be selected
- [ ] `M3.4` Theme service: one `<style>` + `data-theme`, dark/light built-ins, plugin themes, fonts win — evidence: apply/clear a theme, fonts unchanged
- [ ] `M3.5` Settings tab sections (Appearance, Typography, Server, Plugins) + plugin sections — evidence: every section keyboard reachable

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
- [ ] `M5.2` Native integrations: open-in-editor, clipboard + toast, unfocused turn-end notification, drag-drop attach — evidence: each fires from a real interaction
- [ ] `M5.3` Window state restore, menu bar, version display — evidence: restart restores size and position
- [ ] `M5.4` Tauri updater + committed `verify-release` — evidence: `bun scripts/verify-release.ts <tag>` prints one verdict line, exits non-zero on a gap
- [ ] `M5.5` Packaging: macOS `app` bundle + README install steps — evidence: `bun tauri build` produces a runnable app

## Decisions log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-10-15 | Interface font default is **Geist** (bundled, OFL); **code face default is `GeistMono Nerd Font`** — the brew cask `font-geist-mono-nerd-font` (3.5.1 here), offered by family name with bundled `Geist Mono` as the offline fallback | user instruction; the Nerd Font cut carries the box-drawing/icon glyphs the row vocabulary uses, and a distributed app cannot bundle it |
| 2026-10-15 | **Plugins are a settings section**, not a route | the sketch's shell: settings is where configuration lives |
| 2026-10-15 | **Settings is a tab** in the top nav (gear / ⌘, / palette), closeable and reopenable | user instruction; keeps one navigation model for views |
| 2026-10-15 | **ESLint removed entirely; Biome 2.5.15 is the only formatter and linter** (`biome.json`: tabs, indentWidth 4, lineWidth 100, `ignoreUnknown`, vendored/generated paths excluded). `bun run verify` = `tsc -b && biome check .` | house rule (one tool); the scaffold's ESLint deps and `lint` script were template leftovers |
| 2026-10-15 | **150-line cap on code and config files**, enforced by `scripts/check-file-length.ts` in `bun run verify`; docs exempt | user instruction; a file past the cap is two responsibilities in one file (and unreadable in one pass) |
| 2026-10-15 | **Execution is subagent-driven** — one fresh implementer per plan task with a written brief, a spec+quality review after each, controller rules and keeps the ledger, no two writers on a file | user instruction; matches the plan's parallelism rules and keeps the controller's context for rulings |
| 2026-10-15 | **Biome formats every change, always** — `bun run fix` before each commit, `verify` fails on unformatted code | user instruction; one formatter, no editor assumptions |
| 2026-10-15 | **TUI-structural, not a replica**: no cell grid, no comparator, no glyph borders | the sketch asks for a similar structure with desktop UX |
| 2026-10-15 | **Ordering: vertical slices, logic first inside each** — every milestone ships a surface *with* its real data; the two logic-only tasks are front-loaded (M0.5 client provider before any page, M2.1 event ingest before any transcript row); mock data only in unit fixtures and seeded browser proofs | confirmed by the user; a UI-first phase runs ahead of the transcript model and the layout then keeps being re-derived from a moving shape (the previous build's cost) |
| 2026-10-15 | **No `effect`** in the plugin API — Promise + subscriptions + `AbortSignal` | `ai-client-oss`'s host ships no Effect runner and pushes that cost onto plugin authors |
| 2026-10-15 | The previous build at `~/dev/apps/opencode-tauri-client-legacy` is abandoned: read for facts, never restore or copy code | user instruction; its specs describe a build that no longer exists |

## Blocked

Nothing yet. (A `blocked` row must name what blocks it and the date.)
