import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
	OFFLINE_BANNER_RETRY,
	OFFLINE_BANNER_TEXT,
	OfflineBanner,
} from "@/components/OfflineBanner";
import { ROUTE_PATH } from "@/constants/routes";
import { TARGET_GLOBAL } from "@/constants/server";
import { ClientProvider, useClient, useConnection, useTarget } from "@/session/ClientProvider";
import { CONNECTION_STATUS } from "@/session/connectionState";
import { fakeProbe } from "@/test/session";

/** RTL installs auto-cleanup once per process; this is not its first importer. */
afterEach(cleanup);

const URL = "http://127.0.0.1:5211";

function setInjected(value: unknown): void {
	(globalThis as Record<string, unknown>)[TARGET_GLOBAL] = value;
}

beforeEach(() => {
	window.history.pushState(null, "", ROUTE_PATH.home);
	setInjected({ url: URL, password: "pw" });
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
});

function Status() {
	const connection = useConnection();
	return <span data-testid="status">{connection.status}</span>;
}

function Identity() {
	const client = useClient();
	const target = useTarget();
	return (
		<span data-testid="identity">
			{client === null ? "no client" : "client"} {target?.source ?? "none"}{" "}
			{target?.url ?? ""}
		</span>
	);
}

describe("ClientProvider", () => {
	test("builds one client from the injected target and reaches online", async () => {
		const fake = fakeProbe("resolve");
		render(
			<ClientProvider probe={fake.run}>
				<Identity />
				<Status />
			</ClientProvider>,
		);
		expect(screen.getByTestId("identity").textContent).toBe(`client injected ${URL}`);
		await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("online"));
		expect(fake.calls()).toBe(1);
	});

	test("a failed probe moves the app offline and the banner names the url it tried", async () => {
		const fake = fakeProbe("reject");
		render(
			<ClientProvider probe={fake.run}>
				<OfflineBanner />
				<Status />
			</ClientProvider>,
		);
		const banner = await screen.findByRole("alert");
		expect(banner.textContent).toContain(OFFLINE_BANNER_TEXT);
		expect(banner.textContent).toContain(URL);
		expect(screen.getByRole("button", { name: OFFLINE_BANNER_RETRY })).toBeDefined();
		expect(screen.getByTestId("status").textContent).toBe("offline");
		expect(fake.calls()).toBe(1);
	});

	test("the retry action probes again and the banner clears when the server answers", async () => {
		const fake = fakeProbe("reject");
		render(
			<ClientProvider probe={fake.run}>
				<OfflineBanner />
			</ClientProvider>,
		);
		await screen.findByRole("alert");

		fake.set("resolve");
		act(() => {
			fireEvent.click(screen.getByRole("button", { name: OFFLINE_BANNER_RETRY }));
		});
		await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
		expect(fake.calls()).toBe(2);
	});

	test("no target resolves to no client and no banner — a normal state, not an error", async () => {
		setInjected(undefined);
		render(
			<ClientProvider>
				<OfflineBanner />
				<Identity />
				<Status />
			</ClientProvider>,
		);
		expect(screen.getByTestId("identity").textContent).toBe("no client none ");
		expect(screen.getByTestId("status").textContent).toBe(CONNECTION_STATUS.none);
		expect(screen.queryByRole("alert")).toBeNull();
	});
});
