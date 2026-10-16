# opencode client API — what this app can call

Reference for the app's link to the local opencode server. Everything here was read out of the pinned
artifacts, not recalled:

- **Client**: `@opencode/client` **2.0.29** — the version this repo pins (`package.json` `^2.0.29`, `bun.lock`) — promise entry — `dist/promise/client.d.ts` (method surface), `dist/promise/generated/types.d.ts` (payload types), `dist/promise/api.d.ts` (per-namespace aliases).
- **Routes**: `/Users/jyz/dev/monorepos/opencode/packages/protocol/src/groups/*.ts` (132 endpoints; each `HttpApiEndpoint.<verb>("<id>", "<path>")`).
- **Events**: `packages/schema/src/event-manifest.ts` + the per-domain `*-event.ts` / `<domain>.ts` files, and the `V2Event` union in the generated types.
- **Schemas**: `packages/schema/src/*.ts` in the same (read-only) mirror.

Local service on this machine: **2.0.29** (`~/.local/state/opencode/service.json` → `version`, `url`,
`password`). Pin and server drift is fine until a payload changes shape; the client moved to 2.0.29 with M0.5, so today there is none.

## 1. Getting a client

```ts
import { OpenCode } from "@opencode/client";        // ./promise by default
const client = OpenCode.make({ baseUrl, headers }); // OpenCodeClient = ReturnType<typeof make>
```

`ClientOptions = { baseUrl: string, fetch?: typeof fetch, headers?: RequestInit["headers"] }`.
Every method takes a trailing `requestOptions?: { signal?, headers?, onActivity? }`.

Auth is HTTP Basic: the service file's `password` (username any non-empty string, the shipped one uses
`opencode`). In a browser the token can also ride the URL as `?auth_token=<base64 basic>`.

Service discovery (Node/Bun side, not the browser):

```ts
import { Service } from "@opencode/client/service"; // discover() | ensure() | stop() | headers()
const endpoint = await Service.discover(); // { url, auth: { type: "basic", username, password } | undefined }
```

Two host-specific traps, both measured on the previous build:

- The server's CORS allowlist **reflects any `localhost`/`127.0.0.1` origin on any port** (and `tauri://localhost`), and omits the header for a non-local origin — measured with curl against an isolated server in M0.5, which is why a browser proof needs no proxy. `baseUrl` must still be handed to the page: a webview cannot read `service.json`. The shell resolves it in Rust and injects `window.__OC_TARGET__ = { url, password }` before the app's scripts (spec 010 §Window; M0.2).
- The dev server runs under **Node**, not Bun: `bun:sqlite` does not exist inside Vite middleware; `node:sqlite` does.

## 2. The event stream

```ts
for await (const event of client.event.subscribe({ signal })) {
  // V2Event — a discriminated union on `type`
}
```

`SubscribeOptions = { signal?: AbortSignal, onActivity?: () => void }`; `onActivity` fires on keepalive
frames too, so it is a liveness signal, not an event counter.

Three properties that decide the architecture:

1. **One stream carries every session.** Neither the stream nor the subscription is session-scoped, so filter on the payload's `sessionID` yourself.
2. **Volatile by contract** (`packages/protocol/src/groups/event.ts`): a slow consumer overflows and a disconnect loses events. Gaps are repaired by refetch (`session.messages`, `session.context`), never by replay.
3. **No `session.part.updated`, no `session.updated`.** Tool work arrives as discrete `session.tool.*` frames.

Event names by domain (manifest + `V2Event` union):

