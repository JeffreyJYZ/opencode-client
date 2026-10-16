import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { SettingsSectionBoundary } from "@/components/SettingsSectionBoundary";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";

/**
 * The section boundary's promise (M3.5 requirement 5): a section that throws is
 * inert — nothing of it renders — while the sections around it and the surface
 * stay usable, and the throw reaches the fault log rather than the console only.
 */

function Boom(): never {
	throw new Error("section exploded");
}

afterEach(cleanup);
afterEach(clearFaults);

/** React reports a caught error through `console.error`; the test's output stays quiet. */
function quiet<T>(run: () => T): T {
	const original = console.error;
	console.error = () => {};
	try {
		return run();
	} finally {
		console.error = original;
	}
}

describe("SettingsSectionBoundary", () => {
	test("a healthy section renders its children untouched", () => {
		render(
			<SettingsSectionBoundary id="healthy">
				<p>fine</p>
			</SettingsSectionBoundary>,
		);
		expect(screen.getByText("fine")).toBeDefined();
		expect(listFaults()).toHaveLength(0);
	});

	test("a throwing section renders nothing and records one fault", () => {
		quiet(() =>
			render(
				<section>
					<SettingsSectionBoundary id="before">
						<p>before</p>
					</SettingsSectionBoundary>
					<SettingsSectionBoundary id="broken">
						<Boom />
					</SettingsSectionBoundary>
					<SettingsSectionBoundary id="after">
						<p>after</p>
					</SettingsSectionBoundary>
				</section>,
			),
		);
		// The siblings are untouched: the pane is never blank.
		expect(screen.getByText("before")).toBeDefined();
		expect(screen.getByText("after")).toBeDefined();
		const faults = listFaults();
		expect(faults).toHaveLength(1);
		expect(faults[0].area).toBe(FAULT_AREAS.settings);
		expect(faults[0].reason).toBe(FAULT_REASONS.sectionThrew);
		expect(faults[0].subject).toBe("broken");
		expect(faults[0].message).toContain("section exploded");
	});
});
