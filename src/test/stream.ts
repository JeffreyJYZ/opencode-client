import type {
	OpenCodeClient,
	SessionInboxInfo,
	SessionMessageInfo,
	V2Event,
} from "@opencode/client";

/**
 * The stream test double (spec 050 §Event ingest).
 *
 * Not `mock.module` (Bun's is process-wide and leaks): the fake is **injected** as
 * the client, so a test owns the frames, their order and the moment the stream ends.
 * The frames themselves come from `src/test/capture.ts` — captured, never shaped by
 * hand.
 */

export type FakeStream = {
	/** The iterable `client.event.subscribe` returns, one per subscription. */
	readonly subscribe: (options?: {
		signal?: AbortSignal;
		onActivity?: () => void;
	}) => AsyncIterable<V2Event>;
	/** Push a frame to the live subscription (queued until one exists). */
	readonly push: (event: V2Event) => void;
	/** End the live subscription (`end()`), or fail it (`end(error)`). */
	readonly end: (error?: unknown) => void;
	/** How many subscriptions have been opened — the "one subscription" evidence. */
	readonly subscriptions: () => number;
	/** Frames pushed but not yet consumed. */
	readonly pending: () => number;
};

type Waiter = {
	resolve: (result: IteratorResult<V2Event>) => void;
	reject: (error: unknown) => void;
};

export function fakeStream(): FakeStream {
	const queue: V2Event[] = [];
	const waiters: Waiter[] = [];
	/** The current subscription's activity hook: a frame or a keepalive reports it. */
	let activity: (() => void) | null = null;
	let done: { error?: unknown } | null = null;
	let subscriptions = 0;

	function deliver(): void {
		while (queue.length > 0 && waiters.length > 0) {
			const event = queue.shift() as V2Event;
			(waiters.shift() as Waiter).resolve({ done: false, value: event });
		}
	}

	function finish(error?: unknown): void {
		done = { error };
		while (waiters.length > 0) {
			const waiter = waiters.shift() as Waiter;
			if (error === undefined) waiter.resolve({ done: true, value: undefined });
			else waiter.reject(error);
		}
	}

	return {
		subscriptions: () => subscriptions,
		pending: () => queue.length,
		push: (event) => {
			// A frame is transport activity, as the real client's `onActivity` reports.
			activity?.();
			queue.push(event);
			deliver();
		},
		end: (error) => finish(error),
		subscribe: (options) => ({
			[Symbol.asyncIterator]() {
				subscriptions++;
				// A reconnect opens a fresh stream: the previous `end` does not carry.
				done = null;
				activity = options?.onActivity ?? null;
				return {
					next: () => {
						if (queue.length > 0) {
							const event = queue.shift() as V2Event;
							return Promise.resolve({ done: false, value: event });
						}
						if (done !== null) {
							return done.error === undefined
								? Promise.resolve({ done: true, value: undefined })
								: Promise.reject(done.error);
						}
						return new Promise<IteratorResult<V2Event>>((resolve, reject) => {
							waiters.push({ resolve, reject });
						});
					},
					return: () => Promise.resolve({ done: true, value: undefined }),
				};
			},
		}),
	};
}

/** A client whose stream, `message.list`, pending inbox and `session.active` are the test's. */
export function fakeClient(
	stream: FakeStream,
	messages: Record<string, { readonly data: readonly SessionMessageInfo[] }> = {},
	active: Record<string, unknown> = {},
	inbox: Record<string, readonly SessionInboxInfo[]> = {},
): { client: OpenCodeClient; listCalls: () => string[] } {
	const calls: string[] = [];
	const client = {
		event: { subscribe: stream.subscribe },
		message: {
			list: async (query: { sessionID: string }) => {
				calls.push(query.sessionID);
				return { data: [...(messages[query.sessionID]?.data ?? [])], cursor: {} };
			},
		},
		session: {
			active: async () => active,
			inbox: {
				list: async (query: { sessionID: string }) => [...(inbox[query.sessionID] ?? [])],
			},
		},
	} as unknown as OpenCodeClient;
	return { client, listCalls: () => calls };
}

/** A client whose stream never yields and never ends (the provider tests' stand-in). */
export function quietClient(): OpenCodeClient {
	return {
		event: {
			subscribe: () => ({
				[Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
			}),
		},
		session: { active: async () => ({}) },
		message: { list: async () => ({ data: [], cursor: {} }) },
	} as unknown as OpenCodeClient;
}
