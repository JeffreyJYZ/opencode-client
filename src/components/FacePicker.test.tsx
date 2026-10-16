import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FacePicker } from "@/components/FacePicker";
import { DEFAULT_CODE_FONT_FAMILY, DEFAULT_UI_FONT_FAMILY, FONT_ROLE } from "@/constants/settings";
import { FACE_DATALIST_ID, FACE_REFUSAL_ID, FACE_REFUSED_TEXT } from "@/constants/typography";
import { CSS_GENERIC_FACE, faceNames } from "@/theme/faces";

/** RTL installs auto-cleanup once per process; this is not its first importer. */
afterEach(cleanup);

/**
 * The picker's own contract (M3.3). Every test here is about a *refusal* or about
 * canonicalisation; that a good name is applied is M3.2's proof, not this row's.
 */

/** A picker for one role, with the commit spied on. */
function picker(role: typeof FONT_ROLE.ui | typeof FONT_ROLE.code, value: string) {
	const onChange = mock((_family: string): void => {});
	render(<FacePicker role={role} value={value} onChange={onChange} />);
	const input = screen.getByLabelText(
		role === FONT_ROLE.ui ? "Interface family" : "Code family",
	) as HTMLInputElement;
	return { onChange, input };
}

/**
 * Type into the field and leave it, the way a user finishes a choice. React maps
 * `onBlur` onto the bubbling `focusout`, so that is the event a test must send.
 */
function type(input: HTMLInputElement, text: string): void {
	fireEvent.change(input, { target: { value: text } });
	fireEvent.focusOut(input);
}

describe("FacePicker", () => {
	test("offers exactly the role's resolvable faces, in the DOM as a datalist", () => {
		const { input } = picker(FONT_ROLE.code, DEFAULT_CODE_FONT_FAMILY);
		const list = document.getElementById(FACE_DATALIST_ID[FONT_ROLE.code]);
		expect(input.getAttribute("list")).toBe(FACE_DATALIST_ID[FONT_ROLE.code]);
		const offered = [...(list?.querySelectorAll("option") ?? [])].map((option) =>
			option.getAttribute("value"),
		);
		expect(offered).toEqual([...faceNames(FONT_ROLE.code)]);
	});

	test("a name from the list is committed", () => {
		const { onChange, input } = picker(FONT_ROLE.ui, DEFAULT_UI_FONT_FAMILY);
		type(input, CSS_GENERIC_FACE.uiRounded);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0]?.[0]).toBe(CSS_GENERIC_FACE.uiRounded);
	});

	test("the cask's alias commits the canonical family, so the blob cannot hold two names", () => {
		const { onChange, input } = picker(FONT_ROLE.code, DEFAULT_CODE_FONT_FAMILY);
		type(input, "geistmono nfm");
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0]?.[0]).toBe("GeistMono Nerd Font Mono");
		expect(screen.queryByText(FACE_REFUSED_TEXT("geistmono nfm"))).toBeNull();
	});

	test("a misspelt family is refused: nothing is committed and the field says why", () => {
		const { onChange, input } = picker(FONT_ROLE.code, DEFAULT_CODE_FONT_FAMILY);
		type(input, "GeistMono Nerd Fnot");
		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByText(FACE_REFUSED_TEXT("GeistMono Nerd Fnot"))).toBeDefined();
		expect(input.getAttribute("aria-invalid")).toBe("true");
		expect(input.getAttribute("aria-describedby")).toBe(FACE_REFUSAL_ID[FONT_ROLE.code]);
	});

	test("the stored value stays in force after a refusal, and the refusal clears on a good one", () => {
		const { onChange, input } = picker(FONT_ROLE.ui, DEFAULT_UI_FONT_FAMILY);
		type(input, "No Such Face");
		expect(screen.getByText(FACE_REFUSED_TEXT("No Such Face"))).toBeDefined();
		type(input, CSS_GENERIC_FACE.systemUi);
		expect(screen.queryByText(FACE_REFUSED_TEXT("No Such Face"))).toBeNull();
		expect(input.getAttribute("aria-invalid")).toBe("false");
		expect(onChange.mock.calls[0]?.[0]).toBe(CSS_GENERIC_FACE.systemUi);
	});

	test("re-committing the value already in force writes nothing", () => {
		const { onChange, input } = picker(FONT_ROLE.ui, DEFAULT_UI_FONT_FAMILY);
		type(input, DEFAULT_UI_FONT_FAMILY);
		expect(onChange).not.toHaveBeenCalled();
		expect(input.getAttribute("aria-invalid")).toBe("false");
	});

	test("an outside change wins over an abandoned draft, with no effect", () => {
		const { input, onChange } = picker(FONT_ROLE.ui, DEFAULT_UI_FONT_FAMILY);
		fireEvent.change(input, { target: { value: "half-typed" } });
		// The section's reset moves the stored value; the draft is abandoned.
		cleanup();
		const again = picker(FONT_ROLE.ui, CSS_GENERIC_FACE.systemUi);
		expect(again.input.value).toBe(CSS_GENERIC_FACE.systemUi);
		expect(onChange).not.toHaveBeenCalled();
	});
});
