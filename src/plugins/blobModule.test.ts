import { describe, expect, test } from "bun:test";
import { bareSpecifiers } from "@/plugins/blobModule";

describe("bareSpecifiers", () => {
	test("finds a surviving bare specifier in each import form", () => {
		expect(bareSpecifiers('import x from "react";')).toEqual(["react"]);
		expect(bareSpecifiers('import "some-polyfill";')).toEqual(["some-polyfill"]);
		expect(bareSpecifiers('export { a } from "shared";')).toEqual(["shared"]);
		expect(bareSpecifiers('export * from "shared";')).toEqual(["shared"]);
		expect(bareSpecifiers('const p = import("lazy-dep");')).toEqual(["lazy-dep"]);
	});

	test("never reports a relative, absolute or scheme specifier", () => {
		expect(bareSpecifiers('import x from "./chunk.js";')).toEqual([]);
		expect(bareSpecifiers('import x from "../up.js";')).toEqual([]);
		expect(bareSpecifiers('import x from "/abs.js";')).toEqual([]);
		expect(bareSpecifiers('const u = "blob:abc";')).toEqual([]);
	});

	test("a built entry that imports nothing reports nothing", () => {
		expect(
			bareSpecifiers('export default { setup() { return "a note from the docs"; } };'),
		).toEqual([]);
	});
});
