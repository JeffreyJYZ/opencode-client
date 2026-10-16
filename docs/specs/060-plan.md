# 060 — Implementation plan

Build order for specs [000](000-overview.md)–[050](050-opencode-integration.md). Every task has an id; [`docs/progress/`](../progress/README.md) tracks each id, and no id is `done` without the evidence named in its row.

## Ground rules

- **bun only**, never npm/pnpm. **Biome** formats and lints; the scaffold's ESLint scripts are replaced, not kept alongside.
- **`bun run verify` is the gate**: `tsc -b` + `biome check .` + `scripts/check-file-length.ts` + `cargo check --manifest-path src-tauri/Cargo.toml` + `bun test` (the last two arrive with M0.2b and M0.4). A layout- or text-affecting change additionally runs `bun run e2e` (landing with M2's browser proof), which spawns its **own isolated server** with all four XDG dirs redirected — never the registered service.
- **One writer per file.** Parallel workstreams are split by file ownership; anything that runs `bun run verify` or `bun run e2e` is serialised, because the whole tree is the input.
- **Every task is dispatched to a subagent** with a written brief and a report file, then reviewed per task (spec + quality) before the next dispatch — see `AGENTS.md` §Work conventions. The controller session rules on ambiguity, keeps the ledger, and does not write the code.
- **No code or config file over 150 lines**; `scripts/check-file-length.ts` fails `bun run verify` past the cap. Biome formats every change.
- **Do not reintroduce** (they were the previous build's cost, not its value): a cell grid or any layout derived from a measured glyph advance, the TUI screen comparator, glyph-drawn borders, a `ch`-based pane, ESLint/Prettier, `effect`, `solid-js`, or a vendored copy of the TUI's component tree.
- **Every constant lives in `src/constants/`** and is used by name: no literal in a component, a test or a doc's example.
- Naming: `--oc-*` for CSS variables, `SETTING_KEYS.*` for persisted keys, `<DOMAIN>_MAX_CHARS` / `_MS` / `_CELLS` for limits.

## Constants to create up front

| Constant | Home | Value (start) |
| --- | --- | --- |
| `PAYLOAD_MAX_CHARS` / `PAYLOAD_ELISION` | `src/session/collapse.ts` | 50 000 / `"\n…\n"` |
| `TOOL_CONTENT_MAX_CHARS` | same | 2 000 |
| `HIGHLIGHT_DEBOUNCE_MS` | `src/session/markdown.ts` | 80 |
| `SESSION_PAGE_LIMIT` | `src/constants/sessions.ts` | 50 |
| `BRANCH_READ_ATTEMPTS` / `BRANCH_READ_RETRY_MS` | `src/session/actions.ts` | 6 / 120 |
| `PLUGIN_DATA_MAX_BYTES` | `src/constants/plugins.ts` | 256 KiB |
| `SIDEBAR_MIN_WIDTH` / `SIDEBAR_DEFAULT_WIDTH` | `src/constants/layout.ts` | 280 / 340 |
| `HOST_API_VERSION` | `src/constants/plugins.ts` | `0.1` |
| `INTERFACE_FONT_DEFAULT` / `CODE_FONT_DEFAULT` + their fallback stacks | `src/constants/fonts.ts` | `Geist` / `GeistMono Nerd Font` → `Geist Mono` → `ui-monospace, …` |

## Ordering — vertical slices, logic first inside each

- **No UI phase followed by a wiring phase.** Each milestone finishes a surface *and* the real data behind it: a task that renders something names the server call or the store it reads in its evidence column, so "looks right" is never the acceptance.
- **Inside a slice, the data path lands first.** The two tasks that exist only to wire logic are front-loaded on purpose — **M0.5** (client provider, target, offline state) before any page, **M2.1** (single subscription, `accept` filter, per-session reducer, resync policy) before any transcript row.
- **Mock data is allowed in exactly two places**: a component's own unit fixture, and the seeded session a browser proof builds against its isolated server (`session.prompt({ resume: false })` fills a transcript with no model). Never as a stand-in for the app's own data path.
- **Why**: the previous build's cost was visual work that ran ahead of the data model, so the layout kept being re-derived from a moving transcript shape. A vertical slice makes the shape settle before anything is styled against it, and it keeps every milestone demonstrable end to end.
- The one deliberate exception is M3 (type and theme): it is a cross-cutting layer whose tasks are inherently visual, so its acceptance is behavioural (change it, restart, still applied) rather than data-driven.

## Milestones

### M0 — Foundations

| id | Task | Evidence |
| --- | --- | --- |
| M0.1 | Repo hygiene: the `verify` / `fix` scripts + Biome config (tabs, indent 4); ESLint deleted; `.DS_Store` ignored; tsconfig `strict` + `@/*` alias; the 150-line gate wired into `verify` | `bun run verify` green on the scaffold; the `e2e` script lands with M2 |
| M0.2 | Tauri 2 shell: window built in Rust `setup` with an `initialization_script` that injects `window.__OC_TARGET__` (env → `service.json`), `bundle.targets: ["app"]`, window state plugin | the window opens and `window.__OC_TARGET__` carries the resolved url; **naming the server on screen is M0.5's job**, not this task's |
| M0.2b | M0.2 follow-ups (gap found by the implementer's report, confirmed by the review — all one-liners in one file set): (1) honour `XDG_STATE_HOME` and the channel-suffixed `service-<channel>.json`, unit-tested with `cargo test`; (2) a **navigation guard** — the init script re-runs on every main-frame load, so no foreign origin may receive it (`on_navigation` allowlist); (3) drop `Target`'s unused derives and redact its `Debug`; (4) drop the unused `window-state:default` page grant (least privilege); (5) `/gen/` in `.gitignore` too, matching the gate; (6) `verify` gains `cargo check`, and the stale `lint` script goes; (7) dev port 5173 → 1420 so `bun tauri dev` starts beside the main checkout; (8) inject the trimmed url | `cargo test` output quoted; `cargo check` inside `bun run verify`; the guard's predicate unit-tested **and** the app still loading through it; a non-default `XDG_STATE_HOME` and a `service-local.json` both resolve |
| M0.2c | Guard and constant tightening from M0.2b's review, all micro: (1) the production arm pins the **host** — `tauri://localhost`, not any `tauri://` authority — with a refusal case (`tauri://evil/index.html`) in both dev modes; (2) a test asserting the config's `devUrl` and the shell's `DEV_PORT` agree, since a drift is silent (the guard refuses the app's own document and the window is blank); (3) an attack-string test for the injected literal (`U+2028`/`U+2029`, the one named gap in "cannot escape the JSON literal") — escape them if WebKit does not tolerate them; (4) the pure edges the brief named but nothing covers: an mtime tie, and an empty state-home variable falling back to home; (5) one line naming the dev-only residual risk (in a dev build whatever owns `localhost:1420` is trusted) | `cargo test` output quoted; `tauri://evil/index.html` refused; the drift assertion fails when either side changes |
| M0.3 | Tokens + theme baseline: `src/theme/tokens.css` (primitive → semantic → component), the v2 opencode theme document vendored **byte-identical** into `src/theme/vendor/`, dark + light | `cmp`/`shasum` equal against `packages/tui/src/theme/assets/v2/opencode.json` (provenance in `src/theme/vendor/README.md` — JSON takes no comment, so the plan's "only the header comment" is settled that way); every semantic token defined in both variants |
| M0.4 | App skeleton: router (`home`, `session/:id`, `settings`), providers, slot registry + `<Slot>`, empty states | routes navigate; an empty slot renders nothing without warnings |
| M0.4b | Registry hardening from M0.4's review (micro, free model): (1) a **non-function component** is a malformed entry and must be refused + faulted — today a truthy non-component is accepted and fails at render, which spec 040 forbids ("never breaks the app"); (2) a registered route may **not replace a built-in path**; it serves unknown paths only, since `/settings` is the route to the plugin manager; (3) a comment pinning `homeRoute()`'s identity contract. The registry split is **not** here — that is M4.3's (the file is at 144/150) | tests for both refusals, `bun test` output quoted |
| M0.5 | opencode client provider: `OpenCode.make`, target resolution, offline state + banner, `useClient` (the session list lands in M1.2, where it has a consumer) | kill the server → banner with the url; restart → recovers |
| M0.6 | The repository under git: `git init`, `.gitignore` verified (build output, scratch, `.DS_Store`), one initial commit of the scaffold + docs, and the SDD scratch dir ignored | `git log --oneline -1` exists and `git status --short` is clean |

### M1 — Shell and home

| id | Task | Evidence |
| --- | --- | --- |
| M1.1 | Top nav: tab strip (open sessions, plus the settings view while it is open), status dot from `session.active()` (the plan row originally said `session.execution.*`, which is an **event** name, not a client method — M1.1's review caught it), close/reorder/overflow, ⌘1…⌘9, ⌘W, ⌘T | two sessions open, switch and close both ways |
| M1.2 | Home: recents (root sessions, day-grouped by `time.updated`, location per row), empty state naming the server, and it owns the first `useSessions` | list matches `session.list({ parentID: null })` |
| M1.3 | New session: native directory picker + recent-directory chips → `session.create()` → open the session view | create in a picked dir, session appears in recents |
| M1.4 | Session picker `⌕`: all root sessions, search, keyboard driven | opens any recent session past the first page |
| M1.5 | Persistence: `dataVersion` blob + forward-only migrations for tabs (M1.1 already shipped `serializeTabState`/`hydrateTabState` shaped for the `settings.tabs` cell), last route, sidebar, fonts, recent dirs | restart restores the tab set and the route |
| M1.6 | Command palette + keymap registry, one constants table | ⌘K lists sessions, commands and settings sections |

### M2 — Session view

| id | Task | Evidence |
| --- | --- | --- |
| M1.7 | Connect flow: a stored server target in the settings blob (`settings.server`: url + password) with connect/disconnect states, so a build not served by its own server has somewhere to point — the "stored target" step of spec 050's resolution order has no key until this exists | a wrong url shows the offline banner with a retry; a correct one connects; the target survives a restart |
| M2.0 | Content-Security-Policy on the webview: `default-src 'self'` for the bundled assets plus a `connect-src` limited to the resolved server origin — the target is resolved *before* the window is created, so the policy is assembled with it. Relax a directive only with the reason stated in the brief | a script injected into the page cannot reach a third-party origin, and the app's own calls to the server still work |
| M2.1 | Event ingest: single subscription, `accept` filter, per-session reducer, offline/resync policy | two sessions stream at once; a killed server resumes without duplicates; it also **absorbs M0.5's liveness poll** (the stream's idle watchdog supersedes it — delete the poll, keep the store's `check`/`reportFailure`); it also deletes M1.1's `startActivityPolling` (the 5 s status-dot poll) for the same reason |
| M2.2 | Transcript rows: user band (queued/sent rail), prose, reasoning (expandable while streaming), tool, subagent, shell, error, per-prompt footer | each row renders from a seeded session |
| M2.3 | Markdown + highlighting: marked + shiki + dompurify, position-keyed blocks, debounced memoised highlight, language cap, and **external links go through the OS handler — never a webview navigation** (the shell refuses those anyway, M0.2b) | a fence streamed in many deltas highlights once, and clicking a link does not change the page's origin |
| M2.4 | Ingest + render caps and index-scan counting | a long tool output collapses with the right `(N more lines)` |
| M2.5 | Prompt box: auto-grow textarea, identity line controls (agent/model/thinking), send/interrupt, queued state, attachments, `@` mentions, slash menu (client ∪ server commands) | a server command inserts `/<name> ` and sends nothing |
| M2.6 | Docks: permission (`once`/`always`/`reject`) and question form (tabs, `Field N of M`, review step) taking the composer's slot | reply each kind from the keyboard |
| M2.7 | Sidebar: Session, Context, Subagents, MCP, Files panels; ⌘B; drag-resize; persisted width | panels match `session.stats` / `vcs.status` |
| M2.8 | Statusline: location + branch (bounded retry), subagents, tokens, spend, contextual hints; clickable segments | branch appears after the location resolves |
| M2.9 | Scroll: tail-follow, unpin on scroll-up, jump-to-latest pill, per-tab scroll/expansion memory | scroll position survives a tab switch |

### M3 — Type and theme

| id | Task | Evidence |
| --- | --- | --- |
| M3.0 | **The root theme and the home hierarchy** — one `src/theme/base.css` (reset + `--oc-font-ui`/size + `--oc-surface` background + the code-face rule for M2.2), the 17 inline font copies deleted, guard tests against a new inline font, **and the first real hierarchy pass on the home surface** (content column, three visible levels, clickable rows with hover/focus, rhythm from the spacing tokens). Lands **before M1.4** on purpose: the running app is a **white page with dark pills and serif headings** because nothing applies the theme at the root | computed values from a browser: `body` background resolves dark, an `h2`/day label/row title/two controls report the interface stack (never `Times`), a row title size and weight differ from its metadata, the column has a max width; one screenshot at 1280 and one at 800 px; zero inline font declarations outside the theme layer. **Plus the app mark**, added by the controller while the task was being briefed: the nav's wordmark renders in opencode's own face, vendored byte-identical from `~/dev/fonts/opencode/opencode.otf` (family `OpenCode`, no license file accompanies it — personal build only), declared under a family name of this app's own and exposed as `--oc-font-mark`, used for nothing else — evidence: `document.fonts` reports that face **loaded** and its advance width differs from the interface face (a resolved face, not a declared stack), and the vendored file's `cmp` and `sha256` match its source |
| M3.1 | Bundle Geist + Geist Mono (OFL); default the code face to the installed **`GeistMono Nerd Font`** (brew cask, by family name) with bundled `Geist Mono` as the offline fallback; wire `--oc-font-ui` / `--oc-font-code` + sizes | fresh install renders UI in Geist and code in `GeistMono Nerd Font`; with the cask removed, code falls back to `Geist Mono` |
| M3.2 | Font settings section: interface face/size, code face/size, live sample, reset, persisted | change both faces, restart, still applied |
| M3.3 | Face picker: bundled faces + machine families by resolved name (both Nerd Font cuts and `GeistMono Nerd Font Mono`, aliases matched) + CSS generics; misspelt families refused (measure the `"0"` advance) | a misspelt family cannot be selected; the Nerd Font families are offered by their canonical names |
| M3.4 | Theme service: one `<style>` + `data-theme`, built-in dark/light in the registry, plugin themes; fonts win over a theme | apply/clear a theme; fonts unchanged |
| M3.5 | Settings **surface**: a view that renders as a tab *while it is open* — never an entry of its own in the nav — with sections from a registry: Appearance, Typography, Server, Plugins, plus plugin-contributed ones. Four entries: nav gear, ⌘,, the home page button, the palette. The Plugins section is registered here so M4.5 needs no settings change | the section registry exists, not a hardcoded list; **no settings tab is in the strip while it is closed**; every section keyboard reachable |

### M4 — Plugin host `0.1`

| id | Task | Evidence |
| --- | --- | --- |
| M4.1 | Manifest schema + id allowlist (Rust `safe_id` in step), `engines.app`, `apiVersion` checks | a bad id or unknown capability fails at install |
| M4.2 | Loader: blob import, globals (`__ocHost`/`__ocReact`/`__ocJsx`), two-phase reload, dispose order, `PluginFault` log | disabling `hello-world` clears its slot and marker |
| M4.3 | Registries + slots (**splits `src/plugins/registry.ts` — validation out from storage — before extending it: the file is at 144/150 lines**) : `ui`, `commands`, `panels`, `routes`, `settings`, `renderers`, `themes`; inert-on-refusal | an unknown slot logs a fault and renders nothing |
| M4.4 | Services: `opencode.client`/`on`, `transcript.snapshot`, `storage` (with `PLUGIN_DATA_MAX_BYTES`), `native` (path-scoped), `notify`, `log`, `signal`, `version` | a plugin writes and re-reads its own data dir only |
| M4.5 | Plugin manager as a **settings section**: enable/disable/reload/uninstall, versions, capabilities, faults, log | the section is always present and cannot be disabled |
| M4.6 | `scripts/build-plugins.ts` → `public/plugins/<id>/main.js`, bare-specifier check, react rewritten to globals | the build fails on a surviving bare import |
| M4.7 | Four example plugins: `hello-world`, `theme-gruvbox`, `session-export`, `context-meter` | each installs, works, and uninstalls cleanly |
| M4.8 | In-app API reference generated from the SDK types + slot table | the reference lists every registry and slot in code |

### M5 — Desktop polish

| id | Task | Evidence |
| --- | --- | --- |
| M5.1 | Context menus on tabs, recents, transcript rows, panels | each menu action works by keyboard |
| M5.2 | Native integrations: open-in-editor, clipboard + toast, unfocused turn-end notification, drag-drop attach | each fires from a real interaction |
| M5.3 | Window state restore, menu bar (File/View/Help), app version in Settings | restart restores size and position |
| M5.4 | Tauri updater on the desktop build + a committed `verify-release` script that polls the release and exits non-zero on any gap | `bun scripts/verify-release.ts <tag>` prints one verdict line |
| M5.5 | Packaging: macOS app (bundle target `app`), README install steps | `bun tauri build` produces a runnable app |

### M6 — Later (not scheduled here)

Virtualised transcript for very long sessions · a PTY/terminal surface · multi-window · light-mode audit across plugin UI · plugin API `0.2`.

## Parallelism

- M0 is a single writer (shared config).
- After M0: **nav/home (M1)** and **session view (M2)** touch disjoint files and can run concurrently; M3 (type/theme) also starts then, but owns `src/theme/**` and `src/components/**` primitives exclusively.
- M4 starts once M0.4 (slots) and M2 (a transcript to snapshot) exist; it owns `src/plugins/**`, `plugins/**` and `scripts/build-plugins.ts`.
- Any two workstreams must not both run `bun run verify`/`e2e` at the same moment.

## Risk register

| Risk | Mitigation |
| --- | --- |
| Fidelity work drifts back into cell-grid/pixel-chasing | 000's non-goals and the "do not reintroduce" list are gate items; a reviewer checks layout changes for measured-advance dependencies |
| A proportional face breaks alignment in mono surfaces | mono surfaces own their own font/size; a test renders a table and a tool row at both faces |
| Plugin API churn while built-ins still move | built-ins register through the same API from M4.1; the example plugins are the compatibility test |
| Reconnect/refetch duplicating rows | resync policy in 050 + an acceptance test that kills the server mid-turn |
| The dev server cannot exercise an installed plugin | the plugin gate is `bun run build && bun run preview`, stated in 040 and the plugin README |
| Unbounded payloads from a large tool output | ingest caps + a test with a multi-megabyte output |

## Definition of done

- `bun run verify` and `bun run e2e` green; every acceptance list in 010/020/030/040/050 demonstrably passes.
- The app is complete and usable with plugins disabled, and the four example plugins work through the documented API only.
- No non-goal from 000 has crept in: a reviewer can point at the layout code and show that nothing measures a glyph.
- `docs/progress/` holds a status for every task id, each `done` row carrying the command or artifact that proves it.
