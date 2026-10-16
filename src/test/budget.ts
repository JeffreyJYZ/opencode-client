/**
 * The suite's wait policy (M1.4d): one polling budget, plus the one local bound a
 * genuinely heavy test needs. No other number in the suite is a wait.
 *
 * `@testing-library/dom`'s `waitFor` — and every `findBy*` built on it — is the
 * only instrument in these tests that measures **wall time**: it gives up on a
 * timeout, and that timeout is a real timer. On a loaded box the scheduler delays
 * it (measured on this machine: a raw 50 ms timer fired at 51 ms while RTL's own
 * poller first ticked at 3082 ms), so a poll that passes on a quiet machine can
 * redden a gate that runs beside three sibling suites.
 *
 * **Only the timeout is globally settable.** `configure()` takes no `interval`:
 * `waitFor`'s poll grid is a per-call option (`@testing-library/dom` 10.4.2
 * `dist/wait-for.js:19`) whose default of 50 ms has no config hook, so it stays
 * RTL's own number. This file therefore names the one budget a run can carry.
 *
 * Set once for the whole run in `src/test/preload.ts`, so no test file carries a
 * number of its own. A wait a test can satisfy by awaiting the thing itself is
 * still the first choice — `src/test/act`'s `flush` is that form, and this is the
 * fallback's bound, not the default.
 */

/**
 * How long one poll may take before it gives up (`asyncUtilTimeout`; RTL's own
 * default is 1000). Raised for headroom under load, and kept well inside bun's own
 * 5 s per-test bound — measured at load ~12, the timeout still fires on time (a
 * never-true `waitFor` failed at 3005 ms), so a test whose *single* poll starves
 * still fails as a `waitFor` timeout carrying its element error, not as an opaque
 * bun timeout.
 */
export const POLL_TIMEOUT_MS = 3000;

/**
 * The one test whose **work**, not its wait, is heavy: `src/docs/reference.test.ts`
 * spawns `scripts/generate-reference.ts` as a subprocess (~2.5 s idle on this
 * machine) and diffs its output against the committed module. Bun's default 5 s
 * per-test bound is sized for a test that mostly *waits*; here the test is idle
 * while a TypeScript-driven child runs, so under load the bound kills the test and
 * the child together and the failure reads as a wrong result — `run.exitCode`
 * comes back `null` when a killed child never exited.
 *
 * This is that test's own local bound, declared on the test itself, not a hidden
 * race: it guards liveness only (a generator that hangs still fails), no global
 * bound moves, and every other test keeps bun's own 5 s.
 */
export const GENERATOR_TIMEOUT_MS = 20_000;
