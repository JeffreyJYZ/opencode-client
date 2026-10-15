import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("base.css root theme contract", () => {
	test("carries the root rule", () => {
		const text = readFileSync(join(process.cwd(), "src", "theme", "base.css"), "utf8");
		expect(text).toContain("box-sizing: border-box");
		expect(text).toContain("margin: 0");
		expect(text).toContain("font-family: var(--oc-font-ui)");
		expect(text).toContain("font-size: var(--oc-font-ui-size)");
		expect(text).toContain("line-height: var(--oc-leading)");
		expect(text).toContain("background: var(--oc-surface)");
		expect(text).toContain("color: var(--oc-text)");
		expect(text).toContain("color-scheme");
		expect(text).toContain("font-family: var(--oc-font-code)");
	});
});
