import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	realpath,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PLUGIN_DATA_DIR } from "@/constants/plugins";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import { createPluginNative, dataDirOf, type NativeFs } from "@/plugins/services/native";

/**
 * `native` (M4.4, spec 040 §The host): the shell's filesystem, path-scoped to the
 * plugin's own `plugin-data/<id>/`. The adapter here is the **real** filesystem, so
 * a symlink is a symlink and an escape that leaves the directory is refused by the
 * resolved-parent check, not merely discouraged by a string rule.
 */

const fs: NativeFs = {
	realpath: (path) => realpath(path),
	readText: (path) => readFile(path, "utf8"),
	writeText: (path, value) => writeFile(path, value, "utf8"),
	list: (dir) => readdir(dir),
	remove: (path) => rm(path, { recursive: true, force: true }),
	mkdirp: async (dir) => {
		await mkdir(dir, { recursive: true });
	},
};

let root = "";
let native = createPluginNative({ pluginId: "m44-a", fs, dataRoot: "" });

beforeEach(async () => {
	clearFaults();
	root = await mkdtemp(join(tmpdir(), "m44-native-"));
	native = createPluginNative({ pluginId: "m44-a", fs, dataRoot: root });
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

function expectEscape(message: string): void {
	const fault = listFaults().at(-1);
	expect(fault?.area).toBe(FAULT_AREAS.native);
	expect(fault?.reason).toBe(FAULT_REASONS.pathEscape);
	console.log(`[native escape] ${message}`);
}

describe("inside the data directory", () => {
	test("writes and re-reads only its own directory", async () => {
		await native.write("notes/today.txt", "hello");
		expect(await native.read("notes/today.txt")).toBe("hello");
		expect(await native.list()).toContain("notes");
		expect(await native.list("notes")).toEqual(["today.txt"]);
		await native.remove("notes/today.txt");
		expect(await native.list("notes")).toEqual([]);
	});

	test("dataDir is the one shape, below the root", async () => {
		expect(dataDirOf(root, "m44-a")).toBe(`${root}/${PLUGIN_DATA_DIR}/m44-a`);
		expect(await native.dataDir()).toBe(dataDirOf(root, "m44-a"));
	});

	test("openExternal and pickDirectory go through their ports", async () => {
		const opened: string[] = [];
		const withPorts = createPluginNative({
			pluginId: "m44-a",
			fs,
			dataRoot: root,
			openExternal: (url) => opened.push(url),
			pickDirectory: async () => "/picked",
		});
		await withPorts.openExternal("https://example.com");
		expect(opened).toEqual(["https://example.com"]);
		expect(await withPorts.pickDirectory()).toBe("/picked");
	});
});

describe("the three escapes", () => {
	test("a parent segment is refused by the pure rule", async () => {
		await expect(native.write("../escape.txt", "x")).rejects.toThrow();
		expectEscape(listFaults().at(-1)?.message ?? "");
		// Refused by the pure rule, before the filesystem is touched: no data dir even.
		expect(await readdir(root)).toEqual([]);
	});

	test("an absolute path is refused", async () => {
		await expect(native.read("/etc/passwd")).rejects.toThrow();
		expectEscape(listFaults().at(-1)?.message ?? "");
	});

	test("a symlink out of the directory is refused by its resolved parent", async () => {
		const dir = await native.dataDir();
		const outside = join(root, "outside");
		await mkdir(outside, { recursive: true });
		await symlink(outside, join(dir, "link"));
		await expect(native.write("link/escape.txt", "x")).rejects.toThrow();
		expectEscape(listFaults().at(-1)?.message ?? "");
		expect(await readdir(outside)).toEqual([]);
		await expect(native.read("link/escape.txt")).rejects.toThrow();
	});
});
