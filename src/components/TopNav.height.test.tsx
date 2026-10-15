import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { TopNav } from "@/components/TopNav";

afterEach(cleanup);

function renderNav() {
	return render(
		<Providers>
			<TopNav />
		</Providers>,
	);
}

describe("TopNav height contract", () => {
	test("the nav owns its height from the height token", () => {
		const { container } = renderNav();
		expect(container.querySelector("nav")?.style.height).toBe("var(--oc-nav-height)");
	});
});
