# AGENTS.md

Live repo: the opencode **desktop client** (Tauri 2 + React). Abandoned sibling `~/dev/apps/opencode-tauri-client-legacy` (GIVEN UP 2026-10-15) is read-only reference — never work there, never restore it, never port its app architecture. Repo-specific rules only; general rules live in `~/.config/opencode/AGENTS.md`.

## Docs — where intent and state live

- Specs `docs/specs/000-overview.md` … `060-plan.md`; **060 is the plan and the source of every task id** (`M0.1`, `M2.5`, …). A new spec takes the next free number; never renumber an existing one.
- Progress `docs/progress/000-status.md`, convention in `docs/progress/README.md`. **A landed task updates its row in the same turn, with the evidence the row names** — a claim is not evidence; an unrun task stays `doing`.
- Specs hold intent and acceptance; progress holds state. No status markers inside `docs/specs/`.
- The server API surface is `docs/opencode-api.md` (client methods, 132 routes, event names, payload traps). Check it before writing a call; never talk to a raw route when the pinned client exposes the method.
- An "open question" in a spec is resolved by editing it to `decided`, with the date — never by leaving both.

## Stack and gates

- **bun only**, never npm/pnpm. React 19 + Vite 8 + TS 6 + Tailwind 4 + zod + `marked`/`shiki`/`dompurify`; `@opencode/client` is the server seam.
- **Biome** is the formatter and linter; the scaffold's ESLint deps and `lint` script are gone and must not come back in any form. Config `biome.json`: tabs, indentWidth 4, lineWidth 100, `ignoreUnknown`, vendored/generated paths excluded. `biome check` is a **writer** (`--write`): scope it to paths when another writer is in the tree.
- `bun run verify` = `tsc -b` + `biome check .` + `scripts/check-file-length.ts` + `cargo check --manifest-path src-tauri/Cargo.toml` + `bun test`. `bun run e2e` = the scripted browser proof, landing with M2. A gate that prints then proceeds anyway is not a gate; never put a measured number in a commit message.
- DOM-less tests run **without** the happy-dom preload; happy-dom's `fetch` is same-origin, so a real cross-origin call dies `NetworkError`. A component test that is not the suite's first RTL importer needs its own `afterEach(cleanup)`.
- Tailwind 4 is configured through the Vite plugin, not a PostCSS file, and themes are CSS custom properties — a class string is not a design decision, a token is.

## Work conventions

- **150-line cap on code and config files**, enforced by `scripts/check-file-length.ts` inside `bun run verify`. Over the cap means two responsibilities share one file: split along a seam, never truncate a function. Docs are exempt (a spec is split when it stops being skimmable, not at a line count). Excluded paths: build output, `node_modules`, the byte-identical vendored theme copies, and machine-generated artifacts — splitting those would break their diff or their generator.
- **Biome formats every change, always.** Run `bun run fix` (or `biome check --write <paths>`) before every commit; never hand-format; `verify` fails on an unformatted file. Biome is the only authority — no Prettier, no ESLint, no reliance on an editor's format-on-save.
- **Execution is subagent-driven.** One fresh implementer subagent per plan task, given a written brief (the task text verbatim, the interfaces it touches, the constraints) and required to write a report file; a task review (spec compliance *and* quality) after each task, before the next dispatch. The controller session makes rulings and keeps the ledger — it does not write the code. Never dispatch two implementers in parallel, never two on one file, and serialize anything that runs `bun run verify` or `bun run e2e`, because both read the whole tree.
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
- Fonts: interface = bundled **Geist** (OFL), code = the machine's **`GeistMono Nerd Font`** (brew cask `font-geist-mono-nerd-font`) with bundled `Geist Mono` as fallback; both roles resolve through `--oc-font-ui` / `--oc-font-code`, never a family literal in a component. A family is offered **by the name the webview resolves**, proven by measuring the `"0"` advance — `document.fonts.check()` is not decisive and file names lie (`GeistMonoNerdFontMono-*.otf` is the family `GeistMono Nerd Font Mono`).
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

## The machine's opencode server

- The registered service (`~/.local/state/opencode/service.json`) hosts the human's live sessions: **read-only**. Never prompt into its sessions, never restart or stop it.
- Any automated or browser proof runs **its own** server with **all four** XDG dirs redirected (`XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`) — sessions live under `XDG_DATA_HOME`, so redirecting state alone still writes the real database.
- Traps that already cost time (full list in `docs/opencode-api.md`): `session.prompt` is flat; root sessions need `parentID: null`; permissions reply `decision: "once" | "always" | "reject"`; a tool part's anchor is `path`, not `filePath`; `vcs.get()` resolves the branch asynchronously; `command.list()` loads asynchronously; an `mcp.servers` config block never reaches a location on 2.0.29; `session.shell.ended` is paged (`output.output`); the event stream carries **every** session and is volatile by contract — filter on ingest and repair gaps by refetch, never replay.
