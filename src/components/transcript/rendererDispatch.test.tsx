import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import type { ComponentType, ReactElement } from "react";
import type { RendererRowProps } from "@/components/transcript/rowRenderers";
import { TranscriptEntry } from "@/components/transcript/TranscriptEntry";
import { ROW_KIND } from "@/constants/transcript";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import { registerRenderer, resetRenderers } from "@/plugins/renderers";
import { BUILTIN_ROW_CASES, errorRow, noticeRow, textRow, toolRow } from "@/test/transcriptRows";

/**
 * M4.13's seam: the transcript asks the renderer registry before it falls back to
 * its built-in switch. A registered renderer replaces the row, a renderer registered
 * after the row mounted replaces it in place, and a refused renderer is inert plus a
 * `PluginFault` — never a blank row.
 */

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

beforeEach(() => {
	resetRenderers();
	clearFaults();
});

/** The rendered markup of one node, with its container torn down again. */
function markup(node: ReactElement): string {
	const { container, unmount } = render(node);
	const out = container.innerHTML;
	unmount();
	return out;
}

/** A probe renderer: it renders its own marker, never the built-in row. */
function Probe({ row }: RendererRowProps) {
	return <div data-probe={row.kind}>{row.kind}</div>;
}

describe("a registered renderer replaces the row", () => {
	test("a tool renderer takes the tool row, and its handle gives it back", () => {
		const handle = registerRenderer({
			id: "m413-probe",
			kind: "tool",
			component: Probe as ComponentType,
		});
		const { container } = render(<TranscriptEntry row={toolRow()} />);
		// What is on screen is the plugin's markup, and the built-in tool row is gone.
		expect(container.querySelector("[data-probe]")?.getAttribute("data-probe")).toBe(
			ROW_KIND.tool,
		);
		expect(container.querySelector('[data-row="t1"]')).toBeNull();
		act(() => handle.dispose());
		cleanup();
		const back = render(<TranscriptEntry row={toolRow()} />);
		expect(back.container.querySelector('[data-row="t1"]')).not.toBeNull();
		expect(back.container.querySelector("[data-probe]")).toBeNull();
	});

	test("a marker renderer takes the small rows it maps to", () => {
		registerRenderer({ id: "m413-marker", kind: "marker", component: Probe as ComponentType });
		const notice = render(<TranscriptEntry row={noticeRow()} />);
		expect(notice.container.querySelector("[data-probe]")).not.toBeNull();
		const error = render(<TranscriptEntry row={errorRow()} />);
		expect(error.container.querySelector("[data-probe]")).not.toBeNull();
		// …and a row that maps elsewhere is untouched.
		const prose = render(<TranscriptEntry row={textRow(ROW_KIND.prose, "p2")} />);
		expect(prose.container.querySelector("[data-probe]")).toBeNull();
	});

	test("a renderer registered after the row mounted replaces it in place", () => {
		const { container } = render(<TranscriptEntry row={toolRow()} />);
		expect(container.querySelector('[data-row="t1"]')).not.toBeNull();
		act(() =>
			registerRenderer({ id: "m413-late", kind: "tool", component: Probe as ComponentType }),
		);
		expect(container.querySelector("[data-probe]")).not.toBeNull();
		expect(container.querySelector('[data-row="t1"]')).toBeNull();
	});
});

describe("with nothing registered the built-ins are unchanged", () => {
	test("every row kind renders exactly what its built-in component renders", () => {
		for (const { row, builtin: Builtin } of BUILTIN_ROW_CASES) {
			const View = Builtin as ComponentType<{ row: typeof row }>;
			expect(markup(<TranscriptEntry row={row} />)).toBe(markup(<View row={row} />));
		}
	});

	test("the row count is the store's, not the registry's", () => {
		const { container } = render(
			<section>
				{BUILTIN_ROW_CASES.map(({ row }) => (
					<TranscriptEntry key={row.id} row={row} />
				))}
			</section>,
		);
		expect(container.querySelectorAll("[data-row]")).toHaveLength(BUILTIN_ROW_CASES.length);
	});
});

describe("a refused renderer", () => {
	test("stays inert and is recorded as a fault, never a blank row", () => {
		registerRenderer({ id: "m413-bad", kind: "nope", component: Probe as ComponentType });
		const fault = listFaults().at(-1);
		expect(fault?.area).toBe(FAULT_AREAS.renderers);
		expect(fault?.reason).toBe(FAULT_REASONS.unknownKind);
		const { container } = render(<TranscriptEntry row={toolRow()} />);
		expect(container.querySelector('[data-row="t1"]')).not.toBeNull();
		expect(container.querySelector("[data-probe]")).toBeNull();
	});
});
