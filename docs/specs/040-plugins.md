# 040 — Modular core and the plugin API

The sketch: "this should be built from the ground up to be modular and plugin compatible, just like ai-client-oss." This spec is that model, adapted to an opencode client.

## Model

- **A plugin is one pre-built ES module plus a JSON manifest, loaded into the running app.** No sandbox, no separate process, no worker.
- **Full trust, said plainly.** A plugin runs in the app's process with the app's privileges: it can read the opencode server's password, every session, `localStorage`, the app-data directory and the network. The installer says this in the UI, and the docs say it again.
- **Off by default**: a master switch (`settings.pluginsEnabled`) gates *loading*. Nothing downstream limits an installed plugin.
- **Capabilities are consent labels, not a boundary** (table below). Only the path-scoped data directory is enforced for real.
- **The API is unstable at `0.1`** and may change between minor releases.
- **Everything is a contribution.** The shell, home page, transcript renderers, sidebar panels and settings sections are registered through the same host API a plugin uses. Two areas are locked and cannot be disabled: the app substrate (`app.substrate`) and the plugin manager (`app.builtins`).

## Manifest — `plugin.json`

| Field | Required | Notes |
| --- | --- | --- |
| `id` | yes | One path component. Allowlist `[A-Za-z0-9._-]`, no leading/trailing `.`; mirrored by `safe_id` in `src-tauri/src/lib.rs`, which guards every path the native bridge joins. Keep the two in step. |
| `name` | yes | Shown in the plugin manager. |
| `version` | yes | The plugin's own version. |
| `apiVersion` | yes | The host API built against — currently `0.1`. A different **major** is refused; a different minor warns. |
| `entry` | no | Defaults to `main.js`; must match the built file's name. |
| `capabilities` | no | Declared labels: `plugin-data`, `net`, `window`, `shortcuts`, `invoke`, `fs-any`. Validated against the label list, shown at install. |
| `engines.app` | no | App version range, e.g. `>=0.3.0`; `*` accepts anything. |
| `description`, `author`, `homepage` | no | Shown in the plugin manager. |

Validated by zod in `src/plugins/manifest.ts`; a bad id or an unknown capability fails at install, not at first use.

## Entry file

```ts
// plugins/hello-world/main.tsx
import type { Host } from "@/plugins/sdk";
export default { setup(host: Host) { /* register; return void or { dispose } */ } };
```

- **The built file must import nothing.** The host supplies its API and React through globals set immediately before the import: `__ocHost`, `__ocReact`, `__ocJsx`. A bundled app has no module resolver for a plugin directory, so the build script fails if the emitted chunk keeps a bare specifier, and the loader refuses one at load time.
- In your **source** you may import: `react` and `react/jsx-runtime` are rewritten onto the host's React (so `useState` is the app's instance, not a second copy) and every other bare specifier is bundled into your file. Do not import a host module by path — that resolves to a second copy whose state is not the app's. Import **types** only (`import type { Host } from "@/plugins/sdk"`), which is erased at build time and is the supported way to get the API types.
- `main.tsx` is preferred; `main.ts` works with `createElement`.
- JSX uses the automatic runtime; no `import React`.
- **`setup` is synchronous and must be cheap.** It is not bounded by a load timeout and cannot be preempted, so async work belongs behind `host.signal` (an `AbortSignal` the host aborts on unload) or a subscription, not in a floating promise you cannot cancel.
- `setup` receives one argument, `host`, and returns nothing or a `Disposable` whose `dispose` runs **first** on unload, before your registrations are collected. A disabled plugin must leave no trace: retract anything you put on the document in `dispose`.
- **Reload is two-phase and the host owns only what you registered**: import and validate the new source first, then close the old instance (running `dispose`), then run the new `setup` — so a reload whose new source fails to import leaves the old instance running. A `setup` that throws is the one case this cannot make seamless (the old instance is already closed, so nothing loads and the row reads `failed`).

## Why no `effect`

`ai-client-oss`'s host returns `Effect`s, ships no runner, and pins that cost on authors (its own plugin guide spends a paragraph on it). This app's host API is **`Promise` + plain subscriptions**: `host.storage.get` resolves, `host.on(...)` returns an unsubscribe, and `host.signal` is how long-lived work is cancelled. Same capability, no runtime in the plugin's dependency graph.

## The host

Registries register **synchronously** and return a `Disposable`; services return promises.

| `host.` | Adds | Kind |
| --- | --- | --- |
| `ui.register({ id, slot, component })` | a component into a named slot | registry |
| `ui.kit` | the app's primitives (`Button`, `Panel`, `Section`, `FieldRow`, `Menu`, `Markdown`, `cls` and the class constants) so plugin UI matches a built-in's without copying Tailwind strings | object |
| `commands.register({ id, title, run, keybinding? })` | a palette command, optionally keybound | registry |
| `panels.register({ id, title, component })` | a sidebar panel (`session.sidebar.panels`) | registry |
| `routes.register({ id, path, component })` | a route the router serves | registry |
| `settings.registerSection({ id, title, component })` | a foldable section on `/settings` | registry |
| `renderers.register({ id, kind, component })` | override a transcript renderer: `message`, `markdown`, `reasoning`, `tool`, `marker` | registry |
| `themes.register(theme)` / `apply(id)` / `clear()` / `active()` | a theme in the app's one theme service (spec 030) | registry + service |
| `opencode.client` | the raw `@opencode/client` instance (full server API, `docs/opencode-api.md`) | service |
| `opencode.on(event, handler)` | the server's event stream, filtered for you (`session.*`, `mcp.*`, `permission.*`, …); returns an unsubscribe | service |
| `transcript.snapshot()` | the open session's rows, synchronously (what is rendered now) | service |
| `storage.get/set/delete/keys` | your own key-value store, persisted in `settings.plugins[].data` | service |
| `native` | `pickDirectory`, `pickFiles`, `openExternal`, and path-scoped `read`/`write`/`list`/`remove`/`dataDir` under `plugin-data/<id>/`; `null` on web | service |
| `native.http` | an unrestricted request through the shell's `http_request`; rides `net` | service |
| `notify.toast/banner/modal/confirm` | host-rendered notices | service |
| `on(event, handler)` | app events: `turn-start`, `turn-end`, `chunk`, `session-changed`, `settings-changed`, `plugin-loaded`, `plugin-unloaded`, `theme-changed` | service |
| `log.info/warn/error/debug` | the scoped logger, shown in the manager's log panel | service |
| `signal` | an `AbortSignal` aborted when your plugin unloads | object |
| `version` | `{ app, api }` | object |

