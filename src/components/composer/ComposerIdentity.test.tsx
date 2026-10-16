import { afterEach, describe, expect, test } from "bun:test";
import type { ModelInfo, ModelRef } from "@opencode/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ComposerIdentity } from "@/components/composer/ComposerIdentity";
import { COMPOSER_MODEL_LABEL } from "@/constants/composer";
import { modelOptionKey } from "@/session/composerReads";

/**
 * The identity line's model picker (row M2.10). The two entries that matter are the
 * ones sharing an `id` across providers: `id` alone is not unique (`composerReads.ts`
 * §`modelOptionKey`), so the picker must key **and** value by the `providerID/id` pair.
 * A duplicate key is a React warning; the real defect is that `find(id === value)`
 * returns the first match, which makes the second entry unselectable and can show the
 * wrong entry as selected.
 */

afterEach(cleanup);

function model(providerID: string, id: string, name: string): ModelInfo {
	return {
		id,
		modelID: id,
		providerID,
		name,
		capabilities: { tools: true, input: ["text"], output: ["text"] },
		variants: [],
		time: { released: 0 },
		cost: [],
		status: "active",
		enabled: true,
		limit: { context: 200_000, output: 32_000 },
	};
}

/** The same `id`, two providers — the collision the row is about. */
const OPENCODE_CAT = model("opencode", "cat-jam-free", "Cat Jam Free");
const ZZZ_CAT = model("zzz", "cat-jam-free", "Colliding cat");

function renderIdentity(models: readonly ModelInfo[], selected: ModelRef | null): ModelInfo[] {
	const chosen: ModelInfo[] = [];
	render(
		<ComposerIdentity
			agent={null}
			model={selected}
			variant={null}
			agents={[]}
			models={models}
			onAgent={() => {}}
			onModel={(next) => chosen.push(next)}
			onVariant={() => {}}
		/>,
	);
	return chosen;
}

function select(): HTMLSelectElement {
	return screen.getByLabelText(COMPOSER_MODEL_LABEL) as HTMLSelectElement;
}

function optionValues(): string[] {
	return [...select().options].map((option) => option.value);
}

describe("ComposerIdentity's model picker", () => {
	test("a colliding pair gets one distinct value per entry, never a shared id", () => {
		renderIdentity([OPENCODE_CAT, ZZZ_CAT], null);
		expect(optionValues()).toEqual(["", modelOptionKey(OPENCODE_CAT), modelOptionKey(ZZZ_CAT)]);
		expect(modelOptionKey(OPENCODE_CAT)).not.toBe(modelOptionKey(ZZZ_CAT));
	});

	test("loading a colliding list logs no duplicate-key error", () => {
		const original = console.error;
		const calls: unknown[][] = [];
		console.error = (...args: unknown[]) => {
			calls.push(args);
		};
		try {
			renderIdentity([OPENCODE_CAT, ZZZ_CAT], null);
		} finally {
			console.error = original;
		}
		const duplicates = calls.filter((args) =>
			args.some(
				(arg) => typeof arg === "string" && /two children with the same key/i.test(arg),
			),
		);
		expect(duplicates).toHaveLength(0);
	});

	test("the shown selection follows the session's provider, not the first match", () => {
		renderIdentity([OPENCODE_CAT, ZZZ_CAT], { id: "cat-jam-free", providerID: "zzz" });
		const shown = select().options[select().selectedIndex];
		expect(select().value).toBe(modelOptionKey(ZZZ_CAT));
		expect(shown?.text).toBe("Colliding cat");
	});

	test("both entries of the pair are selectable, each sending its own provider", () => {
		const chosen = renderIdentity([OPENCODE_CAT, ZZZ_CAT], null);
		fireEvent.change(select(), { target: { value: modelOptionKey(ZZZ_CAT) } });
		fireEvent.change(select(), { target: { value: modelOptionKey(OPENCODE_CAT) } });
		expect(chosen).toEqual([ZZZ_CAT, OPENCODE_CAT]);
	});

	test("a list with unique ids keeps its exact options and default selection", () => {
		const alpha = model("opencode", "alpha", "Alpha");
		const beta = model("opencode", "beta", "Beta");
		renderIdentity([alpha, beta], { id: "beta", providerID: "opencode" });
		expect(optionValues()).toEqual(["", modelOptionKey(alpha), modelOptionKey(beta)]);
		expect(select().options[select().selectedIndex]?.text).toBe("Beta");
	});
});
