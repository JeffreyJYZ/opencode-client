#!/usr/bin/env bun
import { readFileSync } from "node:fs";
/**
 * File-length gate. No code file may exceed MAX_FILE_LINES.
 *
 * Why a gate and not a convention: a file past the cap stops being something a
 * reader (or an agent) holds in one pass, and it is usually two responsibilities
 * sharing a file. The fix is always a split along a seam, never a shorter name
 * or a tighter loop. Docs are exempt — a spec is prose and is split when it stops
 * being skimmable, not at a line count.
 *
 * Run by `bun run verify`. Exits non-zero when any file is over the cap.
 */
import { Glob } from "bun";

/** The house cap for a code or config file. */
const MAX_FILE_LINES = 150;

/** Extensions the cap covers. Markdown is deliberately absent. */
const PATTERNS = ["**/*.{ts,tsx,js,jsx,mjs,cjs,css,json,html}", "src-tauri/**/*.rs"];

/**
 * Paths the cap does not apply to: build output, dependencies, byte-identical
 * vendored copies (splitting them would break the diff against the mirror), and
 * machine-generated artifacts (a split would make them differ from their generator).
 * `src/test/fixtures/` is the last kind: a captured stream or message list is one
 * long line per frame on purpose, and reformatting it would stop it being the
 * server's own bytes.
 */
const SKIP_PREFIXES = [
	"node_modules/",
	"dist/",
	"src-tauri/target/",
	"src-tauri/gen/",
	"public/plugins/",
	"src/theme/vendor/",
	"src/docs/reference.generated.ts",
	"src/test/fixtures/",
	".superpowers/",
];

/** Paths excluded by exact name rather than prefix. */
const SKIP_EXACT = new Set(["bun.lock"]);

/** The path segments of a repo-relative path, for prefix matching. */
function isSkipped(file: string): boolean {
	if (SKIP_EXACT.has(file)) return true;
	return SKIP_PREFIXES.some((prefix) => file.startsWith(prefix));
}

/** Lines in `text`, counting a file that does not end in a newline as one more. */
function countLines(text: string): number {
	if (text === "") return 0;
	let newlines = 0;
	for (let index = 0; index < text.length; index++) {
		if (text.charCodeAt(index) === 10) newlines++;
	}
	return text.endsWith("\n") ? newlines : newlines + 1;
}

const offenders: Array<{
	file: string;
	lines: number;
}> = [];
let checked = 0;

for (const pattern of PATTERNS) {
	for (const file of new Glob(pattern).scanSync({
		cwd: process.cwd(),
	})) {
		if (isSkipped(file)) continue;
		checked++;
		const lines = countLines(readFileSync(file, "utf8"));
		if (lines > MAX_FILE_LINES)
			offenders.push({
				file,
				lines,
			});
	}
}

if (offenders.length > 0) {
	offenders.sort((a, b) => b.lines - a.lines);
	console.error(`file length: ${offenders.length} file(s) over ${MAX_FILE_LINES} lines\n`);
	for (const { file, lines } of offenders) {
		console.error(`  ${file}: ${lines} lines (${lines - MAX_FILE_LINES} over)`);
	}
	console.error("\nSplit along a seam — a module per responsibility, not a truncated function.");
	process.exit(1);
}

console.log(`file length: ${checked} files, all at or under ${MAX_FILE_LINES} lines`);
