# 020 — The session view

The sketch's "clicking a session goes to a ui similar to tui": a transcript that fills the window, a sidebar on the right, a prompt box pinned at the bottom. Structure from the TUI; behaviour from a desktop app.

```
┌ top nav ─────────────────────────────────────────────────────────────┐
│ ◆ opencode │ ▍fix the parser  ✓  │ ▍write specs  ●  │  +  ⌕  ⚙  ⋯ │
├──────────────────────────────────────────────┬───────────────────────┤
│ transcript (scrolls; one row per step)       │ sidebar (resizable)   │
│  ┃ user band                                 │  Session              │
│  ✦ prose / reasoning / tool / subagent       │   directory · branch  │
│  ⏎ footer: agent · model · duration · tok/s  │   model · agent       │
│                                              │  Context (tokens, %)  │
│              [ jump to latest ]              │  MCP servers          │
│                                              │  Files changed        │
├──────────────────────────────────────────────┤  plugin panels…       │
│ ┌ prompt box ───────────────────────────────┐│                       │
│ ┃ > what next?                              ││                       │
│ ┃ Build · model · high        thinking: hide││                       │
│ └───────────────────────────────────────────┘│                       │
├──────────────────────────────────────────────┴───────────────────────┤
│ ~/dev/app · main      ↓ 2 subagents · 48% · $3.32     ⌘K  ⌘B  ⌘,     │
└──────────────────────────────────────────────────────────────────────┘
```

## Regions

| Region | Rule |
| --- | --- |
| transcript | the only scroller; content-sized, tail-following until the user scrolls up |
| sidebar | right, resizable, collapsible (⌘B); its own scroller; hidden on narrow windows, overlayable on demand |
| prompt box | pinned below the transcript, never scrolls; a dock (permission or question form) replaces it while one is pending |
| statusline | one row, the app's own; segments are clickable and open popovers |
| no pane header | the TUI has no header row on a session; the tab label and window title carry the title, and the statusline carries the location. Desktop gets a **hover title** on the tab, not a header band |

## Transcript

Row kinds, each one row-shaped and memoised on its parts.

The **renderer kinds** a plugin may override are five (spec 040 §The host): `message`, `markdown`, `reasoning`, `tool`, `marker`. The eight row kinds map onto them as **`user`→`message`, `prose`→`markdown`, `reasoning`→`reasoning`, `tool`→`tool`, `shell`→`tool`, and `error`/`notice`/`footer`→`marker`** — the published correspondence the transcript dispatch reads (`M4.13`), written down so a plugin author and the code agree without anyone re-deriving it.

| Row | Shows | Desktop extras |
| --- | --- | --- |
| user band | the prompt text; banded surface with a left rail; rail tone differs while the prompt is queued vs delivered | copy, edit-and-resend, per-band collapse for very long prompts |
| assistant prose | markdown: headings, lists, tables, inline code, fenced code with syntax highlighting | copy button per code block, "open in editor" on a file path |
| reasoning | a collapsed group (`+ Thought: <title> · <duration>`), expandable including **while streaming** | expanded state remembered per session |
| tool call | tool name, its anchor (the command, the path, the pattern) and status; output collapsed to a head with an `(N more lines)` marker | expand/collapse, copy output, raw/pretty toggle, diff colouring when the output is a diff |
| subagent call | `<Agent> Subagent — <description> · <model>`, `↳` for a continuation, run state | click opens that child session in a new tab |
| shell / background | the shell it started, its status; output collapsed like a tool row | open the shell's full output in a panel |
| error / interrupted | the failure text, on its own row, never swallowed into prose | retry action |
| per-prompt footer | `agent · model · duration · tok/s`, printed once per prompt (a `tool-calls` step carries none) | copy as markdown |
| notices | permission asked/replied, form created/replied, compaction, revert | — |

Rendering rules (each one earned by measurement in the previous build; keep the behaviour, not its machinery):

- **Cap on ingest, not only at render**: every text-carrying payload (tool output, shell output, text/reasoning deltas *and* their `.ended` counterparts) is truncated to `PAYLOAD_MAX_CHARS` with an explicit `(N earlier lines)` marker; the render cap `TOOL_CONTENT_MAX_CHARS` is the collapsed head. `PAYLOAD_MAX_CHARS` must exceed the render budget, or a collapsed row renders complete and the collapsed/expanded distinction breaks.
- **Never split a payload into arrays for counting.** Line counts, heads and tails are computed by index scans.
- **Markdown blocks are keyed by position**, because a streaming tail is an append-only list; a content key remounts a fence on every delta.
- **Highlighting is debounced and memoized on `(language, code)`**, and a block renders plain text until the highlight matches the **current** code, so a stale highlight can never show an older delta.
- **Memos are bounded by the total length of their keys**, never by entry count: the streaming tail is a longer string each delta.
- **Rows are memoised on a parts-identity comparator**, and the row list is derived by a memo keyed on the transcript identity — a reducer that rebuilds row objects per delta otherwise re-renders everything.
- **Virtualisation is a measured follow-up, not a v1 feature.** If a session with thousands of rows scrolls badly, window the list then; the memo work comes first, at the row level.

Scroll behaviour:

- Tail-follow while pinned to the bottom; any upward scroll unpins and reveals a **jump-to-latest** pill with a count of rows below.
- Switching tabs preserves each tab's scroll position and expansion state.
- `⌥↑` / `⌥↓` jump between user bands.

