import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { Shell } from "@/app/Shell";
import { registerSettingsSection, resetSettingsSections } from "@/app/settings/sections";
import { openSettingsAndGo } from "@/app/tabSync";
import { disposeTopnavBuiltins, registerTopnavBuiltins } from "@/app/topnavBuiltins";
import { APPEARANCE_TITLE } from "@/constants/appearance";
import { CONNECT_TITLE } from "@/constants/connect";
import { PLUGINS_TITLE } from "@/constants/plugins";
import { TYPOGRAPHY_TITLE } from "@/constants/typography";
import { VERSION_SECTION_LABEL } from "@/constants/version";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import { resetSettingsState } from "@/test/settings";

/**
 * What the surface does with a section a plugin contributes (M3.5 requirements 3
 * and 5, spec 010 §Routes acceptance "a plugin-contributed section appears
 * there"): it renders among the built-ins in registry order, and one that throws
 * is inert — rendering nothing — while the others stay on screen and the throw is
 * recorded as a fault.
 */

afterEach(cleanup);

afterEach(() => {
	resetSettingsSections();
	disposeTopnavBuiltins();
	clearFaults();
});

beforeEach(() => {
	resetSettingsState();
	resetSettingsSections();
	registerTopnavBuiltins();
});

function headings(): (string | null)[] {
	return screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
}

describe("a plugin-contributed settings section", () => {
	test("renders among the built-ins, in registry order", () => {
		function Contributed() {
			return <h2>{"Contributed"}</h2>;
		}
		render(
			<Providers>
				<Shell />
			</Providers>,
		);
		act(() => openSettingsAndGo());
		act(() => {
			registerSettingsSection({
				id: "probe-contributed",
				label: "Contributed",
				component: Contributed,
				order: 1.5,
			});
		});
		expect(headings()).toEqual([
			APPEARANCE_TITLE,
			TYPOGRAPHY_TITLE,
			"Contributed",
			CONNECT_TITLE,
			PLUGINS_TITLE,
			VERSION_SECTION_LABEL,
		]);
	});

	test("one that throws is inert; the others still render", () => {
		function Boom(): never {
			throw new Error("registered section exploded");
		}
		const original = console.error;
		console.error = () => {};
		try {
			render(
				<Providers>
					<Shell />
				</Providers>,
			);
			act(() => openSettingsAndGo());
			act(() => {
				registerSettingsSection({
					id: "probe-broken",
					label: "Broken",
					component: Boom,
					order: 1.5,
				});
			});
			expect(headings()).toEqual([
				APPEARANCE_TITLE,
				TYPOGRAPHY_TITLE,
				CONNECT_TITLE,
				PLUGINS_TITLE,
				VERSION_SECTION_LABEL,
			]);
			const faults = listFaults().filter((fault) => fault.area === FAULT_AREAS.settings);
			expect(faults.some((fault) => fault.reason === FAULT_REASONS.sectionThrew)).toBe(true);
		} finally {
			console.error = original;
		}
	});
});
