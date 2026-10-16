import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Button } from "@/components/Button";
import { BUTTON_STYLE } from "@/constants/settingsUi";

afterEach(cleanup);

/**
 * M4.21: the kit's `Button` is the shared input/button style as a component.
 * The style comes from the constant, never a literal, so the test asserts
 * against the constant too.
 */

describe("Button", () => {
	test("renders a button carrying the shared style", () => {
		render(<Button>Save</Button>);
		const button = screen.getByRole("button", { name: "Save" });
		expect(button.getAttribute("type")).toBe("button");
		expect(button.style.cursor).toBe(BUTTON_STYLE.cursor ?? "");
		expect(button.style.background).toBe(String(BUTTON_STYLE.background ?? ""));
	});

	test("a style prop adds to the shared style, never replaces it", () => {
		render(<Button style={{ color: "red" }}>Save</Button>);
		const button = screen.getByRole("button", { name: "Save" });
		expect(button.style.color).toBe("red");
		expect(button.style.cursor).toBe(BUTTON_STYLE.cursor ?? "");
	});

	test("a data attribute rides the same element", () => {
		render(<Button data-hook="save">Save</Button>);
		expect(screen.getByRole("button", { name: "Save" }).getAttribute("data-hook")).toBe("save");
	});
});
