# 050 — opencode server integration

The server's API surface is documented in [`docs/opencode-api.md`](../opencode-api.md) (client methods, all 132 routes, the event names, the payload traps). This spec is only the **architecture of our link to it**.

## Target and auth

- Resolve the target once at startup, in this order: `window.__OC_TARGET__` (injected by the Tauri shell), a stored target from the connect flow, `VITE_OPENCODE_URL` + `VITE_OPENCODE_PASSWORD` (dev), else the page's own origin (web build served by a server).
- Auth is HTTP Basic; the browser path also accepts `?auth_token=<base64>` and **strips it from the URL immediately**, so a token never sits in the address bar or in history.
- One `opencode` client instance for the app (`OpenCode.make({ baseUrl, headers })`), exposed through a context and to plugins as `host.opencode.client`.
- No client-side retry storms: a failed call reports to the caller; a connection failure moves the app into an explicit **offline state** with a retry action and the url it tried.

## Event ingest

- **One subscription** for the whole app (`client.event.subscribe`), created when a target exists and re-created on a live transition.
- **Filter at the ingest boundary** (`accept` on the subscription), because the stream carries every session; a frame for a session the app does not hold is refused before any handler runs.
- The reducer is **per session**: a map `sessionID → Transcript`, with the open session's transcript exposed by the hook. Events for a background tab still reduce, so switching tabs is instant and a background turn counts as activity for its tab dot.
- Events that matter, and what each does:

| Event | Effect |
| --- | --- |
| `session.execution.started / succeeded / failed / interrupted` | the session's running flag; gates `esc interrupt`, the statusline hint, the tab dot |
| `session.step.started / streamed / ended / failed` | step boundaries; clears `finish` so the per-prompt footer is appended once |
| `session.text.*`, `session.reasoning.*` | streaming prose and reasoning groups (deltas appended, `.ended` authoritative) |
| `session.tool.called / input.* / progress / success / failed` | tool rows: name, anchor, status, output |
| `session.inbox.enqueued / delivered / cancelled` | the queued-vs-delivered rail tone, and queued rows pinned to the tail |
| `session.permissions`, `permission.asked / replied` | the permission dock and its history rows |
| `form.created / replied / cancelled` | the question dock |
| `session.compaction.*`, `session.revert.*`, `session.usage.*` | notice rows and the Context panel |
| `session.created / renamed / deleted / moved / model.selected / agent.selected` | the tab strip, recents and the sidebar's identity panel |
| `mcp.status.changed / tools.changed` | the MCP panel (a status event carries no `sessionID` — the panel re-reads on its own action) |
| `vcs.branch.updated` | the statusline's `:branch` |

- **The stream is volatile by contract** (a slow consumer overflows, a disconnect loses events), so gaps are repaired by **refetch**, never by replay: `message.list` (transcript — the method is `message.list`, not `session.messages`, which is not on the pinned client; corrected when M2.1 read it) and `session.context` / `session.stats` (panels).
- **Resync policy**: refetch on first connect, on a real failure, and when the session is empty; an **idle reconnect keeps** a populated transcript and knowingly leaves a short gap until the next failure or a session switch. Pending permissions/forms refetch on every live transition.
- Reconnect uses a bounded backoff with an idle watchdog; the connection state is visible (a statusline dot and a banner while offline), never silent.

## Ingest discipline

- **Cap every text payload at ingest** — `PAYLOAD_MAX_CHARS` (50 000) with `PAYLOAD_ELISION`, applied to tool output, shell output, text/reasoning deltas *and* their `.ended` counterparts, and to a tool's input record (`tool.called`) up to a depth limit. The render cap `TOOL_CONTENT_MAX_CHARS` (2 000) is the collapsed head and stays smaller than the ingest cap, or a collapsed row renders whole and the collapsed/expanded state means nothing.
- Counting lines, heads and tails on a payload is done by **index scans**, never by splitting into arrays.
- `session.shell.ended` is a **paged object** — cap its `output.output`; no row renders a shell message body.
- Highlighting, markdown parsing and memo caches obey spec 020's rules (debounce, memo on `(language, code)`, memos bounded by key bytes).
- Row memoisation is the load-bearing optimisation: `React.memo` on a parts-identity comparator plus a memoised row list keyed on the transcript identity. Measure re-renders per delta, do not assume.

## Sessions, commands, replies

- **Sessions**: `session.list({ parentID: null, order: "desc", limit: SESSION_PAGE_LIMIT })` for recents and the picker (root sessions only); `session.create()` in a chosen directory for a new session; `session.active()` to hydrate which sessions are running; `session.list({ parentID })` for a subagent list.
- **Sending**: `session.prompt({ sessionID, text, files?, agents?, skills? })`. The documented payload is flat; the generated input type is a codegen artifact, so the call is issued flat behind one typed seam (`src/session/actions.ts`) — never construct a wrapped `{ id: … }` payload.
- **Seeding without a model** (`{ resume: false }`) is used only by tests and browser proofs, never by the app.
- **Interrupt**: `session.interrupt({ sessionID })`, gated on the session's execution state — not on a local "streaming" flag.
- **Commands**: the composer's menu is the union of the server's `command.list()` and the app's client commands; the server's list loads asynchronously (an empty first read is normal). Accepting a server command inserts `/<name> ` and sends nothing; a client command is executed by the app and never becomes a prompt.
- **Replies**: a permission reply uses `decision: "once" | "always" | "reject"`; a form reply sends the form's own answer shape, and both are issued against the session the dock belongs to.
- **Model/agent switch**: `session.switchModel` / `session.switchAgent`, with the picker data from `model.list` / `agent.list` (and `model.default` for the default).
- **VCS**: `vcs.get()` right after a location is activated returns an empty branch — read it with a **bounded retry**; never call `vcs.init` from the client (it is a write and would create a repository).

## What the app does not do

- It does not talk to raw HTTP routes when the pinned client exposes the method; the client is the single seam.
- It does not call `debug.*`, `migration.*` or the persistent-PTY routes in v1.
- It does not prompt into a session from a test against the **registered** service: every automated proof runs its own isolated server with all four XDG dirs redirected (`XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CONFIG_HOME`, `XDG_CACHE_HOME`) — sessions live under `XDG_DATA_HOME`, so redirecting state alone still writes the real database.

## Acceptance

- Kill the server mid-turn: the app shows an offline banner with the url, keeps the transcript it has, and resumes streaming after the server returns (refetch per the resync policy, no duplicate rows).
- A session with a long tool output renders collapsed with a correct `(N more lines)` count, expands to the capped payload, and never re-parses per delta.
- Two sessions streaming at once both reduce; the inactive tab's dot shows running and its transcript is current when switched to.
- A queued prompt appears with the queued tone, and after delivery sits at the tail in enqueue order.
- The isolated-server test run leaves the registered service untouched (its session count is identical before and after).
