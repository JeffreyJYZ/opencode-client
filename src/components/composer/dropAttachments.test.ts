import { describe, expect, test } from "bun:test";
import { attachmentsFromDrop, attachmentsFromPaths } from "@/components/composer/dropAttachments";
import { COMPOSER_ATTACH_FALLBACK_TYPE, COMPOSER_ATTACH_TYPE } from "@/constants/composer";

/**
 * How a drop becomes attachments (M5.2, requirement 5). There are **two** routes — the
 * DOM's `DataTransfer` and the shell's own paths for a Finder drop — and the point of
 * these tests is that they meet in `attachmentFrom`: the same name from the same path,
 * the same `sendable`, and the same refusal of anything without a path.
 */

/** A `DataTransfer` stand-in: exactly the two reads `attachmentsFromDrop` performs. */
function dropData(values: Record<string, string>, files: readonly { name: string }[] = []) {
	return { getData: (type: string) => values[type] ?? "", files };
}

describe("attachmentsFromDrop reads the DOM's own payload", () => {
	test("a file:// uri becomes one sendable attachment, named from its last segment", () => {
		const entries = attachmentsFromDrop(
			dropData({ [COMPOSER_ATTACH_TYPE]: "file:///Users/me/a b.ts\n" }),
		);
		expect(entries).toEqual([
			{ uri: "file:///Users/me/a b.ts", name: "a b.ts", sendable: true },
		]);
	});

	test("a blank uri list falls back to text/plain, and a blank line is dropped", () => {
		const entries = attachmentsFromDrop(
			dropData({ [COMPOSER_ATTACH_FALLBACK_TYPE]: "/tmp/one.ts\n\n/tmp/two.ts" }),
		);
		expect(entries.map((entry) => entry.name)).toEqual(["one.ts", "two.ts"]);
	});

	test("nothing with a path names what came instead, unsendable", () => {
		const entries = attachmentsFromDrop(dropData({}, [{ name: "no-path.txt" }]));
		expect(entries).toEqual([{ uri: "", name: "no-path.txt", sendable: false }]);
	});
});

describe("attachmentsFromPaths reuses the one rule that decides what an attachment is", () => {
	test("an absolute path is sendable, whatever its scheme form", () => {
		expect(attachmentsFromPaths(["/tmp/e2e-drop.txt"])).toEqual([
			{ uri: "/tmp/e2e-drop.txt", name: "e2e-drop.txt", sendable: true },
		]);
		expect(attachmentsFromPaths(["file:///tmp/dropped.ts"])).toEqual([
			{ uri: "file:///tmp/dropped.ts", name: "dropped.ts", sendable: true },
		]);
	});

	test("blank entries are dropped, not attached", () => {
		expect(attachmentsFromPaths(["", "   "])).toEqual([]);
		expect(attachmentsFromPaths([])).toEqual([]);
	});
});
