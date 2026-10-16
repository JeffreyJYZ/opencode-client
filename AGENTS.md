# AGENTS.md

Live repo: the opencode **desktop client** (Tauri 2 + React). Abandoned sibling `~/dev/apps/opencode-tauri-client-legacy` (GIVEN UP 2026-10-15) is read-only reference — never work there, never restore it, never port its app architecture. Repo-specific rules only; general rules live in `~/.config/opencode/AGENTS.md`.

## Docs — where intent and state live

- Specs `docs/specs/000-overview.md` … `060-plan.md`; **060 is the plan and the source of every task id** (`M0.1`, `M2.5`, …). A new spec takes the next free number; never renumber an existing one.
- Progress `docs/progress/000-status.md`, convention in `docs/progress/README.md`. **A landed task updates its row in the same turn, with the evidence the row names** — a claim is not evidence; an unrun task stays `doing`.
- Specs hold intent and acceptance; progress holds state. No status markers inside `docs/specs/`.
- The server API surface is `docs/opencode-api.md` (client methods, 132 routes, event names, payload traps). Check it before writing a call; never talk to a raw route when the pinned client exposes the method.
- An "open question" in a spec is resolved by editing it to `decided`, with the date — never by leaving both.

## Stack and gates

- **bun only**, never npm/pnpm. React 19 + Vite 8 + TS 6 + Tailwind 4 + zod; `@opencode/client` is the server seam. **The markdown stack (`marked` / `shiki` / `dompurify`) is not installed yet** — measured 2026-10-15: `rg -c 'marked|shiki|dompurify' package.json` returns 0, so the row that renders markdown adds them.
- **Biome** is the formatter and linter; the scaffold's ESLint deps and `lint` script are gone and must not come back in any form. Config `biome.json`: tabs, indentWidth 4, lineWidth 100, `ignoreUnknown`, vendored/generated paths excluded. `biome check` is a **writer** (`--write`): scope it to paths when another writer is in the tree.
- `bun run verify` = `tsc -b` + `biome check .` + `scripts/check-file-length.ts` + `cargo fmt --check` + `cargo check` + `bun test`, with **bun's own 5 s per-test bound** — deliberately no `--timeout`: a wall-clock-sensitive test is a defect to fix, not to hide behind a raised bound (M1.4c's picker `+`-flow was exactly that, and `bunfig.toml`'s `[test] timeout` is ignored by bun 1.4.3 anyway). `bun run e2e` = the scripted browser proof, **still landing** with `M0.1`, so proofs are run by hand until then. A gate that prints then proceeds anyway is not a gate; never put a measured number in a commit message.
- **`bun test`**: happy-dom's DOM globals come from `src/test/preload.ts` (bunfig `[test] preload`), and a preload runs **once per process** — every file in the run gets the DOM, so a test needing a real cross-origin `fetch` (happy-dom's is same-origin, `NetworkError`) cannot share the run, and no per-run switch works (`bun test -c <file>` reads the path as a test filter; `bun -c <file> test` exits 0 running nothing). `@/*` resolves for `bun test` from the **root** `tsconfig.json` only — bun does not follow project references, so the alias is repeated there and drift fails loudly. A component test that is not the suite's first RTL importer needs its own `afterEach(cleanup)`.
- Tailwind 4 is configured through the Vite plugin, not a PostCSS file, and themes are CSS custom properties — a class string is not a design decision, a token is.
- **Vite's `import.meta.env` define matches the expression textually**: behind a type cast (`(import.meta as X).env`) it stays undefined in dev, so a dev override read that way is silently absent — write the member expression directly. (`bun test`'s `import.meta.env` is a live view of `process.env`, so a dev-override reader *is* unit-testable by setting it.)

- **House tools, restated here because the global config does not reliably reach a subagent**: `rg` — never `grep` or `find`; `fd` — never `find`; `sd` over `sed`. Absolute paths with `workdir`, never a chained `cd`. (A free-tier run has burned turns on `grep`/`find`.)

## Work conventions