| Domain | Events |
| --- | --- |
| session (lifecycle) | `session.created`, `session.deleted`, `session.renamed`, `session.moved`, `session.forked`, `session.viewed`, `session.metadata.updated`, `session.agent.selected`, `session.model.selected`, `session.permissions`, `session.instructions.updated`, `session.synthetic`, `session.skill.activated` |
| session (execution) | `session.execution.started`, `session.execution.succeeded`, `session.execution.failed`, `session.execution.interrupted` |
| session (steps) | `session.step.started`, `session.step.streamed`, `session.step.ended`, `session.step.failed` |
| session (content) | `session.text.started`, `session.text.delta`, `session.text.ended`, `session.reasoning.started`, `session.reasoning.delta`, `session.reasoning.ended`, `session.message.content.updated`, `session.retry.scheduled` |
| session (tools) | `session.tool.called`, `session.tool.input.started`, `session.tool.input.delta`, `session.tool.input.ended`, `session.tool.progress`, `session.tool.success`, `session.tool.failed` |
| session (inbox) | `session.inbox.enqueued`, `session.inbox.delivered`, `session.inbox.cancelled`, `session.inbox.delivery.changed` |
| session (compaction / revert / usage) | `session.compaction.started`, `session.compaction.delta`, `session.compaction.ended`, `session.compaction.failed`, `session.compacted`, `session.revert.staged`, `session.revert.cleared`, `session.revert.committed`, `session.usage.recorded`, `session.usage.updated` |
| session (status) | `session.status`, `session.idle` |
| session (shell) | `session.shell.started`, `session.shell.ended` |
| permissions / forms | `permission.asked`, `permission.replied`, `form.created`, `form.replied`, `form.cancelled` |
| mcp | `mcp.status.changed`, `mcp.tools.changed`, `mcp.resources.changed` |
| providers & models | `provider.updated`, `model.updated`, `agent.updated`, `integration.updated`, `credential.updated`, `credential.switched`, `modelsDev.refreshed` |
| vcs / files / refs | `vcs.branch.updated`, `filesystem.changed`, `reference.updated` |
| shells & ptys | `shell.created`, `shell.exited`, `shell.deleted`, `pty.created`, `pty.updated`, `pty.exited`, `pty.deleted`, persistent-pty add/remove |
| worktrees / projects / plugins | `worktree.ready`, `worktree.failed`, `worktree.resolved`, `worktree.updated`, `project.updated`, `plugin.updated`, `skill.updated`, `command.updated`, `config.updated` |
| workspace / search | `workspace.status`, `workspace.ready`, `workspace.failed`, `websearch.updated` |
| transport | `server.connected`, `global.disposed`, `location.shutdown` |
| installation | `installation.updated`, `installation.update.available` |
| tui (keyboard-dispatched, no web equivalent) | `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`, `tui.session.select`, `tui.agent.cycle`, `tui.prompt.clear`, `tui.prompt.submit`, `tui.session.*` (new/list/compact/share/interrupt/background/first/last/page/half-page/line) |

## 3. Client surface (promise API, 2.0.29)

Every name below exists in `dist/promise/client.d.ts`. `input?` = optional argument; `→` is the resolved
output type.

| Namespace | Methods |
| --- | --- |
| `server` | `info()`, `pair()`, `connect(input)` |
| `event` | `subscribe(options?) → AsyncIterable<V2Event>` |
| `location` | `get(input?)`, `reload()` |
| `agent` | `list(input?)`, `get(input)` |
| `plugin` | `list(input?)`, `check(input?)`, `update(input)` |
| `session` | `list(input?) → SessionsResponse`, `get`, `create(input?) → SessionInfo`, `import`, `export`, `active() → Record<string, SessionActive>`, `remove`, `fork`, `switchAgent`, `switchModel`, `update`, `move`, `prompt(input) → SessionInboxUser`, `command`, `skill`, `synthetic`, `shell`, `compact`, `wait`, `context(input) → SessionMessageInfo[]`, `diff(input) → FileDiffInfo[]`, `generate(input) → { text }`, `log(input) → AsyncIterable`, `interrupt(input)`, `background(input)`, `environment`, `view`, `stats(input?)` |
| `session.revert` | `stage`, `clear`, `commit` |
| `session.inbox` | `list`, `cancel`, `update` |
| `session.form` | `list → FormInfo[]`, `create → FormInfo`, `get → FormDetail`, `reply`, `cancel` |
| `session.instructions.entry` | `list`, `put`, `remove` |
| `session.message` | `get(input) → <the message union>` |
| `message` | `list(input) → SessionMessagesResponse` |
| `model` | `list(input?)`, `default(input?)` |
| `generate` | `text(input) → { text }` |
| `provider` | `list(input?)`, `get(input)` |
| `integration` | `list(input?)`, `get(input)`, `wellknown.add`, `connect.key`, `connect.external`, `oauth.{connect,status,complete,cancel}`, `command.{connect,status,cancel}` |
| `mcp` | `list(input?) → McpListOutput`, `add`, `remove`, `connect`, `disconnect`, `resource.catalog(input?)` |
| `credential` | `list()`, `create`, `update`, `activate`, `remove` |
| `project` | `list(input?)`, `update(input)` |
| `form` | `list(input?)` |
| `permission` | `request.list`, `saved.list`, `saved.remove`, `create(input) → { id, effect }`, `list(input) → PermissionRequest[]`, `get(input)`, `reply(input)` |
| `file` | `read`, `list`, `find`, `write` |
| `command` | `list(input?) → CommandListOutput` |
| `skill` | `list(input?)` |
| `pty` | `list`, `create`, `get`, `update`, `remove`, `connect.token` |
| `experimental.persistentPty` | `list`, `read`, `create`, `get`, `update`, `snapshot`, `remove`, `connectToken`, `handoff`, `shutdown` |
| `shell` | `list`, `create`, `get`, `output`, `remove` |
| `reference` | `list(input?)` |
| `worktree` | `list`, `create`, `remove`, `refresh` |
| `vcs` | `init`, `get`, `base`, `status`, `branch.list`, `diff` |
| `config` | `get(input?)`, `shells()`, `update(input)` |
| `websearch` | `providers(input?)`, `query(input)` |
| `debug` | `location.list()`, `location.evict(input?)` |
| `migration` | `v1.status()` |
| `rpc` | `call(input, requestOptions?)` |