Registry semantics that matter:

- A contribution the host **refuses** yields the same inert handle: an unknown slot name, a duplicate id, or a malformed entry is dropped, logged as a `PluginFault` and never throws. Nothing renders — so a typo is invisible until the manager's log panel is open, and the manager's default view surfaces the fault count.
- Disposing a handle removes exactly that entry. Closing a plugin's scope (disable, uninstall, reload) disposes every one of its contributions plus its `setup` handle.
- A built-in area registers through this same API and is disabled the same way, so a contribution, its lifetime and its teardown behave identically for a built-in and for a plugin.

## Slots (v0.1)

`src/plugins/slots.ts` holds one `as const` tuple — the single source for the type *and* the runtime check — rendered into the in-app API reference.

`app.substrate` (locked) · `topnav.left` · `topnav.center` · `topnav.right` · `home.hero` · `home.widgets` · `home.actions` · `session.toolbar` · `session.sidebar.panels` · `transcript.row.actions` · `transcript.footer` · `composer.toolbar` · `composer.above` · `composer.below` · `statusline.left` · `statusline.right` · `settings.sections` · `overlays` · `app.builtins` (locked).

- A slot renders whatever is registered where the host component puts `<Slot id="…">`, in registration order, with an optional per-contribution order key.
- `settings.sections` is the surface the plugin manager's own section renders into; a plugin that replaces `app.substrate` owns the way back and must render a route to it itself.

## Capabilities and trust

| Label | Meaning | Enforced? |
| --- | --- | --- |
| `plugin-data` | the plugin's own files under `plugin-data/<id>/` | **yes** — the shell's path handling scopes it; through the API another plugin's directory cannot be named (calling the raw shell command with another id is possible, and the consent UI says so) |
| `net` | unrestricted network | no — the webview has a global `fetch` |
| `window` | window/document access | no — consent label only |
| `shortcuts` | global keybindings | no — consent label only |
| `invoke` | arbitrary shell invocation | no — consent label only |
| `fs-any` | filesystem outside the data directory | no — consent label only |

Never describe these as a sandbox.

## Build, install, develop

- `bun scripts/build-plugins.ts [id]` builds every `plugins/<id>/main.tsx|main.ts` to `public/plugins/<id>/main.js` (gitignored), rewriting `react`/`react/jsx-runtime` onto the host globals and failing the build if any bare specifier survives.
- Install in **Settings → Plugins**: paste manifest + entry source, install from a URL, or pick files. Then enable. Enable/disable/reload/uninstall, version and declared capabilities, the fault list, and the log panel live there.
- **A pasted or installed plugin's source is imported from a `Blob` — the production path.** Dev (`vite dev`) imports a built asset URL instead, so a plugin under development cannot be exercised in the dev server: the loop is build → install → `bun run preview`. Say so in the plugin README, and make the gate `bun run build && bun run preview`.
- The **in-app API reference** is generated from the SDK types and the slot/registry tables (`src/docs/reference.generated.ts`), the same way `ai-client-oss` does it, so the signature list can never drift from the code.

## Plugins shipped as examples (`plugins/`)

| Plugin | Proves |
| --- | --- |
| `hello-world` | a slot contribution, the kit, the lifecycle (marker set in `setup`, cleared in `dispose`) |
| `theme-gruvbox` | `themes.register` + `apply`, a settings section, `storage` persistence |
| `session-export` | `commands.register` + `transcript.snapshot()` + `native.write` into the plugin's data dir |
| `context-meter` | a sidebar panel (`panels.register`) driven by `opencode.on("session.usage.updated")` |

## What plugins cannot do in v0.1

- Install or change server-side tools — those are the opencode server's (its config and MCP servers). A plugin contributes **client** behaviour instead: slash commands, prompt transforms, panels, renderers.
- Bypass the master switch, or place a contribution in a locked area.
- Be sandboxed. There is no untrusted tier; the honest answer to "is this safe?" is "read the source".

## Acceptance

- With plugins off, the app is complete and no plugin code is fetched.
- `hello-world` installs from pasted source, appears in a slot, and disappears completely on disable (contribution gone, document marker cleared, fault count zero).
- A plugin with a bad id, an unknown slot, or a bare import in its bundle fails visibly (install error, fault, or build error) and never breaks the app.
- A plugin theme applies and clears through the one theme service, and cannot override the user's font settings.
- The plugin manager's gate is honest: the same plugin behaves identically after `bun run build && bun run preview`.
- Two built-in areas can be disabled like plugins; disabling `app.substrate` or `app.builtins` is refused.
