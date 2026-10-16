import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Section } from "@/components/Section";

afterEach(cleanup);

/** M4.21: the kit's `Section` is the settings section frame by registry name. */

describe("Section", () => {
	test("renders a section carrying the registry name", () => {
		render(
			<Section name="appearance">
				<p>Body</p>
			</Section>,
		);
		const section = screen.getByText("Body").closest("section");
		expect(section?.getAttribute("data-section")).toBe("appearance");
	});
});
