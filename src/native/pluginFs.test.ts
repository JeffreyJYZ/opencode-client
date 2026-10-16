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
import { NATIVE_FS_COMMAND } from "@/constants/native";
import { PLUGIN_DATA_DIR } from "@/constants/plugins";
import { createNativeFs, type NativeSend } from "@/native/pluginFs";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import { createPluginNative } from "@/plugins/services/native";

/**
 * The `native` service through its **real adapter** (M4.16). The transport is the
 * IPC boundary: here it is node's filesystem, exactly as `native.test.ts` models the
 * port, and every call is recorded, so the command names and the absolute path the
 * service hands over are both visible. The shell's own scoping is proven in Rust
 * (`src-tauri/src/native/fs/tests.rs`).
 */

let root = "";
let calls: Array<{ command: string; args: Record<string, unknown> }> = [];

const send: NativeSend = async (command, args) => {
	calls.push({ command, args });
	const path = String(args.path);
	switch (command) {
		case NATIVE_FS_COMMAND.realpath:
			return realpath(path);
		case NATIVE_FS_COMMAND.readText:
			return readFile(path, "utf8");
		case NATIVE_FS_COMMAND.writeText:
			await writeFile(path, String(args.value), "utf8");
			return null;
		case NATIVE_FS_COMMAND.list:
			return readdir(path);
		case NATIVE_FS_COMMAND.remove:
			await rm(path, { recursive: true, force: true });
			return null;
		case NATIVE_FS_COMMAND.mkdirp:
			await mkdir(path, { recursive: true });
			return null;
		default:
			throw new Error(`unexpected command ${command}`);
	}
};

function service(pluginId: string) {
	return createPluginNative({ pluginId, fs: createNativeFs(send), dataRoot: root });
}

function expectEscape(): void {
	const fault = listFaults().at(-1);
	expect(fault?.area).toBe(FAULT_AREAS.native);
	expect(fault?.reason).toBe(FAULT_REASONS.pathEscape);
}

beforeEach(async () => {
	clearFaults();
	calls = [];
	root = await mkdtemp(join(tmpdir(), "m416-fs-"));
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("through the real adapter", () => {
	test("writes and reads inside the data directory, by the named commands", async () => {
		const native = service("m416-a");
		await native.write("notes/today.txt", "hello");
		expect(await native.read("notes/today.txt")).toBe("hello");
		expect(await native.list()).toContain("notes");
		const commands = calls.map((call) => call.command);
		expect(commands).toContain(NATIVE_FS_COMMAND.mkdirp);
		expect(commands).toContain(NATIVE_FS_COMMAND.writeText);
		expect(commands).toContain(NATIVE_FS_COMMAND.readText);
		const write = calls.find((call) => call.command === NATIVE_FS_COMMAND.writeText);
		expect(write?.args.path).toBe(join(root, PLUGIN_DATA_DIR, "m416-a", "notes/today.txt"));
	});

	test("dataDir is the one shape, and every path carries it", async () => {
		expect(await service("m416-a").dataDir()).toBe(join(root, PLUGIN_DATA_DIR, "m416-a"));
	});

	test("a parent segment is refused before the shell is called", async () => {
		await expect(service("m416-a").write("../escape.txt", "x")).rejects.toThrow();
		expectEscape();
		expect(calls).toHaveLength(0);
	});

	test("an absolute path is refused before the shell is called", async () => {
		await expect(service("m416-a").read("/etc/passwd")).rejects.toThrow();
		expectEscape();
		expect(calls).toHaveLength(0);
	});

	test("a symlink out of the directory is refused by its resolved parent", async () => {
		const native = service("m416-a");
		const dir = await native.dataDir();
		const outside = join(root, "outside");
		await mkdir(outside, { recursive: true });
		await symlink(outside, join(dir, "link"));
		await expect(native.write("link/escape.txt", "x")).rejects.toThrow();
		expectEscape();
		expect(await readdir(outside)).toEqual([]);
	});
});
