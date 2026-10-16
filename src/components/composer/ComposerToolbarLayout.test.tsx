import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ModelInfo } from "@opencode/client";
import { cleanup, render, screen } from "@testing-library/react";
import type { CSSProperties } from "react";
import type { ComposerIdentityProps } from "@/components/composer/ComposerIdentity";
import { ComposerToolbar } from "@/components/composer/ComposerToolbar";
import {
	COMPOSER_INTERRUPT_LABEL,
	COMPOSER_MODEL_LABEL,
	COMPOSER_QUEUED_LABEL,
	COMPOSER_SEND_LABEL,
} from "@/constants/composer";
import { SLOT } from "@/constants/slots";
import { clearFaults } from "@/plugins/faults";
import { modelOptionKey } from "@/session/composerReads";
import { probeSlot, slotMarker } from "@/test/slotProbe";

/**
 * The toolbar's Send pinning (row M2.30): identity controls flow left with
 * Send/Interrupt at the row's end, right-aligned when wrapped below. Width is
 * driven by a narrow frame around the real toolbar with a real long
 * `providerID/id` option — the seam a test can reach, the way the sidebar
 * suites drive `window.matchMedia`. happy-dom performs no layout, so the wrap
 * itself is proven by the flex contract the browser honors (one wrapping line,
 * auto-margin end pin), read from the rendered output, never faked in.
 */

afterEach(cleanup);
beforeEach(clearFaults);

/** Narrow enough that a full `providerID/id` option cannot share its row with Send. */
const NARROW_CONTAINER_PX = 320;

/** The long model the layout must accommodate, never shorten (M2.10/M2.13). */
const LONG_PROVIDER = "opencode-go";
const LONG_MODEL_ID = "muse-spark-1.3-contributor";

/** The narrow frame width travels through (happy-dom performs no layout). */
const NARROW_FRAME_STYLE: CSSProperties = { width: NARROW_CONTAINER_PX };

function longModel(): ModelInfo {
	return {
		id: LONG_MODEL_ID,
		modelID: LONG_MODEL_ID,
		providerID: LONG_PROVIDER,
		name: "Muse Spark",
		capabilities: { tools: true, input: ["text"], output: ["text"] },
		variants: [],
		time: { released: 0 },
		cost: [],
		status: "active",
		enabled: true,
		limit: { context: 200_000, output: 32_000 },
	};
}

function identity(): ComposerIdentityProps {
	const info = longModel();
	return {
		agent: null,
		model: { id: info.id, providerID: info.providerID },
		variant: null,
		agents: [],
		models: [info],
		onAgent: () => {},
		onModel: () => {},
		onVariant: () => {},
	};
}

function renderNarrow(running: boolean, queued: boolean) {
	return render(
		<div style={NARROW_FRAME_STYLE}>
			<ComposerToolbar
				identity={identity()}
				running={running}
				queued={queued}
				sending={false}
				onSend={() => {}}
				onInterrupt={() => {}}
			/>
		</div>,
	);
}

/** The affordance group around the named button; throws when the DOM moved. */
function affordanceGroup(buttonLabel: string): HTMLElement {
	const group = screen.getByText(buttonLabel).parentElement;
	if (group === null) throw new Error(`${buttonLabel} has no affordance group`);
	return group;
}

describe("the composer toolbar's Send pinning", () => {
	test("a long provider/id option renders inside the narrow frame", () => {
		const { container } = renderNarrow(false, false);
		const frame = container.firstElementChild;
		if (!(frame instanceof HTMLElement)) throw new Error("the narrow frame did not render");
		expect(frame.style.width).toBe(`${NARROW_CONTAINER_PX}px`);
		expect(screen.getByLabelText(COMPOSER_MODEL_LABEL).textContent).toContain(
			modelOptionKey(longModel()),
		);
	});

	test("identity controls and Send share one wrapping flex line", () => {
		renderNarrow(false, false);
		const line = affordanceGroup(COMPOSER_SEND_LABEL).parentElement;
		if (line === null) throw new Error("Send has no toolbar line");
		expect(line.contains(screen.getByLabelText(COMPOSER_MODEL_LABEL))).toBe(true);
		expect(line.style.display).toBe("flex");
		expect(line.style.flexWrap).toBe("wrap");
	});

	test("Send is pinned to the row's end by auto margin, never absolute", () => {
		renderNarrow(false, false);
		const group = affordanceGroup(COMPOSER_SEND_LABEL);
		expect(group.style.marginLeft).toBe("auto");
		expect(group.style.position).not.toBe("absolute");
	});

	test("Interrupt takes the same end-pinned slot while a turn runs", () => {
		renderNarrow(true, false);
		expect(screen.queryByText(COMPOSER_SEND_LABEL)).toBeNull();
		expect(affordanceGroup(COMPOSER_INTERRUPT_LABEL).style.marginLeft).toBe("auto");
	});

	test("the Queued label flows in the same line", () => {
		renderNarrow(true, true);
		const line = affordanceGroup(COMPOSER_INTERRUPT_LABEL).parentElement;
		if (line === null) throw new Error("Interrupt has no toolbar line");
		expect(line.contains(screen.getByText(COMPOSER_QUEUED_LABEL))).toBe(true);
	});

	test("a composer.toolbar contribution flows in the same line", () => {
		const probe = probeSlot(SLOT.composerToolbar);
		try {
			renderNarrow(false, false);
			const line = affordanceGroup(COMPOSER_SEND_LABEL).parentElement;
			if (line === null) throw new Error("Send has no toolbar line");
			expect(line.contains(screen.getByText(slotMarker(SLOT.composerToolbar)))).toBe(true);
		} finally {
			probe.dispose();
		}
	});
});
