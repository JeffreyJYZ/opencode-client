import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SubagentsPanel } from "@/components/sidebar/SubagentsPanel";
import { subagentInterruptLabel, subagentOpenLabel } from "@/constants/sidebar";
import type { SessionRow } from "@/session/useSessions";

/**
 * M2.19: a Subagents row does something. Each row is a `<button>` that opens its
 * child session through the shared `openSessionAndGo` seam (the panel is handed
 * that action), and a **running** child — one with no `outcome` — offers a second
 * button that interrupts **that** child. A finished child offers none. The wiring
 * of these actions to the real client is proven in `Sidebar.subagents.test.tsx`.
 */

afterEach(cleanup);

const RUNNING = {
	id: "ses_run",
	title: "researcher",
	time: { updated: 1 },
} as unknown as SessionRow;

const FINISHED = {
	id: "ses_done",
	title: "builder",
	outcome: "succeeded",
	time: { updated: 1 },
} as unknown as SessionRow;

function recorder() {
	const opened: string[] = [];
	const interrupted: string[] = [];
	return {
		opened,
		interrupted,
		openSession: (id: string) => opened.push(id),
		interrupt: (id: string) => interrupted.push(id),
	};
}

describe("the Subagents panel's rows (M2.19)", () => {
	test("a click on a row opens that child session", () => {
		const actions = recorder();
		render(
			<SubagentsPanel
				data={{ children: [RUNNING, FINISHED] }}
				openSession={actions.openSession}
				interrupt={actions.interrupt}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: subagentOpenLabel("researcher") }));
		expect(actions.opened).toEqual([RUNNING.id]);
	});

	test("a running child's interrupt carries that child's own id", () => {
		const actions = recorder();
		render(
			<SubagentsPanel
				data={{ children: [RUNNING] }}
				openSession={actions.openSession}
				interrupt={actions.interrupt}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: subagentInterruptLabel("researcher") }));
		expect(actions.interrupted).toEqual([RUNNING.id]);
	});

	test("a finished child has no interrupt affordance", () => {
		const actions = recorder();
		render(
			<SubagentsPanel
				data={{ children: [FINISHED] }}
				openSession={actions.openSession}
				interrupt={actions.interrupt}
			/>,
		);
		expect(
			screen.queryByRole("button", { name: subagentInterruptLabel("builder") }),
		).toBeNull();
		expect(screen.getByRole("button", { name: subagentOpenLabel("builder") })).toBeDefined();
	});

	test("the rows are reachable and activatable by keyboard", () => {
		const actions = recorder();
		render(
			<SubagentsPanel
				data={{ children: [RUNNING] }}
				openSession={actions.openSession}
				interrupt={actions.interrupt}
			/>,
		);
		const open = screen.getByRole("button", { name: subagentOpenLabel("researcher") });
		const stop = screen.getByRole("button", { name: subagentInterruptLabel("researcher") });
		// Both are native buttons, so the platform's Enter/Space activation reaches them.
		expect(open.tagName).toBe("BUTTON");
		expect(stop.tagName).toBe("BUTTON");
		open.focus();
		expect(document.activeElement).toBe(open);
		stop.focus();
		expect(document.activeElement).toBe(stop);
		// The event a keyboard activation produces is a click on the focused control.
		fireEvent.click(open);
		fireEvent.click(stop);
		expect(actions.opened).toEqual([RUNNING.id]);
		expect(actions.interrupted).toEqual([RUNNING.id]);
	});
});
