# opencode client

A desktop client for a local [opencode](https://opencode.ai) server — structure borrowed from the opencode TUI, interaction built for a desktop window. Tauri 2 shell, Vite + React frontend, everything local.

**Status: pre-implementation.** The specs describe what is being built; nothing here is finished. The abandoned earlier attempt lives in `../opencode-tauri-client-legacy` — read it for facts, never restore it.

## Requirements

- [bun](https://bun.sh) — the package manager, the test runner and the dev server.
- **Xcode Command Line Tools** — `xcode-select --install`. The Rust linker needs them; the full Xcode app is not required.
- **Rust via the Homebrew `rustup` formula** — `brew install rustup && rustup default stable`. Its shims live in `/opt/homebrew/opt/rustup/bin`, which the commands below find on `PATH`; do **not** install the rustup shell script instead, because a GUI-launched app cannot see `~/.cargo/bin`. (Measured here: `rustc 1.99.0` at `/opt/homebrew/opt/rustup/bin/rustc`.)
- the code-face font — `brew install --cask font-geist-mono-nerd-font`. Optional: the bundled `Geist Mono` is the fallback, so the app works without it.
- a running opencode server (the app reads `~/.local/state/opencode/service.json`, or `OPENCODE_SERVER_URL` + `OPENCODE_PASSWORD`).

## Build the macOS app

These are the steps, in order, as run on this machine:

1. `bun install` — the JS dependencies, including each `@tauri-apps/plugin-*` the shell uses.
2. `bun tauri build` — runs `bun run build` (type-check + Vite bundle) and then compiles the Rust shell in release, producing the app bundle.
3. `open "src-tauri/target/release/bundle/macos/opencode client.app"` — launches the app from the bundle (not from `tauri dev`).

Measured on this machine: `bun tauri build` finishes with `Built application at: …/src-tauri/target/release/opencode-client` and then `Bundled opencode client.app … (16.74 MiB)`; the artifact is `src-tauri/target/release/bundle/macos/opencode client.app` (17M by `du -sh`, the 16M executable inside it plus the resources). The release link step took `1m 38s` on a warm `target/`.

`src-tauri/tauri.conf.json` needed **no change** for this step: `bundle.targets` is already `["app"]` (so nothing tries to build a disk image) and `version` already points at `package.json`.

The bundle is **unsigned**: no signing key or secret is committed, so on first launch macOS may require right-click → Open. Gatekeeper's answer is the user's, not this repository's.

### Updates are inert

The updater is wired to a **named endpoint** (`https://github.com/jyz/opencode-client/releases/latest/download/latest.json`) with a **public** key committed and the private key never in the repository. That repository does not exist yet — this working copy has no git remote — so the update check is **inert**: it fails to reach a release host rather than finding an update. `bun scripts/verify-release.ts <tag>` is the committed gate a real release runs; it prints one verdict line and exits non-zero on any gap.

## Commands

| Command | Does |
| --- | --- |
| `bun run dev` | Vite dev server for the web target |
| `bun run build` | type-check + production bundle |
| `bun run verify` | the gate: `tsc -b` + `biome check .` + the file-length check + `cargo fmt --check` + `cargo check` + `bun test` |
| `bun run e2e` | the scripted browser proof — its own isolated opencode server and a private `agent-browser` session |
| `bun run fix` | Biome check with writes (the formatter) |
| `bun run preview` | serve the built bundle (the only honest way to test an installed plugin) |
| `bun tauri dev` | the desktop window against the same frontend |
| `bun tauri build` | the macOS `app` bundle (above) |

Biome formats and lints. There is no ESLint and no Prettier in this repository, by design.

## Documentation

| Where | What |
| --- | --- |
| `docs/specs/` | the specs: [overview](docs/specs/000-overview.md), [shell](docs/specs/010-app-shell.md), [session view](docs/specs/020-session-view.md), [typography](docs/specs/030-typography-and-theme.md), [plugins](docs/specs/040-plugins.md), [server link](docs/specs/050-opencode-integration.md), [plan](docs/specs/060-plan.md) |
| `docs/progress/` | the status board and the decisions log |
| `docs/opencode-api.md` | the opencode server/client API: methods, routes, events, traps |
| `AGENTS.md` | conventions a contributor (human or agent) must follow |
