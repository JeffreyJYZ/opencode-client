import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getSettings, resetSettings } from "@/app/settings/store";
import { ConnectSection } from "@/components/ConnectSection";
import {
	CONNECT_BUTTON_TEXT,
	CONNECT_PASSWORD_LABEL,
	CONNECT_STATE_TEXT,
	CONNECT_URL_LABEL,
	DISCONNECT_BUTTON_TEXT,
} from "@/constants/connect";
import { TARGET_GLOBAL } from "@/constants/server";
import { ClientProvider } from "@/session/ClientProvider";
import { fakeProbe } from "@/test/session";

/** RTL installs auto-cleanup once per process; this is not its first importer. */
afterEach(cleanup);
afterEach(() => {
	resetSettings();
});

beforeEach(() => {
	window.history.pushState(null, "", "/settings");
	delete (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
});

const URL_VALUE = "http://127.0.0.1:5290";

function fill(url: string, password: string): void {
	fireEvent.change(screen.getByLabelText(CONNECT_URL_LABEL), { target: { value: url } });
	fireEvent.change(screen.getByLabelText(CONNECT_PASSWORD_LABEL), {
		target: { value: password },
	});
}

function submit(): void {
	const form = screen.getByText(CONNECT_BUTTON_TEXT).closest("form");
	if (form === null) throw new Error("the connect button is not inside its form");
	act(() => {
		fireEvent.submit(form);
	});
}

describe("ConnectSection", () => {
	test("starts with no server, an empty form and no disconnect action", () => {
		render(
			<ClientProvider probe={fakeProbe("resolve").run}>
				<ConnectSection />
			</ClientProvider>,
		);
		expect(screen.getByRole("status").textContent).toContain(CONNECT_STATE_TEXT.none);
		expect((screen.getByLabelText(CONNECT_URL_LABEL) as HTMLInputElement).value).toBe("");
		expect(screen.queryByText(DISCONNECT_BUTTON_TEXT)).toBeNull();
	});

	test("submitting connects: the trimmed url and password reach the blob and the state goes online", async () => {
		render(
			<ClientProvider probe={fakeProbe("resolve").run}>
				<ConnectSection />
			</ClientProvider>,
		);
		fill(` ${URL_VALUE} `, "pw");
		submit();
		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toContain(CONNECT_STATE_TEXT.online),
		);
		expect(getSettings().server).toEqual({ url: URL_VALUE, password: "pw" });
		expect(screen.getByLabelText(CONNECT_PASSWORD_LABEL).getAttribute("type")).toBe("password");
		expect(screen.getByText(DISCONNECT_BUTTON_TEXT)).toBeDefined();
	});

	test("a failing probe is the offline state, and disconnect keeps the stored target", async () => {
		render(
			<ClientProvider probe={fakeProbe("reject").run}>
				<ConnectSection />
			</ClientProvider>,
		);
		fill(URL_VALUE, "pw");
		submit();
		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toContain(CONNECT_STATE_TEXT.offline),
		);
		act(() => {
			fireEvent.click(screen.getByText(DISCONNECT_BUTTON_TEXT));
		});
		await waitFor(() =>
			expect(screen.getByRole("status").textContent).toContain(CONNECT_STATE_TEXT.none),
		);
		expect(getSettings().server).toEqual({ url: URL_VALUE, password: "pw" });
	});
});
