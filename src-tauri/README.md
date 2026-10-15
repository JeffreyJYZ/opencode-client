# `src-tauri` — the desktop shell

The native shell around the web client. Tauri 2, one window, minimal Rust. Spec authority: [`../docs/specs/010-app-shell.md`](../docs/specs/010-app-shell.md) §Window.

## Why the window is built in Rust

`tauri.conf.json` declares `app.windows: []`, and `src/lib.rs` creates the window in the app's `setup` hook instead, because only `WebviewWindowBuilder` carries an `initialization_script` — a script the webview runs **before** any of the page's own scripts.

That ordering is the whole point of the handover. The server's credentials live in a registration file outside the app's storage, which the webview cannot read and must not be given a path to. So Rust reads them, and hands the page a ready-made target global before the app's first line runs. A window declared in the config file would have nowhere to put that script.

`setup` also runs before — not after — the frontend exists, so this is the only place the handover can happen.

## Target resolution

First match wins. The file half lives in `src/target/service.rs`, the env half in `src/target.rs`:

1. **Environment** — `OPENCODE_SERVER_URL` together with `OPENCODE_PASSWORD`, else `OPENCODE_AUTH_TOKEN` (the token fills the password field; the shell's HTTP auth is `opencode:<password>`). This is the dev and CI override.
2. **The registered service file** — the directory is `$XDG_STATE_HOME/opencode` when `XDG_STATE_HOME` is set and non-blank, else `~/.local/state/opencode`. Inside it, `service.json` is preferred; when it is absent, the **most recently modified** `service-<channel>.json` is taken (the name a non-release channel writes — `service-local.json` on the `local` channel). `OPENCODE_SERVICE_FILE`, set and non-blank, overrides the path absolutely and skips the search. The file is `{ id, version, url, pid, password }`; only `url` and `password` are read, and `url` is trimmed before it is injected. It is opened **read only** — nothing in the shell ever writes to that directory.
3. **Nothing found** — no global is injected at all, and the page falls back to its own origin. That is the web build's normal path, not an error.

A malformed or unreadable file is treated as "nothing found": the shell still opens, and the page's own fallback reports the fault. The same holds for an unreadable directory or a missing candidate — none of them panics, and none yields a partial target.

## The injected global

```
window.__OC_TARGET__ = { "url": "http://127.0.0.1:49374", "password": "…" }
```

- The value is JSON-serialised, then embedded in the script — never string-interpolated — so a password containing a quote, a backslash or a newline cannot break the literal or inject code into the page.
- The password never reaches a log line, the window title or the DOM. Window creation logs `[shell] target url=… password=<n chars>`, or `[shell] no target …` when nothing resolved.

The web build (`bun run dev` in a browser) has no such global and keeps its own origin.

## Window state

`tauri-plugin-window-state` persists size and position in the app config directory — `~/Library/Application Support/com.jyz.opencode.client/.window-state.json` on macOS, keyed by the `com.jyz.opencode.client` identifier — and restores them when the window becomes ready. The declared 1280×800 / min 800×500 in `src/lib.rs` are the first-run defaults and the floor.

## The navigation guard

`window.__OC_TARGET__` is registered at document start on the main frame, so wry re-injects it on **every** top-level navigation. `src/lib.rs` therefore installs an `on_navigation` handler that allows only the app's own origin — `tauri://localhost` in a built app, `http://localhost:1420` in a dev build (`cfg!(dev)`) — and refuses everything else, so a foreign origin can never receive the credential. The predicate (`is_allowed_navigation`) is pure and unit-tested (`cargo test`), including the direction that matters most: the app's own document must pass, or the app would never load. Opening a refused link in the OS browser is the frontend's job, not the guard's; a refusal leaves the window where it was. Dev-only residual risk: in a dev build whatever owns `localhost:1420` is trusted; `--strictPort` makes Vite fail on a busy port instead of substituting, and the dev arm is compiled out of a production build, so this cannot reach a released build.

## Run and build

```sh
bun install
bun tauri dev     # window opens against the Vite dev server
bun tauri build   # .app bundle (bundle.targets: ["app"]); not needed for a code change
```

`bun tauri dev` starts `bun run dev --port 1420 --strictPort` as `beforeDevCommand` (Tauri's own convention, not Vite's `5173` — the main checkout holds `:5173`). `--strictPort` means a busy port fails loudly instead of handing the window the wrong app. To run a second instance, give it its own port:

```sh
bun tauri dev --config '{"build":{"devUrl":"http://localhost:1520","beforeDevCommand":"bun run dev --port 1520 --strictPort"}}'
```

`src/lib.rs`'s `DEV_PORT` must stay in step with `devUrl` in `tauri.conf.json`, or the guard will refuse the dev server's own document.

A UI change is not in a built `opencode.app` until the bundle is rebuilt: Tauri embeds `dist` at build time.
