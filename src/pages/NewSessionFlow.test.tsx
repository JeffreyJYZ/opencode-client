import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
import { resetTabs } from "@/app/tabs";
import { NEW_SESSION_EVENT } from "@/constants/tabs";
import { NewSessionFlow } from "@/pages/NewSessionFlow";
import { ClientProvider } from "@/session/ClientProvider";
import { addRecentDirectory } from "@/session/recentDirectories";
import { fakeProbe } from "@/test/session";

afterEach(cleanup);

beforeEach(() => {
	window.history.pushState(null, "", "/");
	resetTabs();
});

function makeClient(createImpl: () => Promise<unknown>) {
	return {
		session: {
			list: () => Promise.resolve({ data: [] }),
			create: createImpl,
		},
		server: { info: () => Promise.resolve({ version: "2.0.29" }) },
	} as unknown;
}

function renderFlow(opts: {
	client: unknown;
	picker?: (d?: string) => Promise<string | null>;
	pickerAvailable?: boolean;
}) {
	const probe = fakeProbe("resolve");
	return render(
		<ClientProvider client={opts.client as never} probe={probe.run}>
			<NewSessionFlow picker={opts.picker} pickerAvailable={opts.pickerAvailable} />
		</ClientProvider>,
	);
}

function dispatchNew() {
	window.dispatchEvent(new CustomEvent(NEW_SESSION_EVENT));
}

describe("recentDirectories helper", () => {
	test("dedups and keeps newest first", () => {
		let list: string[] = [];
		list = addRecentDirectory(list, "/a");
		list = addRecentDirectory(list, "/b");
		list = addRecentDirectory(list, "/a");
		expect(list).toEqual(["/a", "/b"]);
	});
});

describe("NewSessionFlow native picker", () => {
	test("cancelled picker makes no create call", async () => {
		const create = () => Promise.resolve({ id: "ses_x", location: { directory: "/x" } });
		const client = makeClient(create);
		const spyCreate = (client as { session: { create: (...a: unknown[]) => unknown } }).session
			.create;
		const createSpy = (...a: unknown[]) => spyCreate(...a);
		(client as { session: { create: typeof createSpy } }).session.create = createSpy;
		let calls = 0;
		(client as { session: { create: (...a: unknown[]) => unknown } }).session.create = () => {
			calls++;
			return Promise.resolve({ id: "ses_x", location: { directory: "/x" } });
		};
		renderFlow({ client, picker: async () => null, pickerAvailable: true });
		await act(async () => {
			dispatchNew();
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(calls).toBe(0);
	});

	test("create failure renders its message", async () => {
		const client = makeClient(async () => {
			throw new Error("create exploded");
		});
		renderFlow({ client, picker: async () => "/tmp/d", pickerAvailable: true });
		await act(async () => {
			dispatchNew();
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(await screen.findByText("create exploded")).toBeDefined();
	});

	test("picker is preselected with last-used directory on second run", async () => {
		const client = makeClient(async () => ({ id: "ses_1", location: { directory: "/first" } }));
		const pickerCalls: (string | undefined)[] = [];
		const picker = async (d?: string) => {
			pickerCalls.push(d);
			if (pickerCalls.length === 1) return "/first";
			return null;
		};
		renderFlow({ client, picker, pickerAvailable: true });
		await act(async () => {
			dispatchNew();
			await new Promise((r) => setTimeout(r, 0));
		});
		await act(async () => {
			dispatchNew();
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(pickerCalls[1]).toBe("/first");
	});
});
