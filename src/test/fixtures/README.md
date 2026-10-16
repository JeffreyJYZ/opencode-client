# Captured stream fixtures

Two files, both captured from the same isolated server and both **verbatim**:

- `m21-stream.jsonl` — one real event frame per line, as the `event.subscribe` stream sent it.
- `m21-messages.json` — the real `GET /api/session/:id/message?order=desc&limit=50`
  responses for the fixture's two sessions, keyed by session id, so a refetch test
  maps the server's own message shapes instead of a remembered one.

`m21-stream.jsonl` is **verbatim** output: one real event frame per line, JSON as the
server sent it. Nothing here is transcribed or hand-shaped — a fixture that models a
shape the server cannot send proves nothing, and that mistake hid a real defect in M1.4.

- Server **2.0.29** (matches the pinned client), isolated: `opencode serve` with
  **all four** XDG dirs redirected outside the repo, so nothing under
  `~/.local/state/opencode/` was read or written.
- Captured with `bun scripts/capture-stream.ts <url> <password> <out.jsonl> <seconds>`
  (the client seam the app uses, not raw routes), on 2026-10-15.
- 66 frames, 34 distinct event types, **two sessions** — the stream carries every
  session, so a fixture with one would not exercise the ingest's session filter.

What it deliberately shows:

- `server.connected` — the frame with no `created`, no `durable`, and `data: {}`.
- `session.inbox.enqueued` with `item.delivery: "steer"` for **both** a seeded and a
  real prompt: `delivery` is not the queued-vs-delivered rail, the **event** is.
- `session.text.delta` / `session.reasoning.delta` whose `ordinal` is **`0` on every
  delta of a message** — `ordinal` is the content-part index, not a delta counter.
- `session.shell.ended` carrying the **paged** `output.output`.
- `session.step.failed` + `session.execution.failed` with a `SessionStructuredError`.
- Frames the ingest must **refuse or ignore**: `mcp`-less globals, `worktree.resolved`,
  `vcs.branch.updated`, `session.renamed`, `models-dev.refreshed`.

Missing, and why: `session.tool.*` frames need a model that calls a tool, and the
isolated server's only usable model answered in prose. Tool payloads are read from the
pinned generated types (`dist/promise/generated/types.d.ts`), which is where
`docs/opencode-api.md` §4's shapes come from — say so in a report rather than passing a
typed literal off as captured.

## Captured dock fixtures (M2.6)

`m25-docks.json` and `m25-docks-frames.jsonl`, both **verbatim** from one isolated
2.0.29 server (all four XDG dirs redirected), captured 2026-10-16 with
`bun scripts/capture-docks.ts <url> <password> <out.json> <frames.jsonl> <seconds>`:

- `m25-docks.json` — the **two list responses the docks read**: `permission.list({sessionID})`
  (one pending request, `action: "m25probe"`) and `session.form.list({sessionID})` (one
  form: a `string` field and a `multiselect` field with two options), keyed by session id.
- `m25-docks-frames.jsonl` — the two cue frames, `form.created` and `permission.asked`.

What it deliberately shows: a permission request's data is the **spread `Request.fields`**
(`action`, `resources`, `source` — no wrapping `request` key, `packages/schema/src/permission.ts`),
and a form's fields carry `placeholder` on `string` only and `options` as
`{value, label}` (`packages/schema/src/form.ts`) — the two shapes a hand-written fixture
would most likely get wrong.

Two facts the capture records rather than hides:

- The **permission request had to be seeded out of band**: the route exists
  (`POST /api/session/:id/permission`) but the pinned client exposes no create method for
  it — only `list`/`get`/`reply` — so `capture-docks.ts` posts it with one `fetch`, and
  the isolated config gives that action `effect: "ask"` (every action its default ruleset
  matches evaluates to `allow`, so no request would otherwise exist).
- The session directory is a **throwaway** path, and the action is a probe name no tool
  sends: nothing in this fixture claims a real agent asked for those resources.
