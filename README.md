# opencode client

A desktop client for a local [opencode](https://opencode.ai) server — structure borrowed from the opencode TUI, interaction built for a desktop window. Tauri 2 shell, Vite + React frontend, everything local.

**Status: pre-implementation.** The specs describe what is being built; nothing here is finished. The abandoned earlier attempt lives in `../opencode-tauri-client-legacy` — read it for facts, never restore it.

## Requirements

- [bun](https://bun.sh) and a Rust toolchain (for the Tauri shell)
- a running opencode server (the app reads `~/.local/state/opencode/service.json`, or `OPENCODE_SERVER_URL` + `OPENCODE_PASSWORD`)

## Commands

| Command | Does |
| --- | --- |
| `bun run dev` | Vite dev server for the web target |
| `bun run build` | type-check + production bundle |
| `bun run verify` | `tsc -b` + `biome check .` — the gate |
| `bun run lint` / `bun run fix` | Biome check / Biome check with writes |
| `bun run preview` | serve the built bundle (the only honest way to test an installed plugin) |
| `bun tauri dev` | the desktop window against the same frontend |

Biome formats and lints. There is no ESLint and no Prettier in this repository, by design.

## Documentation

| Where | What |
| --- | --- |
| `docs/specs/` | the specs: [overview](docs/specs/000-overview.md), [shell](docs/specs/010-app-shell.md), [session view](docs/specs/020-session-view.md), [typography](docs/specs/030-typography-and-theme.md), [plugins](docs/specs/040-plugins.md), [server link](docs/specs/050-opencode-integration.md), [plan](docs/specs/060-plan.md) |
| `docs/progress/` | the status board and the decisions log |
| `docs/opencode-api.md` | the opencode server/client API: methods, routes, events, traps |
| `AGENTS.md` | conventions a contributor (human or agent) must follow |
