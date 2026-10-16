import { afterEach, describe, expect, test } from "bun:test";
import type { ModelInfo, ModelRef } from "@opencode/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ComposerIdentity } from "@/components/composer/ComposerIdentity";
import {
	COMPOSER_THINKING_DISABLED,
	COMPOSER_THINKING_LABEL,
	COMPOSER_THINKING_OFF,
	COMPOSER_THINKING_ON,
} from "@/constants/composer";

/**
 * The identity line's Thinking control (row M2.14). The button is a **binary toggle**
 * through the variant the model itself names for thinking off (`off`/`none`), never a
 * cycle over `model.variants`: for the `opencode-go` refs those are effort budgets
 * (`low`/`high`/`max`), and a cycle over them is a switch that can never read *off*.
 * *off* is the off variant; *on* is anything else, including no override at all.
 */

afterEach(cleanup);

const PROVIDER = "opencode";
const MODEL_ID = "cat-jam-free";

function model(variantIDs: readonly string[]): ModelInfo {
	return {
		id: MODEL_ID,
		modelID: MODEL_ID,
		providerID: PROVIDER,
		name: "Cat Jam Free",
		capabilities: { tools: true, input: ["text"], output: ["text"] },
		variants: variantIDs.map((id) => ({ id })),
		time: { released: 0 },
		cost: [],
		status: "active",
		enabled: true,
		limit: { context: 200_000, output: 32_000 },
	};
}

function ref(variant: string | null): ModelRef {
	return { id: MODEL_ID, providerID: PROVIDER, ...(variant === null ? {} : { variant }) };
}

type Harness = {
	readonly calls: (string | null)[];
	/** Apply the variant the control asked for, as the session's own state would. */
	readonly setVariant: (variant: string | null) => void;
};

function renderThinking(variants: readonly string[], variant: string | null): Harness {
	const calls: (string | null)[] = [];
	const info = model(variants);
	const view = (current: string | null) => (
		<ComposerIdentity
			agent={null}
			model={ref(current)}
			variant={current}
			agents={[]}
			models={[info]}
			onAgent={() => {}}
			onModel={() => {}}
			onVariant={(next) => calls.push(next)}
		/>
	);
	const { rerender } = render(view(variant));
	return { calls, setVariant: (next) => rerender(view(next)) };
}

function button(name: string): HTMLButtonElement {
	return screen.getByRole("button", { name }) as HTMLButtonElement;
}

const ON = `${COMPOSER_THINKING_LABEL}: ${COMPOSER_THINKING_ON}`;
const OFF = `${COMPOSER_THINKING_LABEL}: ${COMPOSER_THINKING_OFF}`;

describe("ComposerIdentity's Thinking toggle", () => {
	test("reads off only when the variant is the model's own off id", () => {
		const harness = renderThinking(["off", "high"], "off");
		expect(button(OFF)).toBeTruthy();
		harness.setVariant("high");
		expect(button(ON)).toBeTruthy();
	});

	test("a null variant is on: no override means the model's own default thinking", () => {
		renderThinking(["off", "high"], null);
		expect(button(ON)).toBeTruthy();
	});

	test("on to off to on through real variant ids", () => {
		const harness = renderThinking(["off", "high"], null);
		fireEvent.click(button(ON));
		expect(harness.calls).toEqual(["off"]);
		harness.setVariant("off");
		fireEvent.click(button(OFF));
		expect(harness.calls).toEqual(["off", null]);
		harness.setVariant(null);
		expect(button(ON)).toBeTruthy();
	});

	test("the off variant is whatever the model names, not a fixed id", () => {
		const harness = renderThinking(["none", "high"], null);
		fireEvent.click(button(ON));
		expect(harness.calls).toEqual(["none"]);
	});

	test("a model with no off variant cannot be turned off: disabled with the reason", () => {
		renderThinking(["low", "high", "max"], null);
		const control = button(ON);
		expect(control.disabled).toBe(true);
		expect(control.title).toBe(COMPOSER_THINKING_DISABLED);
	});

	test("a disabled control never cycles effort, and never reads off", () => {
		const harness = renderThinking(["low", "high", "max"], "low");
		const control = button(ON);
		expect(control.disabled).toBe(true);
		fireEvent.click(control);
		expect(harness.calls).toEqual([]);
		expect(screen.queryByRole("button", { name: OFF })).toBeNull();
	});
});
