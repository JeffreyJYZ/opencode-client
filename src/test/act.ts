import { act } from "@testing-library/react";

/**
 * Drain the app's own pending microtask work — and the commit it schedules —
 * inside React's `act` (M1.4d).
 *
 * A test that must wait for a render, a reply or a refetch is waiting on the
 * app's own promise chain (`mount → list() → setState`, `reply → refetch →
 * setState`), never on a timer. `@testing-library`'s `waitFor` measures **wall
 * time**: its timeout and its poll interval are real timers that starve on a
 * loaded box (measured: a raw 50 ms timer fired at 51 ms while RTL's own poller
 * first ticked at 3082 ms), so a poll that passes on a quiet machine can redden a
 * gate that runs beside three sibling suites. Awaiting the chain itself cannot
 * starve: the flush yields to the microtask queue until the app's work — and the
 * commit it schedules — is done (measured to drain a multi-level chain in one
 * pass). A wait this cannot express, one whose condition the app only reaches
 * through a timer, is still a `waitFor`, bounded by `POLL_TIMEOUT_MS`.
 */
export async function flush(): Promise<void> {
	await act(async () => {});
}
