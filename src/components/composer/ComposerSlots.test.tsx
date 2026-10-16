import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComposerIdentityProps } from "@/components/composer/ComposerIdentity";
import { ComposerToolbar } from "@/components/composer/ComposerToolbar";
import { PromptBoxView, type PromptBoxViewProps } from "@/components/composer/PromptBoxView";
import { COMPOSER_LABEL, COMPOSER_SEND_LABEL } from "@/constants/composer";
import { SLOT } from "@/constants/slots";
import { clearFaults } from "@/plugins/faults";
import { probeSlot, slotMarker } from "@/test/slotProbe";

/**
 * The composer's three slots (M4.12): `toolbar` inside the toolbar line,
 * `above`/`below` flanking the frame `<section>`. All plain `<Slot>`s, so the
 * empty case draws the box with no extra node at all.
 */

afterEach(cleanup);
beforeEach(clearFaults);

const IDENTITY: ComposerIdentityProps = {
	agent: null,
	model: null,
	variant: null,
	agents: [],
	models: [],
	onAgent: () => {},
	onModel: () => {},
	onVariant: () => {},
};

function toolbar() {
	return (
		<ComposerToolbar
			identity={IDENTITY}
			running={false}
			queued={false}
			sending={false}
			onSend={() => {}}
			onInterrupt={() => {}}
		/>
	);
}

function frame() {
	const props: PromptBoxViewProps = {
		running: false,
		queued: false,
		sending: false,
		error: null,
		text: "",
		areaRef: { current: null },
		onText: () => {},
		onCaret: () => {},
		onKeyDown: () => {},
		identity: IDENTITY,
		entries: [],
		active: 0,
		loadingCommands: false,
		menuOpen: false,
		onPick: () => {},
		onHover: () => {},
		attachments: [],
		imagePreviews: [],
		onRemoveAttachment: () => {},
		onDrop: () => {},
		onSend: () => {},
		onInterrupt: () => {},
	};
	return <PromptBoxView {...props} />;
}

describe("the composer slots", () => {
	test("composer.toolbar renders nothing when empty", () => {
		render(toolbar());
		expect(screen.queryByText(slotMarker(SLOT.composerToolbar))).toBeNull();
	});

	test("composer.toolbar renders inside the toolbar line", () => {
		const probe = probeSlot(SLOT.composerToolbar);
		try {
			render(toolbar());
			const marker = screen.getByText(slotMarker(SLOT.composerToolbar));
			expect(marker.parentElement?.textContent).toContain(COMPOSER_SEND_LABEL);
		} finally {
			probe.dispose();
		}
	});

	test("composer.above and composer.below render nothing when empty", () => {
		render(frame());
		expect(screen.queryByText(slotMarker(SLOT.composerAbove))).toBeNull();
		expect(screen.queryByText(slotMarker(SLOT.composerBelow))).toBeNull();
	});

	test("composer.above and composer.below flank the frame", () => {
		const above = probeSlot(SLOT.composerAbove);
		const below = probeSlot(SLOT.composerBelow);
		try {
			const { container } = render(frame());
			const section = container.querySelector(`[aria-label="${COMPOSER_LABEL}"]`);
			const aboveMarker = screen.getByText(slotMarker(SLOT.composerAbove));
			const belowMarker = screen.getByText(slotMarker(SLOT.composerBelow));
			expect(aboveMarker.nextElementSibling).toBe(section);
			expect(section?.nextElementSibling).toBe(belowMarker);
		} finally {
			above.dispose();
			below.dispose();
		}
	});
});
