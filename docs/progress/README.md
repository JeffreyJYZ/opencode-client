# Progress — how this directory works

The plan is [`docs/specs/060-plan.md`](../specs/060-plan.md). Every task there has an id (`M0.1`, `M2.5`, …); this directory is the only place those ids carry a status.

## Statuses

| Status | Means |
| --- | --- |
| `todo` | not started |
| `doing` | someone is working on it now (name them in the note if it matters) |
| `blocked` | cannot proceed; the row **must** name what blocks it and the date it was raised |
| `done` | landed, with the evidence in the row |
| `dropped` | deliberately not done; the row says why, and the plan's own list is updated in the same change |

## Rules

- **A `done` row names its evidence**: the command that passed (`bun run verify`), the artifact it produced, or the acceptance item from the spec it satisfies. A claim is not evidence — if nobody ran it, the status is `doing`. The board's checkbox mirrors the status word each row ends with (`- [x] … **done**`).
- **Update in the same turn the work lands.** A stale board is worse than none: the next agent trusts it.
- **Never renumber an id.** An id is a stable handle; a task that changes shape keeps its id and gets a note, and a task that dies becomes `dropped`.
- **Specs hold intent, this directory holds state.** No status markers inside `docs/specs/` — the specs describe the target, not the weather.
- **Statuses travel with the code, not with a commit message.** A commit that lands a task updates its row; the reverse (a row updated later from memory) is how boards rot.

- **A milestone tally is a count, not an edit.** Two branches that each move a numerator merge **silently** into one increment while two rows are ticked, and a branch that ticks a row without touching the tally leaves it short — so after every landing, **recount the ticked rows** for that milestone and set the numerator to that number.

## Files

| File | Holds |
| --- | --- |
| `README.md` | this convention |
| `000-status.md` | the board: milestone roll-up, the per-id checklist, the decisions log |
| `m<N>-<topic>.md` | optional per-milestone log — append-only, dated headings, what landed and what surprised us |

A milestone log is where measurements and dead ends go, so the board stays one line per task. Write one when a milestone produced a number worth keeping (a render count, a payload size, a reconnect timing) or a trap that cost more than a few minutes.