`Client["<namespace>"]` is also exported as a named type (`SessionApi`, `McpApi`, `VcsApi`, … in
`api.d.ts`) — use those for prop types instead of reaching into `ReturnType<typeof make>`.

## 4. Payload shapes and traps

Measured against client 2.0.29 / server 2.0.29; each one cost time the first time.

- **`session.prompt` is flat**: `{ sessionID, text, files?, agents?, skills?, metadata?, delivery?, resume? }`. The generated `SessionPromptInput` is a codegen artifact — each field's type is expressed as `Payload["field"]` and a vestigial optional `id` rides along — so it does not typecheck cleanly as a literal. Pass the flat object and cast at one documented seam (the previous build's `src/session/actions.ts` did exactly that and the server accepted it).
- **Seeding a session without a model**: `session.prompt({ text, resume: false })` durably enqueues a user input *without executing it* — no model turn — emits `session.inbox.enqueued`, and `message.list` stays empty until delivery. That is how a browser proof fills a transcript on a credential-less server.
- **`session.create()` accepts flat `{}`** at runtime; only the generated `SessionCreateInput` wraps the payload in the same artifact, so the cast is type-level only.
- **`session.list({ parentID: null, order: "desc", limit })`** is the real root-session query: the flat query works at runtime through the pinned client, and the default page of 50 holds few roots (measured: 73 roots once children are excluded). Rows carry `location.directory` and `time.updated` as epoch **milliseconds**.
- **`cursor.next` is NOT an end-of-list signal** (measured 2026-10-15 against an isolated server with three root sessions, auth via the serve log's password): with **`limit=50` — every session on one page — the response still carries both `cursor.previous` and `cursor.next`**, an opaque base64 anchor `{order, parentID, anchor:{id, time, direction}}` rather than a "has more" flag, and this response shape has **no `hasNext`**. So `Boolean(cursor.next)` costs **one wasted request**, not an endless loop: following it terminates at the page one past the last row, which comes back `data: []` with **no** `next` (measured twice — mine and the review's — with `limit=2`: pages of 2, 2, 2, then `rows: 0, next: no`). The exact rule is `hasMore = data.length === pageSize && Boolean(cursor?.next)` on the **raw** count before the app's root-only filter: it is exact when the total is not a multiple of the page size, while an exact-multiple total still costs **one empty terminal request** — unavoidable without an end signal from the server (that was `M1.4`'s bug, fixed in `M1.4b`).
- **A wrong API path does not 404 — it serves the app shell.** `GET /session` (missing the `/api` prefix) returned **HTTP 200 with the SPA's HTML**, so a typo'd route looks like a successful call that returned a page. Take every path from §5's table, and treat a non-JSON body as a wrong path rather than an empty result.
- **Permission replies** use `decision: "once" | "always" | "reject"` (`PermissionReply`), not a generic reply field.
- **A tool part's anchor is `path`, not `filePath`**: `read`/`write`/`edit` carry `path`, `grep`/`glob` `pattern` + `path`, `shell` `command` + `workdir`.
- **`Tool.Content = TextContent | FileContent`** — there is no diff part, so a diff renders from text.
- **`mcp.list()` returns `{ location, data: McpServer[] }`** and `McpServer = { name, status: { status, error? }, integrationID? }` — that is all the per-server detail that exists; `mcp.resource.catalog` is resources, not metadata.
- **An `mcp.servers` config block does not reach a location on 2.0.29** (`/api/mcp` stays `[]` even though `/api/config` lists the document). A live MCP row needs the experimental route: `PUT /api/experimental/mcp/:server` with `{ config: { type: "local", command: [...] } }`.
- **`vcs.get()` resolves asynchronously per location**: `{"branch":{}}` immediately after the location is activated, the real branch ~0.5 s later — retry with a bound, and never call `/api/vcs/init` to prime it (it is a write; it creates a repository in a non-repo directory).
- **`form.created` nests its session one level down, at `data.form.sessionID`**, unlike `permission.asked`/`permission.replied` and every other frame, which carry `data.sessionID` (measured by `M2.6` during a live proof: a form created mid-session never reached its dock because the store refused the frame before any handler saw it). Any reader that resolves a frame's session must know both shapes — the app's one reader is `dockSignal.dockSessionIDOf`.
- **Commands come from the session's location, per file** — a `command/<name>.md` under the location (measured 2026-10-16: a global `commands` map did nothing; a per-location `command/<name>.md` did) — and they load **asynchronously**: a `command.list()` right after `session.create()` can still be `[]`. `session.command` is the only way a command's template expands, and §3's method table previously omitted it.
- **The client exposes no `permission` namespace and no "create request" method** — the raw routes exist (`session.permission.list`/`get`/`create`/`reply`, §5), and a pending request is created by the *server* when a model asks, so a proof that needs a pending request must seed it through the documented POST.
- **Streaming payloads must be capped on ingest, not only at render** — a `tool.success` body or a `shell.ended` output arrives whole and a delta/`ended` pair re-inflates whatever streaming trimmed. Note `shell.ended` is paged (`output.output`).
- **`session.text.delta` carries `ordinal: 0` on every frame** (measured 2026-10-15 against an isolated server, by capturing the frames before writing the reducer): it is a part index **within its family** — reasoning vs prose — not a delta counter. So a rule that treats a non-increasing ordinal as a duplicate, or an out-of-order arrival, **drops real deltas**; the app keys rows as `${message.id}:{r|t}${ordinal}` and counts the ordinal per family.
- **`durable.seq` is per session, and `item.delivery` is not the queued rail** (same capture): there is no global sequence number, and whether a message was delivered comes from the delivery field's own values, never from its presence.
- **A content-sized pane in a flex column needs `flex-shrink: 0`**, or it shrinks to fit instead of overflowing and a long transcript is silently clipped; `overflow-y: auto` alone does not fix it.

