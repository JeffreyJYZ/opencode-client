# `src-tauri` — the desktop shell

The native shell around the web client. Tauri 2, one window, minimal Rust. Spec authority: [`../docs/specs/010-app-shell.md`](../docs/specs/010-app-shell.md) §Window.

## Why the window is built in Rust

`tauri.conf.json` declares `app.windows: []`, and `src/lib.rs` creates the window in the app's `setup` hook instead, because only `WebviewWindowBuilder` carries an `initialization_script` — a script the webview runs **before** any of the page's own scripts.

That ordering is the whole point of the handover. The server's credentials live in a registration file outside the app's storage, which the webview cannot read and must not be given a path to. So Rust reads them, and hands the page a ready-made target global before the app's first line runs. A window declared in the config file would have nowhere to put that script.

`setup` also runs before — not after — the frontend exists, so this is the only place the handover can happen.

## Target resolution

First match wins, all in `src/target.rs`:

1. **Environment** — `OPENCODE_SERVER_URL` together with `OPENCODE_PASSWORD`, else `OPENCODE_AUTH_TOKEN` (the token fills the password field; the shell's HTTP auth is `opencode:<password>`). This is the dev and CI override.
2. **The registered service file** — `~/.local/state/opencode/service.json`, overridable with `OPENCODE_SERVICE_FILE`. The file is `{ id, version, url, pid, password }`; only `url` and `password` are read. It is opened **read only** — nothing in the shell ever writes to that directory.
3. **Nothing found** — no global is injected at all, and the page falls back to its own origin. That is the web build's normal path, not an error.

A malformed or unreadable file is treated as "nothing found": the shell still opens, and the page's own fallback reports the fault.

## The injected global

```
window.__OC_TARGET__ = { "url": "http://127.0.0.1:49374", "password": "…" }
```

- The value is JSON-serialised, then embedded in the script — never string-interpolated — so a password containing a quote, a backslash or a newline cannot break the literal or inject code into the page.
- The password never reaches a log line, the window title or the DOM. Window creation logs `[shell] target url=… password=<n chars>`, or `[shell] no target …` when nothing resolved.

The web build (`bun run dev` in a browser) has no such global and keeps its own origin.

## Window state

`tauri-plugin-window-state` persists size and position in the app config directory — `~/Library/Application Support/land.jyz.opencode/.window-state.json` on macOS, keyed by the `land.jyz.opencode` identifier — and restores them when the window becomes ready. The declared 1280×800 / min 800×500 in `src/lib.rs` are the first-run defaults and the floor.

## Run and build

```sh
bun install
bun tauri dev     # window opens against the Vite dev server
bun tauri build   # .app bundle (bundle.targets: ["app"]); not needed for a code change
```

`bun tauri dev` starts `bun run dev --port 5173 --strictPort` as `beforeDevCommand`, so a second checkout holding `:5173` fails loudly instead of handing the window the wrong app. To run a second instance, give it its own port:

```sh
bun tauri dev --config '{"build":{"devUrl":"http://localhost:1420","beforeDevCommand":"bun run dev --port 1420 --strictPort"}}'
```

A UI change is not in a built `opencode.app` until the bundle is rebuilt: Tauri embeds `dist` at build time.