- **150-line cap on code and config files**, enforced by `scripts/check-file-length.ts` inside `bun run verify`. Over the cap means two responsibilities share one file: split along a seam, never truncate a function. Docs are exempt (a spec is split when it stops being skimmable, not at a line count). Excluded paths: build output, `node_modules`, the byte-identical vendored theme copies, and machine-generated artifacts — splitting those would break their diff or their generator.
- **Biome formats every change, always.** Run `bun run fix` (or `biome check --write <paths>`) before every commit; never hand-format; `verify` fails on an unformatted file. Biome is the only authority — no Prettier, no ESLint, no reliance on an editor's format-on-save.
- **Execution is subagent-driven.** One fresh implementer subagent per plan task, given a written brief (the task text verbatim, the interfaces it touches, the constraints) and required to write a report file; a task review (spec compliance *and* quality) after each task, before the next dispatch. The controller session makes rulings and keeps the ledger — it does not write the code. Never two writers on one file, and never two gate-running rounds in one tree — serialize anything that runs `bun run verify` or `bun run e2e` **inside a worktree**, because both read the whole tree. **Parallel work runs in separate worktrees** (the user's standing workflow from 2026-10-15): one per task area, picked so their file sets are disjoint — transcript rows vs shell chrome, prompt box and docks vs caps and scroll — each with its own gate round and its own proof port, merged when both land. The ban is on two writers in ONE tree, never on two trees; concurrency multiplies the bill, so the pairing is the controller's to choose deliberately. **The controller ticks the board row; briefs forbid implementer edits to `docs/`**, so a report saying "the row is still unticked" is conforming. **And a brief must never demand evidence a subagent cannot obtain** — no before-moment for a fresh run, no reliable count from a paginated list; ask for the isolation proof instead (all four XDG dirs redirected, ports freed, `agent-browser errors` empty), because a demand for the unobtainable is how a fabricated number gets written. **Edit this file in the worktree, never the main checkout** — the worktree's copy is what a subagent reads, and a change made in the checkout's tree silently does nothing for the branch (and conflicts later).
- **Pick the model per dispatch, deliberately**: cheap tier for mechanical or transcription work, standard for integration, most capable for the final whole-branch review. A dispatch with no model named inherits the session default — usually the most expensive — so always name one.
- **Two records, never mixed**: `docs/progress/` is the project status (committed, durable, one row per plan id); `.superpowers/sdd/<plan>/progress.md` is the execution ledger (git-ignored scratch and the recovery map after a context compaction). A landed task updates the board; the ledger is evidence for the loop, not for the reader.

## Never reintroduce

- A cell grid, a measured glyph advance driving layout, cell-snapped scrolling, glyph-drawn borders, a `ch`-sized pane.
- The TUI screen comparator, or any gate whose input is a screenshot diff against the TUI.
- `effect`, `solid-js`, ESLint, Prettier, a vendored copy of the TUI's component tree, monospace as the UI default.
- These were the previous build's cost, not its value (see 060 "Ground rules").

## Source conventions

- `src/` by role: `app/` (shell, router, nav), `pages/`, `session/` (client wiring, event store, rows), `plugins/` (host), `theme/`, `components/`, `constants/`, `docs/` (generated API reference).
- `@/*` → `src/*` via tsconfig `paths` (no `baseUrl`); tsconfig stays strict.
- **Every constant lives in `src/constants/` (or its domain module) and is used by name** — never a literal in a component, a test, or a doc's example code.
- Dark-first with both themes defined; tokens are three layers in `src/theme/tokens.css`; no raw hex in a component; the vendored opencode theme documents are copied byte-identical from the mirror and excluded from Biome.
- Fonts: interface = bundled **Geist** (OFL), code = the machine's **`GeistMono Nerd Font`** (brew cask `font-geist-mono-nerd-font`) with bundled `Geist Mono` as fallback; both roles resolve through `--oc-font-ui` / `--oc-font-code`, never a family literal in a component. A family is offered **by the name the webview resolves**, proven by measuring an **icon-range advance** (`U+E0B0`), not `"0"` — the two mono cuts differ by 0.001 on `"0"` (`60.000` vs `59.999`) but by 10 on the icon (`60` vs `50`), so `"0"` cannot separate them; `document.fonts.check()` is not decisive and file names lie (`GeistMonoNerdFontMono-*.otf` is the family `GeistMono Nerd Font Mono`).
- The vendored mirror `/Users/jyz/dev/monorepos/opencode` is **read-only**: read and copy out, never write, install or build inside.
- One typed seam per server call (`src/session/actions.ts`); payloads go out **flat** even where the generated input type wraps them in a codegen artifact, and the cast is commented.

## Plugin rules

- A plugin is one **pre-built ESM** plus `plugin.json`, loaded full-trust **in-process**, off by default (`pluginsEnabled`). `apiVersion` major mismatch is refused; minor warns.
- Capabilities (`plugin-data`, `net`, `window`, `shortcuts`, `invoke`, `fs-any`) are **consent labels**, not a boundary: only `plugin-data` is enforced, by path scoping in Rust `safe_id` — keep that allowlist in step with `PLUGIN_ID_PATTERN` in the manifest schema. Never call them a sandbox.
- The built entry file must import nothing: `react`/`react/jsx-runtime` are rewritten onto the host globals `__ocHost` / `__ocReact` / `__ocJsx`; the build script fails on any surviving bare specifier.
- An installed plugin's source is imported from a `Blob` — the **production** path — so a plugin cannot be exercised under `vite dev`: the loop is build → install → `bun run preview`.
- Built-ins register through the same host API as plugins; only two areas are locked (`app.substrate`, `app.builtins`). A refused contribution is inert plus a logged `PluginFault` — never a throw, never a broken app.
- Reload is two-phase: import and validate the new source, then dispose the old instance, then run the new `setup`.
- The plugin manager is a **settings section**, not a route.

## Tauri shell

- The window is created in Rust `setup` (`tauri.conf.json` has `app.windows: []`) because only `WebviewWindowBuilder` can carry an `initialization_script`, which injects `window.__OC_TARGET__ = { url, password }` from env vars else `~/.local/state/opencode/service.json`. That global wins over every other target source.
- A webview's origin is `tauri://localhost`, not the server, and its `localStorage` is separate from the browser's — the target must be handed to the page; the server still allowlists the origin in CORS.
- **A UI change is not in the window until the artifact is rebuilt.** `bun tauri dev` serves live source; a built `opencode.app` embeds `dist` from build time, and Tauri **compresses the frontend into the binary**, so `rg -a` on the executable proves nothing — check `dist/assets/*.js` timestamps against the bundle's.
- **A CSP `<meta>` is enforced only as a child of `<head>`** (measured in WebKit by M2.0): at document start `head` does not exist yet, and an element appended to the document element lands as its **sibling**, which WebKit ignores — `eval` still ran and a foreign fetch reached its listener; `document.write` before the parser starts *empties the document* instead. So the policy is applied as soon as `head` exists, and a CSP violation's prose lives in the Web Inspector only (WebKit does not forward it to the page's `console`) — the honest evidence is the engine's own `SecurityPolicyViolationEvent` (`disposition`, `blockedURI`, `originalPolicy`).

## The machine's opencode server

- The registered service (`~/.local/state/opencode/service.json`) hosts the human's live sessions: **read-only**. Never prompt into its sessions, never restart or stop it.
- Any automated or browser proof runs **its own** server with **all four** XDG dirs redirected (`XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`) — sessions live under `XDG_DATA_HOME`, so redirecting state alone still writes the real database. **A proof that prompts a real model can start an agent inside this repo**: M2.1's did — the isolated server's free model read the worktree (read-only) and spawned its own server, caught by PID and port. Seed such a session with `{resume:false}` or point the server at a throwaway directory, and sweep for stray servers in the same turn.
- Traps that already cost time (full list in `docs/opencode-api.md`): `session.prompt` is flat; root sessions need `parentID: null`; permissions reply `decision: "once" | "always" | "reject"`; a tool part's anchor is `path`, not `filePath`; `vcs.get()` resolves the branch asynchronously; `command.list()` loads asynchronously; an `mcp.servers` config block never reaches a location on 2.0.29; `session.shell.ended` is paged (`output.output`); the event stream carries **every** session and is volatile by contract — filter on ingest and repair gaps by refetch, never replay.