## 5. HTTP routes (132 endpoints)

Straight out of `packages/protocol/src/groups/*.ts`; each is `HttpApiEndpoint.<verb>("<id>", "<path>")`, so the
path here is the declared one (an endpoint may be mounted under a location prefix). Query and body schemas
live in the group file named in the last column.

| endpoint id | verb | path | declared in |
| --- | --- | --- | --- |
| `agent.list` | GET | `/api/agent` | `agent.ts` |
| `agent.get` | GET | `/api/agent/:agentID` | `agent.ts` |
| `command.list` | GET | `/api/command` | `command.ts` |
| `config.get` | GET | `/api/config` | `config.ts` |
| `config.shells` | GET | `/api/config/shell` | `config.ts` |
| `config.update` | PATCH | `/api/experimental/config` | `config.ts` |
| `credential.remove` | DELETE | `/api/credential/:credentialID` | `credential.ts` |
| `credential.list` | GET | `/api/credential` | `credential.ts` |
| `credential.update` | PATCH | `/api/credential/:credentialID` | `credential.ts` |
| `credential.create` | POST | `/api/credential` | `credential.ts` |
| `credential.activate` | POST | `/api/credential/:credentialID/activate` | `credential.ts` |
| `debug.location.evict` | DELETE | `/api/debug/location` | `debug.ts` |
| `debug.location` | GET | `/api/debug/location` | `debug.ts` |
| `event.subscribe` | GET | `/api/event` | `event.ts` |
| `form.list` | GET | `/api/form` | `form.ts` |
| `fs.find` | GET | `/api/fs/find` | `fs.ts` |
| `fs.list` | GET | `/api/fs/list` | `fs.ts` |
| `fs.read` | GET | `/api/fs/read/*` | `fs.ts` |
| `fs.write` | POST | `/api/experimental/fs/write` | `fs.ts` |
| `generate.text` | POST | `/api/experimental/generate` | `generate.ts` |
| `integration.command.cancel` | DELETE | `/api/integration/:integrationID/connect/command/:attemptID` | `integration.ts` |
| `integration.oauth.cancel` | DELETE | `/api/integration/:integrationID/connect/oauth/:attemptID` | `integration.ts` |
| `integration.list` | GET | `/api/integration` | `integration.ts` |
| `integration.get` | GET | `/api/integration/:integrationID` | `integration.ts` |
| `integration.command.status` | GET | `/api/integration/:integrationID/connect/command/:attemptID` | `integration.ts` |
| `integration.oauth.status` | GET | `/api/integration/:integrationID/connect/oauth/:attemptID` | `integration.ts` |
| `integration.wellknown.add` | POST | `/api/experimental/integration/wellknown` | `integration.ts` |
| `integration.command.connect` | POST | `/api/integration/:integrationID/connect/command` | `integration.ts` |
| `integration.connect.external` | POST | `/api/integration/:integrationID/connect/external` | `integration.ts` |
| `integration.connect.key` | POST | `/api/integration/:integrationID/connect/key` | `integration.ts` |
| `integration.oauth.connect` | POST | `/api/integration/:integrationID/connect/oauth` | `integration.ts` |
| `location.get` | GET | `/api/location` | `location.ts` |
| `location.reload` | POST | `/api/location/reload` | `location.ts` |
| `mcp.remove` | DELETE | `/api/experimental/mcp/:server` | `mcp.ts` |
| `mcp.list` | GET | `/api/mcp` | `mcp.ts` |
| `mcp.resource.catalog` | GET | `/api/mcp/resource` | `mcp.ts` |
| `mcp.connect` | POST | `/api/experimental/mcp/:server/connect` | `mcp.ts` |
| `mcp.disconnect` | POST | `/api/experimental/mcp/:server/disconnect` | `mcp.ts` |
| `mcp.add` | PUT | `/api/experimental/mcp/:server` | `mcp.ts` |
| `session.messages` | GET | `/api/session/:sessionID/message` | `message.ts` |
| `migration.v1.status` | GET | `/api/experimental/migration/v1` | `migration.ts` |
| `model.list` | GET | `/api/model` | `model.ts` |
| `model.default` | GET | `/api/model/default` | `model.ts` |
| `permission.saved.remove` | DELETE | `/api/permission/saved/:id` | `permission.ts` |
| `permission.request.list` | GET | `/api/permission/request` | `permission.ts` |
| `permission.saved.list` | GET | `/api/permission/saved` | `permission.ts` |
| `session.permission.list` | GET | `/api/session/:sessionID/permission` | `permission.ts` |
| `session.permission.get` | GET | `/api/session/:sessionID/permission/:requestID` | `permission.ts` |
| `session.permission.create` | POST | `/api/session/:sessionID/permission` | `permission.ts` |
| `session.permission.reply` | POST | `/api/session/:sessionID/permission/:requestID/reply` | `permission.ts` |
| `persistentPty.remove` | DELETE | `/api/experimental/persistent-pty/:ptyID` | `persistent-pty.ts` |
| `persistentPty.get` | GET | `/api/experimental/persistent-pty/:ptyID` | `persistent-pty.ts` |
| `persistentPty.connect` | GET | `/api/experimental/persistent-pty/:ptyID/connect` | `persistent-pty.ts` |
| `persistentPty.snapshot` | GET | `/api/experimental/persistent-pty/:ptyID/snapshot` | `persistent-pty.ts` |
| `persistentPty.list` | GET | `/api/experimental/session/:sessionID/terminal` | `persistent-pty.ts` |
| `persistentPty.read` | GET | `/api/experimental/session/:sessionID/terminal/read` | `persistent-pty.ts` |
| `persistentPty.connectToken` | POST | `/api/experimental/persistent-pty/:ptyID/connect-token` | `persistent-pty.ts` |
| `persistentPty.handoff` | POST | `/api/experimental/persistent-pty/handoff` | `persistent-pty.ts` |
| `persistentPty.shutdown` | POST | `/api/experimental/persistent-pty/shutdown` | `persistent-pty.ts` |
| `persistentPty.create` | POST | `/api/experimental/session/:sessionID/terminal` | `persistent-pty.ts` |
| `persistentPty.update` | PUT | `/api/experimental/persistent-pty/:ptyID` | `persistent-pty.ts` |
| `plugin.list` | GET | `/api/plugin` | `plugin.ts` |
| `plugin.check` | POST | `/api/plugin/check` | `plugin.ts` |
| `plugin.update` | POST | `/api/plugin/update` | `plugin.ts` |
| `provider.list` | GET | `/api/provider` | `provider.ts` |
| `provider.get` | GET | `/api/provider/:providerID` | `provider.ts` |
| `pty.remove` | DELETE | `/api/pty/:ptyID` | `pty.ts` |
| `pty.list` | GET | `/api/pty` | `pty.ts` |
| `pty.get` | GET | `/api/pty/:ptyID` | `pty.ts` |
| `pty.connect` | GET | `/api/pty/:ptyID/connect` | `pty.ts` |
| `pty.create` | POST | `/api/pty` | `pty.ts` |
| `pty.connectToken` | POST | `/api/pty/:ptyID/connect-token` | `pty.ts` |
| `pty.update` | PUT | `/api/pty/:ptyID` | `pty.ts` |
| `reference.list` | GET | `/api/reference` | `reference.ts` |
| `rpc.call` | POST | `/api/rpc/:rpcID/:method` | `rpc.ts` |
| `server.info` | GET | `/api/info` | `server.ts` |
| `server.connect` | GET | `/auth/connect/:code` | `server.ts` |
| `server.pair` | POST | `/api/pair` | `server.ts` |
| `session.remove` | DELETE | `/api/session/:sessionID` | `session.ts` |
| `session.form.cancel` | DELETE | `/api/session/:sessionID/form/:formID` | `session.ts` |
| `session.inbox.cancel` | DELETE | `/api/session/:sessionID/inbox/:inboxID` | `session.ts` |
| `session.revert.clear` | DELETE | `/api/session/:sessionID/revert` | `session.ts` |
| `session.export` | GET | `/api/experimental/session/:sessionID/export` | `session.ts` |
| `session.log` | GET | `/api/experimental/session/:sessionID/log` | `session.ts` |
| `session.stats` | GET | `/api/experimental/session/stats` | `session.ts` |
| `session.list` | GET | `/api/session` | `session.ts` |
| `session.get` | GET | `/api/session/:sessionID` | `session.ts` |
| `session.context` | GET | `/api/session/:sessionID/context` | `session.ts` |
| `session.diff` | GET | `/api/session/:sessionID/diff` | `session.ts` |
| `session.form.list` | GET | `/api/session/:sessionID/form` | `session.ts` |
| `session.form.get` | GET | `/api/session/:sessionID/form/:formID` | `session.ts` |
| `session.inbox.list` | GET | `/api/session/:sessionID/inbox` | `session.ts` |
| `session.message` | GET | `/api/session/:sessionID/message/:messageID` | `session.ts` |
| `session.active` | GET | `/api/session/active` | `session.ts` |
| `session.update` | PATCH | `/api/session/:sessionID` | `session.ts` |
| `session.inbox.update` | PATCH | `/api/session/:sessionID/inbox/:inboxID` | `session.ts` |
| `session.skill` | POST | `/api/experimental/session/:sessionID/skill` | `session.ts` |
| `session.wait` | POST | `/api/experimental/session/:sessionID/wait` | `session.ts` |
| `session.import` | POST | `/api/experimental/session/import` | `session.ts` |
| `session.create` | POST | `/api/session` | `session.ts` |
| `session.switchAgent` | POST | `/api/session/:sessionID/agent` | `session.ts` |
| `session.background` | POST | `/api/session/:sessionID/background` | `session.ts` |
| `session.command` | POST | `/api/session/:sessionID/command` | `session.ts` |
| `session.compact` | POST | `/api/session/:sessionID/compact` | `session.ts` |
| `session.fork` | POST | `/api/session/:sessionID/fork` | `session.ts` |
| `session.form.create` | POST | `/api/session/:sessionID/form` | `session.ts` |
| `session.form.reply` | POST | `/api/session/:sessionID/form/:formID/reply` | `session.ts` |
| `session.generate` | POST | `/api/session/:sessionID/generate` | `session.ts` |
| `session.interrupt` | POST | `/api/session/:sessionID/interrupt` | `session.ts` |
| `session.switchModel` | POST | `/api/session/:sessionID/model` | `session.ts` |
| `session.move` | POST | `/api/session/:sessionID/move` | `session.ts` |
| `session.prompt` | POST | `/api/session/:sessionID/prompt` | `session.ts` |
| `session.revert.commit` | POST | `/api/session/:sessionID/revert/commit` | `session.ts` |
| `session.revert.stage` | POST | `/api/session/:sessionID/revert/stage` | `session.ts` |
| `session.shell` | POST | `/api/session/:sessionID/shell` | `session.ts` |
| `session.synthetic` | POST | `/api/session/:sessionID/synthetic` | `session.ts` |
| `session.view` | POST | `/api/session/:sessionID/view` | `session.ts` |
| `session.environment` | PUT | `/api/session/:sessionID/environment` | `session.ts` |
| `shell.remove` | DELETE | `/api/shell/:id` | `shell.ts` |
| `shell.list` | GET | `/api/shell` | `shell.ts` |
| `shell.get` | GET | `/api/shell/:id` | `shell.ts` |
| `shell.output` | GET | `/api/shell/:id/output` | `shell.ts` |
| `shell.create` | POST | `/api/shell` | `shell.ts` |
| `skill.list` | GET | `/api/skill` | `skill.ts` |
| `vcs.get` | GET | `/api/vcs` | `vcs.ts` |
| `vcs.base` | GET | `/api/vcs/base` | `vcs.ts` |
| `vcs.branch.list` | GET | `/api/vcs/branch` | `vcs.ts` |
| `vcs.diff` | GET | `/api/vcs/diff` | `vcs.ts` |
| `vcs.status` | GET | `/api/vcs/status` | `vcs.ts` |
| `vcs.init` | POST | `/api/vcs/init` | `vcs.ts` |
| `websearch.providers` | GET | `/api/websearch/provider` | `websearch.ts` |
| `websearch.query` | POST | `/api/websearch` | `websearch.ts` |

## 6. Where to look next

- Payload types: `node_modules/@opencode/client/dist/promise/generated/types.d.ts` (8914 lines) — inputs are `{ field: Payload["field"] }` artifacts, outputs are plain.
- Route bodies and schemas: `/Users/jyz/dev/monorepos/opencode/packages/protocol/src/groups/<name>.ts` and `/Users/jyz/dev/monorepos/opencode/packages/schema/src/<name>.ts` (read-only mirror).
- Client method list: `node_modules/@opencode/client/dist/promise/client.d.ts`.
- Event names: `/Users/jyz/dev/monorepos/opencode/packages/schema/src/event-manifest.ts`, which re-exports the per-domain `*-event.ts` files.
- A working call site for nearly every endpoint: `/Users/jyz/dev/apps/opencode-tauri-client-legacy/src/` (abandoned build — read it, never restore it).