## Prompt box

- One bordered box (raised-high surface, 1px hairline, left rail in the accent when the session is running) containing: the textarea (auto-growing to a max height, then scrolling), the identity line (`agent · model · thinking mode`), and the send/interrupt affordance.
- The identity line's fields are **clickable controls**: agent picker, model picker (`model.list`), thinking toggle (`session.switchAgent` / `session.switchModel` / the server's thinking mode).
- Slash commands: the menu merges the app's **client commands** with the server's `command.list()` (loaded asynchronously — an empty first read is normal). Accepting a server command inserts `/<name> ` and sends nothing; accepting a client command runs it in the app.
- `@` mentions: files (`file.find`), agents, skills. Mentions are stored as structured spans (`{ start, end, text }`) with the prompt, not as plain text.
- Attachments: drag-and-drop or the picker; files ride the prompt payload's `files[]` with `uri`, `name`, optional description and mention. Images preview inline above the input.
- ⌘↩ sends and ↩ inserts a newline (the shell's key table, `src/constants/keys.ts`, is the single authority — spec 010 owns this binding, and spec 020 previously said the opposite, corrected 2026-10-16 when `M2.5` found the two specs in direct conflict). The map is **not yet user-configurable**: that needs the settings surface (`M3.5`), and until then the binding is fixed. While a turn runs, **Esc** interrupts — and the interrupt key is live for the whole non-idle window (a running session shows `esc interrupt` in the statusline).
- A prompt submitted while a turn is running is **queued**, not dropped: it appears in the transcript immediately with the queued rail tone and moves to the tail in enqueue order once delivered.
- A refused send (`Prompt not sent`) keeps the text in the box and explains why.

## Docks (permission, question)

- Both take the composer's slot, exactly as the reference does — no dialog, no overlay: raised surface, accent left rail, the reference's inner padding, sections indented by one step, and a footer line naming the keys.
- Permission: the tool, its input, and the reply keys; the decision values are `once`, `always`, `reject`.
- Question form: one question per tab (or one group), a `Field N of M` strip when the labels do not fit, options as a list with a selected row, and a review step for multi-question forms.
- Keyboard first: every option reachable without the mouse; focus lands on the first control when a dock opens.

## Sidebar (right)

Panels, in this order by default; user-reorderable, plugin-extensible, each collapsible:

| Panel | Source |
| --- | --- |
| Session | session info: title, directory (with branch), agent, model, created/updated |
| Context | tokens used, spend (`session.stats`, `session.context`, usage events), and a **percentage of the window only if the payload carries the window size** — at the pinned client no payload does, so the panel shows the server's token count rather than an invented divisor (M2.7's finding) |
| Subagents | children of the open session (`session.list({ parentID })`), running vs finished, click to open, interrupt |
| MCP servers | `mcp.list()` — name, status word, its error; click opens a detail with connect/disconnect and the config path |
| Files changed | `vcs.status` / `vcs.diff` for the session's directory |
| Plugins | plugin-contributed panels (`session.sidebar.panels`) |

- Visibility rule: a child session gets no sidebar (it has no session of its own to describe); a narrow window hides it unless explicitly toggled; the toggle is ⌘B / ctrl+B and its state persists.
- Width is drag-resizable with a minimum, and persists.

## Statusline

- Left: the session's directory, abbreviated, with `:branch` when the location is a repository — the branch needs a **bounded retry**, because the server resolves VCS asynchronously per location.
- Right: `↓ N subagents` (click opens the subagent list, only when N > 0), the token count (no percentage until a payload reports the window size — see the Context panel row), spend, and the keyboard hints for what is currently actionable (`esc interrupt` while running, `⌘K commands` otherwise).
- Every segment is a button: click copies, opens a popover, or opens a panel. Nothing in the statusline is decorative.

## What stays TUI, what becomes desktop

| Stays TUI-derived | Becomes desktop |
| --- | --- |
| pane anatomy: transcript / sidebar / prompt box / one statusline | real scrollbars, resizable panes, window state |
| row vocabulary and the left-rail accent per band and row | hover states, context menus, copy buttons, focus rings |
| banded user prompts, step rows, per-prompt footer | proportional UI type (mono only for code/output) |
| keyboard-first interaction | native pickers, notifications, update, drop targets |
| one accent colour per row, from the theme's categorical palette | clickable statusline segments, popovers, tooltips |
| the identity line inside the prompt box | a tab strip with status dots, reorder, overflow |

## Acceptance

- A live session streams prose, reasoning and tool rows without a full re-render per delta (measured: row re-renders per delta stay flat as the transcript grows).
- A tool row collapses to its head, expands to the full capped payload, and copies as text.
- Reasoning expands while it is still streaming; a finished group keeps its duration.
- The sidebar's Context panel shows the same token count and spend the server reports — **no percentage**, because that needs a payload exposing the window size and none does; Files changed lists the session's own diff through `vcs.status`/`vcs.diff`, not a directory listing.
- Esc interrupts while a turn is running and only then; a queued prompt shows with the queued tone and lands at the tail on delivery.
- A permission request and a question form each take the composer's slot, are fully keyboard-operable, and reply with the documented values.
- Scrolling up unpins follow and shows jump-to-latest; the scroll position survives a tab switch.
