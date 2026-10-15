# 000 — Overview

A desktop client for a local **opencode** server, plus the same app as a website. Structure borrowed from the opencode TUI; interaction built for a desktop window. Not a terminal replica.

Source of the intent: the 2026-10-15 sketch — top nav with sessions/tabs, a home page with recents + settings + "new session" (choose a directory), a session view shaped like the TUI (agent area, right sidebar, prompt box), a UI font rather than a mono font, customizable fonts, and a from-the-ground-up modular core that plugins extend.

## Goals

- **Render a real opencode session faithfully**: streaming prose and reasoning, tool calls with input/output, subagent calls, permissions, question forms, queued prompts — driven by the server's event stream.
- **Feel like a desktop app**: real scrollbars, resizable panes, hover/active/focus states, context menus, a command palette, keyboard shortcuts, native file/directory pickers, native notifications, window-state persistence, self-update.
- **Look structurally like the TUI**: the same pane anatomy (transcript above, prompt box pinned below, session sidebar on the right, one statusline), the same row vocabulary (user band, step rows, tool rows, per-prompt footer), one accent rail per row. The layout is a shape to preserve, not a grid to reproduce.
- **Proportional type by default**, mono only where mono belongs (code, tool output, diffs), with both faces user-selectable.
- **Modular from the start**: the app is a host; the shell, the home page, the sidebar panels, the transcript renderers and the settings sections are all built-in *contributions* registered through the same API a plugin uses. Everything except two locked areas can be disabled.
- **Honest about trust**: plugins are full-trust in-process code, documented as such; capabilities are consent labels, and only the path-scoped data directory is enforced.

## Non-goals

- **Not a pixel/cell-exact TUI replica.** No cell grid, no measured glyph advance driving layout, no glyph-drawn borders, no cell-snapped scrolling, no screen-diff comparator. Those mechanisms exist to make a terminal match; here they would fight the web layout for nothing.
- **No terminal emulation in v1.** The server owns PTYs; a terminal surface is a plugin-able area later, not a first-class pane now.
- **No monospace-everywhere mode.** Code and tool content are mono; prose, buttons, menus and labels are not.
- **No server-side tool installation by plugins.** Tools belong to the opencode server (its config, its MCP servers). A plugin may transform prompts and add slash commands instead (spec 040).
- **No multi-window in v1.** One window, many session tabs. A second window is a later concern.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Shell | **Tauri 2** (Rust) over the OS webview | already installed, no bundled engine, native pickers/notifications/updater, matches `ai-client-oss` |
| Frontend | **React 19 + Vite 8 + TS 6** | already in the scaffold, React Compiler preset already wired |
| Styling | **Tailwind 4** + CSS custom-property tokens | utility-first with a token layer, same as `ai-client-oss` |
| Lint/format | **Biome** (`biome.json` already present) | one tool, replaces the scaffold's ESLint scripts |
| Runtime/pkg | **bun** only | house rule; never npm/pnpm |
| Validation | **zod** | plugin manifests and settings blobs, both read from disk/URLs |
| Text | **marked** + **shiki** + **dompurify** | markdown → HTML with syntax highlighting, sanitized, same trio the previous build proved out |
| server API | **`@opencode/client` 2.0.29** (already a dependency) | the pinned client; the route surface is documented in `docs/opencode-api.md` |
| Tests | **`bun test` + happy-dom** for units, a scripted browser proof for UI | same split that worked before: DOM-less tests run without the preload |

Deliberate omissions from the previous build: no `effect` (the plugin API is Promise/plain-callback based — see 040 §Why no effect), no `solid-js` peer, no vendored TUI cell model.

## Repository layout

```
docs/opencode-api.md      the server/client API surface (already written)
docs/specs/000…060        these specs; 060 is the plan
docs/progress/            status board + per-milestone logs
plugins/<id>/             example plugins (plugin.json + main.tsx)
scripts/                  build-plugins.ts, e2e.ts, verify-release.ts
src/                      app source (see below)
src-tauri/                Tauri 2 shell
```

`src/` is organised by role, not by feature folder:

| Path | Holds |
| --- | --- |
| `src/app/` | shell: window, routes, top nav, providers |
| `src/pages/` | route components: home, session, settings |
| `src/session/` | client wiring: event store, reducer, rows, resync, actions |
| `src/plugins/` | plugin host: manifest, loader, registries, slots, kit, storage |
| `src/theme/` | tokens, vendored opencode theme documents, font settings |
| `src/components/` | primitives and shared UI (tray, panels, dialogs) |
| `src/constants/` | the named constants every spec cites |

## Vocabulary

- **Session tab** — one open session in the top nav. A tab is UI state; the session is the server's.
- **Transcript** — the ordered rows of one session, derived from the server's messages plus the live event stream.
- **Row** — one rendered item: a user band, a step's prose, a reasoning group, a tool call, a subagent call, an error, a per-prompt footer.
- **Rail** — the 1px accent edge on the left of a band or row; the only per-row colour cue the TUI uses.
- **Prompt box** — the composer at the bottom: one bordered box containing the input, its identity line and its send/interrupt affordance.
- **Panel** — a section inside the right sidebar (session info, context/usage, MCP, files, plus plugin panels).
- **Slot** — a named place in the shell a contribution can render into (`topnav.center`, `home.widgets`, …). The slot list is a single `as const` tuple in `src/plugins/slots.ts`.
- **Contribution** — one registration (a slot component, a command, a panel, a theme, a settings section, a renderer). Disposing it removes exactly that entry.
- **Host** — the object a plugin's `setup(host)` receives: registries, services, storage, notifications, the opencode bridge.

## Open questions

1. ~~Interface face default~~ — **decided 2026-10-15: Geist**, bundled (OFL, already at `~/dev/fonts/geist`), with the system stack as fallback. Code face: **`GeistMono Nerd Font`** (the brew cask `font-geist-mono-nerd-font`), falling back to bundled `Geist Mono`. Both roles user-selectable (spec 030).
2. ~~Settings surface~~ — **decided 2026-10-15, refined the same day: it renders as a tab while it is open**, never an entry of its own in the nav (no tab in the strip when it is closed); four entries — the nav gear, ⌘,, the home page button, the palette — and it closes and reopens like a session tab. Plugins contribute sections inside it, never a surface of their own.
3. Light mode: support it from the start (spec 030 says yes, because the vendored theme has a light variant) or ship dark-only first? Spec assumes both, dark first.
4. Does the app need its own PTY surface early (the server exposes `pty.*` and persistent PTYs)? Assumed out of scope for v1.
