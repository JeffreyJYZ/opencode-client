import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { PromptBox } from "@/components/composer/PromptBox";
import { COMPOSER_AGENT_LABEL } from "@/constants/composer";
import {
	PROBE_AGENTS,
	PROBE_SELECTABLE_AGENT_IDS,
	PROBE_SESSION_AGENT_ID,
} from "@/test/agentFixtures";
import { promptField as area, renderComposer, menuRows as rows, typePrompt } from "@/test/composer";
import { composerProbe } from "@/test/composerProbe";

/**
 * The prompt box (row M2.5). Everything here is driven by **keys**, because the
 * keyboard is the row's acceptance: `⌘↩` sends, `↩` does not, the menu's Enter
 * inserts a server command without sending, a client command runs instead, Escape
 * closes the menu and nothing else, and the interrupt exists only while the store
 * says a turn runs.
 */

afterEach(cleanup);

const COMMANDS = [{ name: "hello", description: "Say hello" }];

describe("PromptBox's send path", () => {
	test("⌘↩ sends the flat payload and clears the box", async () => {
		const probe = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		const field = typePrompt("hello there");
		act(() => fireEvent.keyDown(field, { key: "Enter", metaKey: true }));
		await waitFor(() => expect(probe.prompts).toHaveLength(1));
		expect(probe.prompts[0]).toEqual({
			sessionID: "ses_test",
			text: "hello there",
		});
		await waitFor(() => expect(area().value).toBe(""));
	});

	test("a prompt that IS a server command runs as one, not as a prompt", async () => {
		const probe = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		// Wait for the command list, then accept the server row so the box holds
		// `/hello ` — the state the slash menu leaves behind.
		const field = typePrompt("/hel");
		await waitFor(() => expect(rows()).toHaveLength(1));
		act(() => fireEvent.keyDown(field, { key: "Enter" }));
		await waitFor(() => expect(area().value).toBe("/hello "));
		act(() => fireEvent.keyDown(area(), { key: "Enter", metaKey: true }));
		await waitFor(() => expect(probe.commandRuns).toHaveLength(1));
		expect(probe.commandRuns[0]).toEqual({ sessionID: "ses_test", name: "hello", text: "" });
		expect(probe.prompts).toHaveLength(0);
	});

	test("a name the server does not have stays an ordinary prompt", async () => {
		const probe = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		const field = typePrompt("/etc/hosts is a file");
		act(() => fireEvent.keyDown(field, { key: "Enter", metaKey: true }));
		await waitFor(() => expect(probe.prompts).toHaveLength(1));
		expect(probe.commandRuns).toHaveLength(0);
	});

	test("↩ alone does not send", async () => {
		const probe = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		const field = typePrompt("line one");
		act(() => fireEvent.keyDown(field, { key: "Enter" }));
		expect(probe.prompts).toHaveLength(0);
	});

	test("the interrupt affordance exists only while a turn runs (requirement 2)", async () => {
		const idle = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, idle);
		expect(screen.queryByText("Interrupt")).toBeNull();

		cleanup();
		const running = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={true} />, running);
		act(() => fireEvent.keyDown(area(), { key: "Escape" }));
		await waitFor(() => expect(running.interrupts).toHaveLength(1));
		expect(running.interrupts[0]).toEqual({ sessionID: "ses_test" });
	});

	test("Escape while idle interrupts nothing", async () => {
		const probe = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		act(() => fireEvent.keyDown(typePrompt("text"), { key: "Escape" }));
		expect(probe.interrupts).toHaveLength(0);
	});
});

describe("PromptBox's agent picker", () => {
	/** The identity line's agent `<select>`, by its own label. */
	function agentSelect(): HTMLSelectElement {
		return screen.getByLabelText(COMPOSER_AGENT_LABEL) as HTMLSelectElement;
	}

	function offered(): string[] {
		return [...agentSelect().options].map((option) => option.value);
	}

	test("offers exactly the agents a session can be switched to, never a subagent or a hidden one (M2.12)", async () => {
		const probe = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		// The agent source arrives with the other three reads; the empty option is
		// all that exists until then.
		await waitFor(() => expect(agentSelect().options.length).toBeGreaterThan(1));
		expect(offered()).toEqual(["", ...PROBE_SELECTABLE_AGENT_IDS]);
		// The server sends subagents and hidden agents too; none may be a choice.
		for (const agent of PROBE_AGENTS) {
			if (PROBE_SELECTABLE_AGENT_IDS.includes(agent.id)) continue;
			expect(offered()).not.toContain(agent.id);
		}
		// The session's own agent is an id, so it selects its entry and shows its name.
		expect(agentSelect().value).toBe(PROBE_SESSION_AGENT_ID);
	});
});
