import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BUNDLED_FACE } from "@/constants/fontAssets";
import { BUNDLED_CODE_FONT_FAMILY } from "@/constants/settings";

/**
 * The bundled faces (M3.1). Three claims are made about them and all three are
 * checked here rather than asserted in prose: the committed bytes are the copy
 * that shipped, the licence travels with them, and `base.css` declares each under
 * the family the webview resolves.
 */

const read = (path: string): string => readFileSync(join(process.cwd(), path), "utf8");

const css = read("src/theme/base.css").replace(/\s+/g, " ");
const foundations = read("src/theme/foundations.css").replace(/\s+/g, " ");

/** The url `base.css` uses for a repo-relative asset path. */
function cssUrl(path: string): string {
	return `url("../${path.replace(/^src\//, "")}")`;
}

describe("bundled faces", () => {
	for (const [role, face] of Object.entries(BUNDLED_FACE)) {
		test(`${role}: the committed file is the one that shipped, with its licence`, () => {
			const bytes = readFileSync(join(process.cwd(), face.path));
			expect(createHash("sha256").update(bytes).digest("hex")).toBe(face.sha256);
			expect(existsSync(join(process.cwd(), face.licence))).toBe(true);
			expect(read(face.licence)).toContain("SIL OPEN FONT LICENSE Version 1.1");
		});

		test(`${role}: base.css declares it by resolved family name`, () => {
			expect(css).toContain(`font-family: "${face.family}"`);
			expect(css).toContain(cssUrl(face.path));
		});
	}

	test("the code stack falls back to the bundled mono face, then the system stack", () => {
		expect(foundations).toContain(
			`--oc-font-code: var(--oc-font-code-family), "${BUNDLED_CODE_FONT_FAMILY}", ui-monospace`,
		);
	});

	test("the machine's Nerd Font is not bundled — the cask owns it", () => {
		const names = readdirSync(join(process.cwd(), "src/assets/fonts"), { recursive: true }).map(
			String,
		);
		expect(names.filter((name) => /NerdFont/i.test(name))).toEqual([]);
	});
});
