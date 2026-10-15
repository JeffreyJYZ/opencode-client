import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { resetSettings } from "@/app/settings/store";
import { resetTabs } from "@/app/tabs";
import { NEW_SESSION_EVENT } from "@/constants/tabs";
import { NewSessionFlow } from "@/pages/NewSessionFlow";
import { ClientProvider } from "@/session/ClientProvider";
import { fakeProbe } from "@/test/session";

afterEach(cleanup);

beforeEach(() => {
	window.history.pushState(null, "", "/");
	resetSettings();
	resetTabs();
});

function makeClient(createImpl: (arg: unknown) => Promise<unknown>) {
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

describe("NewSessionFlow web fallback", () => {
	test("opens a text path input when no native picker", async () => {
		const client = makeClient(async () => ({
			id: "ses_w",
			location: { directory: "/tmp/w" },
		}));
		renderFlow({ client, pickerAvailable: false });
		await act(async () => {
			dispatchNew();
			await new Promise((r) => setTimeout(r, 0));
		});
		const input = await screen.findByLabelText(/Directory/);
		expect(input).toBeDefined();
	});

	test("web fallback preselects last-used directory", async () => {
		const client = makeClient(async () => ({
			id: "ses_w2",
			location: { directory: "/used" },
		}));
		renderFlow({ client, pickerAvailable: false });
		await act(async () => {
			dispatchNew();
			await new Promise((r) => setTimeout(r, 0));
		});
		const input = screen.getByLabelText(/Directory/) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "/used" } });
		await act(async () => {
			const btn = screen.getByText("Create");
			fireEvent.click(btn);
			await new Promise((r) => setTimeout(r, 0));
		});
		await act(async () => {
			dispatchNew();
			await new Promise((r) => setTimeout(r, 0));
		});
		const input2 = screen.getByLabelText(/Directory/) as HTMLInputElement;
		expect(input2.value).toBe("/used");
	});

	test("web fallback renders chips and one click creates", async () => {
		const client = makeClient(async () => ({
			id: "ses_chip",
			location: { directory: "/chipdir" },
		}));
		renderFlow({ client, pickerAvailable: false });
		await act(async () => {
			dispatchNew();
			await new Promise((r) => setTimeout(r, 0));
		});
		const input = screen.getByLabelText(/Directory/) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "/chipdir" } });
		await act(async () => {
			fireEvent.click(screen.getByText("Create"));
			await new Promise((r) => setTimeout(r, 0));
		});
		await act(async () => {
			dispatchNew();
			await new Promise((r) => setTimeout(r, 0));
		});
		expect(screen.getByText("/chipdir")).toBeDefined();
	});
});
