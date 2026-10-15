import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getSettings, resetSettings, updateSettings } from "@/app/settings/store";
import { ROUTE_PATH } from "@/constants/routes";
import { TARGET_GLOBAL } from "@/constants/server";
import {
	ClientProvider,
	useClient,
	useConnect,
	useConnection,
	useDisconnect,
	useTarget,
} from "@/session/ClientProvider";
import { CONNECTION_STATUS } from "@/session/connectionState";
import { fakeProbe } from "@/test/session";

/**
 * The connect flow's provider half (spec 050 §Target and auth): the stored target
 * as a resolution source, the injected global's precedence over it, and the
 * connect/disconnect actions. Split from `ClientProvider.test.tsx` along the
 * seam those tests do not cross.
 */

/** RTL installs auto-cleanup once per process; this is not its first importer. */
afterEach(cleanup);

const URL = "http://127.0.0.1:5211";
const STORED_URL = "http://127.0.0.1:5290";
const STORED = { url: STORED_URL, password: "stored-pw" };

function setInjected(value: unknown): void {
	(globalThis as Record<string, unknown>)[TARGET_GLOBAL] = value;
}

beforeEach(() => {
	window.history.pushState(null, "", ROUTE_PATH.home);
	setInjected({ url: URL, password: "pw" });
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
	resetSettings();
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

function Controls() {
	const connect = useConnect();
	const disconnect = useDisconnect();
	return (
		<>
			<button type="button" data-testid="connect" onClick={() => connect(STORED)}>
				connect
			</button>
			<button type="button" data-testid="disconnect" onClick={disconnect}>
				disconnect
			</button>
		</>
	);
}

describe("ClientProvider — the connect flow", () => {
	test("a stored target is the target when the shell injected nothing", async () => {
		updateSettings({ server: STORED });
		setInjected(undefined);
		render(
			<ClientProvider probe={fakeProbe("resolve").run}>
				<Identity />
				<Status />
			</ClientProvider>,
		);
		expect(screen.getByTestId("identity").textContent).toBe(`client stored ${STORED_URL}`);
		await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("online"));
	});

	test("the injected global still wins over a stored target", () => {
		updateSettings({ server: STORED });
		render(
			<ClientProvider probe={fakeProbe("resolve").run}>
				<Identity />
			</ClientProvider>,
		);
		expect(screen.getByTestId("identity").textContent).toBe(`client injected ${URL}`);
	});

	test("connect stores the target and reaches online; disconnect drops to none but keeps it", async () => {
		setInjected(undefined);
		render(
			<ClientProvider probe={fakeProbe("resolve").run}>
				<Controls />
				<Identity />
				<Status />
			</ClientProvider>,
		);
		expect(screen.getByTestId("status").textContent).toBe(CONNECTION_STATUS.none);

		act(() => {
			fireEvent.click(screen.getByTestId("connect"));
		});
		expect(screen.getByTestId("identity").textContent).toBe(`client stored ${STORED_URL}`);
		await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("online"));
		expect(getSettings().server).toEqual(STORED);

		act(() => {
			fireEvent.click(screen.getByTestId("disconnect"));
		});
		expect(screen.getByTestId("identity").textContent).toBe("no client none ");
		expect(screen.getByTestId("status").textContent).toBe(CONNECTION_STATUS.none);
		// The blob keeps the target, so a relaunch reconnects without re-entering it.
		expect(getSettings().server).toEqual(STORED);
	});
});
