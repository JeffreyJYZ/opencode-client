import type { OpenCodeClient } from "@opencode/client";
import { type FakeStream, fakeStream } from "@/test/stream";

/**
 * The composer's test double (M2.5/M2.6), the factory half: a fake **client** injected
 * through `ClientProvider` — never `mock.module`, which is process-wide in Bun — that
 * records every call the composer and the docks make, so a test asserts the wire shape
 * rather than a component's internals.
 *
 * The three prompt-box sources (`command.list`, `agent.list`, `model.list`) and the two
 * dock lists (`permission.list`, `session.form.list`) are settable, because the tests
 * care about the two documented async behaviours: a `command.list()` that has not
 * answered yet, and a dock's list that changes between refetches.
 */

export type ComposerProbe = {
	readonly client: OpenCodeClient;
	readonly stream: FakeStream;
	readonly prompts: unknown[];
	readonly commandRuns: unknown[];
	readonly interrupts: unknown[];
	readonly permissionReplies: unknown[];
	readonly formReplies: unknown[];
	readonly formCancels: unknown[];
	readonly switches: unknown[];
	readonly setPermissions: (rows: readonly unknown[]) => void;
	readonly setForms: (rows: readonly unknown[]) => void;
	readonly setCommands: (rows: readonly { name: string; description?: string }[]) => void;
};

export type ComposerProbeOptions = {
	readonly commands?: readonly { name: string; description?: string }[];
	readonly permissions?: readonly unknown[];
	readonly forms?: readonly unknown[];
	readonly failPrompt?: boolean;
};

export function composerProbe(options: ComposerProbeOptions = {}): ComposerProbe {
	const stream = fakeStream();
	const prompts: unknown[] = [];
	const commandRuns: unknown[] = [];
	const interrupts: unknown[] = [];
	const permissionReplies: unknown[] = [];
	const formReplies: unknown[] = [];
	const formCancels: unknown[] = [];
	const switches: unknown[] = [];
	let commands = options.commands ?? [];
	let permissions = options.permissions ?? [];
	let forms = options.forms ?? [];

	const client = {
		event: { subscribe: stream.subscribe },
		session: {
			active: async () => ({}),
			get: async () => ({
				id: "ses_test",
				agent: "Build",
				model: { id: "test/model", providerID: "test" },
				location: { directory: "/tmp/m25" },
			}),
			prompt: async (input: unknown) => {
				prompts.push(input);
				if (options.failPrompt === true) throw new Error("refused");
				return { id: "msg_1", sessionID: "ses_test", type: "user" };
			},
			command: async (input: unknown) => {
				commandRuns.push(input);
			},
			interrupt: async (input: unknown) => {
				interrupts.push(input);
				return { interrupted: true };
			},
			switchAgent: async (input: unknown) => {
				switches.push(input);
			},
			switchModel: async (input: unknown) => {
				switches.push(input);
			},
			form: {
				list: async () => forms,
				reply: async (input: unknown) => {
					formReplies.push(input);
				},
				cancel: async (input: unknown) => {
					formCancels.push(input);
				},
			},
		},
		message: { list: async () => ({ data: [], cursor: {} }) },
		permission: {
			list: async () => permissions,
			reply: async (input: unknown) => {
				permissionReplies.push(input);
			},
		},
		command: { list: async () => ({ data: commands }) },
		agent: { list: async () => ({ data: [{ id: "build", name: "Build" }] }) },
		model: {
			list: async () => ({
				data: [{ id: "test/model", name: "Test model", providerID: "test", variants: [] }],
			}),
		},
		skill: { list: async () => ({ data: [] }) },
		file: { find: async () => ({ data: [] }) },
	} as unknown as OpenCodeClient;

	const setPermissions = (rows: readonly unknown[]) => {
		permissions = rows;
	};
	const setForms = (rows: readonly unknown[]) => {
		forms = rows;
	};
	const setCommands = (rows: readonly { name: string; description?: string }[]) => {
		commands = rows;
	};

	return {
		client,
		stream,
		prompts,
		commandRuns,
		interrupts,
		permissionReplies,
		formReplies,
		formCancels,
		switches,
		setPermissions,
		setForms,
		setCommands,
	};
}
