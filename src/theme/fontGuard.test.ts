import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

function walk(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) out.push(...walk(path));
		else out.push(path);
	}
	return out;
}

describe("font-family guard", () => {
	test("no source file outside the theme layer declares a font family", () => {
		const src = join(process.cwd(), "src");
		const theme = join(src, "theme");
		const offenders: string[] = [];
		for (const file of walk(src)) {
			if (!file.startsWith(src)) continue;
			if (file.startsWith(theme)) continue;
			if (!/\.(ts|tsx|css)$/.test(file)) continue;
			const text = readFileSync(file, "utf8");
			if (/fontFamily|font-family/i.test(text)) offenders.push(relative(src, file));
		}
		expect(offenders).toEqual([]);
	});
});
