import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { PromptBox } from "@/components/composer/PromptBox";
import { COMPOSER_ATTACH_TYPE, COMPOSER_ATTACH_UNSUPPORTED } from "@/constants/composer";
import { promptField, renderComposer, typePrompt } from "@/test/composer";
import { composerProbe } from "@/test/composerProbe";

/**
 * The composer's drop (M5.2, requirement 5): a drop that carries a **path** attaches
 * through M2.5's own attachment path, a drop that carries none says so, and neither
 * touches the draft. This is the DOM route (the web build); the shell's own Finder-drop
 * route into the same `attachFiles` is what the built app's live run shows.
 */

afterEach(cleanup);

describe("what a drop onto the composer does", () => {
	test("a dropped path attaches, named from its last segment", () => {
		renderComposer(
			<PromptBox sessionID="ses_test" running={false} />,
			composerProbe({ commands: [] }),
		);
		act(() => {
			fireEvent.drop(promptField(), {
				dataTransfer: {
					getData: (type: string) =>
						type === COMPOSER_ATTACH_TYPE ? "file:///tmp/dropped.ts" : "",
					files: [],
				},
			});
		});
		expect(screen.getByText("dropped.ts")).toBeDefined();
	});

	test("a drop with no path says so and keeps the draft", () => {
		renderComposer(
			<PromptBox sessionID="ses_test" running={false} />,
			composerProbe({ commands: [] }),
		);
		const field = typePrompt("keep me");
		act(() => {
			fireEvent.drop(field, {
				dataTransfer: { getData: () => "", files: [{ name: "no-path.txt" }] },
			});
		});
		expect(screen.getByText(COMPOSER_ATTACH_UNSUPPORTED)).toBeDefined();
		expect(promptField().value).toBe("keep me");
	});
});
