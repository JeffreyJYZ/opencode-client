import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { PromptBox } from "@/components/composer/PromptBox";
import {
	COMPOSER_MENU_EMPTY,
	COMPOSER_MENU_LIST_ID,
	COMPOSER_MENU_LOADING,
	COMPOSER_SOURCE,
} from "@/constants/composer";
import { NEW_SESSION_EVENT } from "@/constants/tabs";
import { promptField as area, renderComposer, menuRows as rows, typePrompt } from "@/test/composer";
import { composerProbe } from "@/test/composerProbe";

/**
 * The composer **menu** (row M2.5): the slash/mention list and its keys — accepted by
 * Enter or Tab, moved without wrapping, and closed by Escape **only**. Every
 * interaction here is a key press or a typed character.
 */

afterEach(cleanup);

const COMMANDS = [{ name: "hello", description: "Say hello" }];

describe("PromptBox's menu", () => {
	test("a server command is inserted and sends nothing", async () => {
		const probe = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		const field = typePrompt("/hel");
		await waitFor(() => expect(rows()).toHaveLength(1));
		expect(rows()[0]?.textContent).toContain(COMPOSER_SOURCE.server);
		act(() => fireEvent.keyDown(field, { key: "Enter" }));
		await waitFor(() => expect(area().value).toBe("/hello "));
		expect(probe.prompts).toHaveLength(0);
	});

	test("a client command runs in the app, inserts nothing and sends nothing", async () => {
		const probe = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		let ran = false;
		const listen = () => {
			ran = true;
		};
		window.addEventListener(NEW_SESSION_EVENT, listen);
		const field = typePrompt("/new");
		await waitFor(() => expect(rows().length).toBeGreaterThan(0));
		act(() => fireEvent.keyDown(field, { key: "Tab" }));
		await waitFor(() => expect(area().value).toBe(""));
		window.removeEventListener(NEW_SESSION_EVENT, listen);
		expect(ran).toBe(true);
		expect(probe.prompts).toHaveLength(0);
	});

	test("Escape closes the menu and keeps the box's text", async () => {
		const probe = composerProbe({ commands: COMMANDS });
		renderComposer(<PromptBox sessionID="ses_test" running={true} />, probe);
		const field = typePrompt("/hel");
		await waitFor(() => expect(rows()).toHaveLength(1));
		act(() => fireEvent.keyDown(field, { key: "Escape" }));
		await waitFor(() => expect(document.getElementById(COMPOSER_MENU_LIST_ID)).toBeNull());
		expect(area().value).toBe("/hel");
		expect(probe.interrupts).toHaveLength(0);
	});

	test("↓ clamps at the last row instead of wrapping", async () => {
		const probe = composerProbe({
			commands: [{ name: "hello" }, { name: "helper" }],
		});
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		const field = typePrompt("/hel");
		await waitFor(() => expect(rows()).toHaveLength(2));
		act(() => {
			for (let index = 0; index < 5; index++) fireEvent.keyDown(field, { key: "ArrowDown" });
		});
		const options = rows();
		expect(options[1]?.getAttribute("aria-selected")).toBe("true");
		expect(options[0]?.getAttribute("aria-selected")).toBe("false");
		expect(field.getAttribute("aria-activedescendant")).toBe(options[1]?.id);
	});

	test("before the first command read settles it says loading, not that nothing matches", async () => {
		const probe = composerProbe({ commands: [] });
		renderComposer(<PromptBox sessionID="ses_test" running={false} />, probe);
		typePrompt("/zzz");
		// The first paint has not seen `command.list` answer: the honest word is loading
		// (api §4), and only a settled read may say nothing matches.
		expect(screen.getByText(COMPOSER_MENU_LOADING)).toBeDefined();
		expect(screen.queryByText(COMPOSER_MENU_EMPTY)).toBeNull();
		await waitFor(() => expect(screen.getByText(COMPOSER_MENU_EMPTY)).toBeDefined());
		expect(screen.queryByText(COMPOSER_MENU_LOADING)).toBeNull();
	});
});
