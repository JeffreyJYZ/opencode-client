# Example plugins

Four plugins, one per part of the host they prove (spec 040 §Plugins shipped as
examples, plan `M4.7`). Each is **source**: `plugin.json` plus one entry module.

| Plugin | Proves | Declares |
| --- | --- | --- |
| `hello-world` | a slot (`home.hero`), a palette command, the lifecycle (a document marker set in `setup`, cleared in `dispose`) | `window` — it writes that marker on the document |
| `theme-gruvbox` | `themes.register` + `apply`/`clear`, a settings section, `storage` persistence | `plugin-data` — it remembers the choice in its own store |
| `session-export` | a command + `transcript.snapshot()` + the capped, namespaced `storage` + `native.write` into the plugin's own data dir | `plugin-data` — it writes its own data directory |
| `context-meter` | a sidebar panel driven by `opencode.on("session.usage.updated")`, showing the session's own numbers | nothing — it renders a contribution and reads an event |

## Capabilities are declared, not assumed

A capability is a **consent label**, not a boundary: only `plugin-data` is
enforced, by path scoping in Rust `safe_id` (spec 040 §Capabilities and trust).
So each example declares only what it uses:

- **Rendering a contributed component asks for no label.** The host renders it;
  that is not a plugin reaching into the document.
- **`window`** is declared by a plugin that writes the document itself —
  `hello-world`'s marker.
- **`net`** is declared by a plugin that makes a network request. None of the
  four do, so no manifest carries it. A `net` label on `hello-world` would
  misrepresent the consent it asks for.

## Build, install, run

The build is `scripts/build-plugins.ts` (`M4.6`) — the only way an entry file is
made (spec 040 §Build, install, develop):

```
bun scripts/build-plugins.ts [id …]   # plugins/<id>/main.tsx → public/plugins/<id>/main.js
```

`public/plugins/` is gitignored: it is build output, never source. The script
rewrites `react` and `react/jsx-runtime` onto the host globals
`__ocReact` / `__ocJsx`, bundles every other bare import, and **fails the build**
on a surviving bare specifier (`react-dom` is deliberately left external, so a
plugin never gets a second React DOM). A built entry therefore imports nothing —
which is what the host needs: an installed plugin's source is imported from a
`Blob`, and a bundled app has no module resolver for a plugin directory.

A plugin's **source** may therefore `import { useState } from "react"` and use
`import type { Host } from "@/plugins/sdk"` for the API types, which the build
erases. What it may not do is import a host module by path — that resolves to a
second copy whose state is not the app's.

An installed plugin's source is imported from a `Blob` — the production path — so
a plugin cannot be exercised under `vite dev`, which imports a built asset URL
instead. The loop is:

```
bun scripts/build-plugins.ts
bun run build && bun run preview      # then install in Settings → Plugins and enable
```

Install, in Settings → Plugins, is **paste manifest + entry source** — the
manager's one path in. The manifest is the `plugin.json` and the source is the
built `main.js`.

## What a plugin may not do

- It may not contribute to the two locked areas: `app.substrate` and
  `app.builtins`. A refusal there is inert plus a logged `PluginFault`
  (`locked-area`).
- It may not replace a built-in settings section — the manager's own is
  `plugins`, and it is the way back to a plugin's switch.
- It may not be sandboxed. There is no untrusted tier; the honest answer to "is
  this safe?" is "read the source" (spec 040 §What plugins cannot do in v0.1).

The in-app API reference (Settings → **Plugin API**) is generated from the SDK
types and these tables by `scripts/generate-reference.ts`.
