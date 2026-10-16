import { afterEach, describe, expect, test } from "bun:test";
import type { AgentInfo } from "@opencode/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ComposerIdentity } from "@/components/composer/ComposerIdentity";
import { COMPOSER_AGENT_LABEL } from "@/constants/composer";

/**
 * The identity line's agent picker (row M2.11). `Agent.Info` carries `id` and `name` as
 * **different fields**: the server stores agents in a `Map<id, Info>`, resolves a switch
 * with `Agent.select(id)` (`ID.make(agent)` into that map), and the session's own agent
 * (`session.get`) is that id — while `name` ("Build" for id `build`) is only the label.
 * So the option's key and value must both be the id. Keying by one field and valuing by
 * another is incoherent either way: a shared `id` collides in the key, and a shared
 * `name` gives two options one value, so the second entry cannot be chosen at all.
 */

afterEach(cleanup);

function agent(id: string, name: string): AgentInfo {
	return {
		id,
		name,
		request: { settings: {}, headers: {}, body: {} },
		mode: "primary",
		hidden: false,
		permissions: [],
	};
}

/** The built-ins' own shape: every name differs from its id (`build` → "Build"). */
const BUILD = agent("build", "Build");
const PLAN = agent("plan", "Plan");

function renderAgents(agents: readonly AgentInfo[], selected: string | null): string[] {
	const chosen: string[] = [];
	render(
		<ComposerIdentity
			agent={selected}
			model={null}
			variant={null}
			agents={agents}
			models={[]}
			onAgent={(next) => chosen.push(next)}
			onModel={() => {}}
			onVariant={() => {}}
		/>,
	);
	return chosen;
}

function select(): HTMLSelectElement {
	return screen.getByLabelText(COMPOSER_AGENT_LABEL) as HTMLSelectElement;
}

function values(): string[] {
	return [...select().options].map((option) => option.value);
}

describe("ComposerIdentity's agent picker", () => {
	test("each entry is keyed and valued by its id, and labelled by its name", () => {
		renderAgents([BUILD, PLAN], null);
		expect(values()).toEqual(["", "build", "plan"]);
		expect([...select().options].map((option) => option.text)).toEqual(["—", "Build", "Plan"]);
	});

	test("the session's agent is an id, so it selects its entry and shows that name", () => {
		renderAgents([BUILD, PLAN], "plan");
		expect(select().value).toBe("plan");
		expect(select().options[select().selectedIndex]?.text).toBe("Plan");
	});

	test("picking an entry sends its id, never its name", () => {
		const chosen = renderAgents([BUILD, PLAN], null);
		fireEvent.change(select(), { target: { value: "plan" } });
		expect(chosen).toEqual(["plan"]);
	});

	test("two agents sharing a name stay two distinct choices, each sending its own id", () => {
		const chosen = renderAgents([agent("alpha", "Shared"), agent("beta", "Shared")], null);
		expect(values()).toEqual(["", "alpha", "beta"]);
		expect(new Set(values()).size).toBe(values().length);
		fireEvent.change(select(), { target: { value: "beta" } });
		fireEvent.change(select(), { target: { value: "alpha" } });
		expect(chosen).toEqual(["beta", "alpha"]);
	});

	test("a shared name logs no duplicate-key error, because the key is the id", () => {
		const original = console.error;
		const calls: unknown[][] = [];
		console.error = (...args: unknown[]) => {
			calls.push(args);
		};
		try {
			renderAgents([agent("alpha", "Shared"), agent("beta", "Shared")], null);
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
});
