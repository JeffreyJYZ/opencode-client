import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_KIT } from "@/app/hostKit";
import { buildHostPorts } from "@/app/hostPorts";
import { clearFaults } from "@/plugins/faults";
import { createHostFactory } from "@/plugins/host";
import { dataDirOf, type NativeFs } from "@/plugins/services/native";
import { createTranscriptStore } from "@/session/transcriptStore";

/**
 * M4.11: the app's published ports carry `native`. Where there is no shell the
 * port is absent (the host's `native === null`); where there is a data root, a
 * plugin's host reads and writes **inside its own** `plugin-data/<id>/` through
 * the real filesystem adapter, which is the app path M4.16's row needs.
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

const PLUGIN_ID = "probe";

let root = "";

beforeEach(async () => {
	clearFaults();
	root = await mkdtemp(join(tmpdir(), "m411-ports-"));
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("the app's published host ports", () => {
	test("with no data root the port is absent, so the host's native is null", async () => {
		const ports = await buildHostPorts({
			client: null,
			transcripts: createTranscriptStore(),
			nativeRoot: null,
		});
		expect(ports.native).toBeUndefined();
		expect(createHostFactory(ports)(PLUGIN_ID).host.native).toBeNull();
	});

	test("with a data root a plugin reads and writes inside its own data directory", async () => {
		const ports = await buildHostPorts({
			client: null,
			transcripts: createTranscriptStore(),
			nativeRoot: root,
			nativeFs: fs,
		});
		const { host } = createHostFactory(ports)(PLUGIN_ID);
		const native = host.native;
		if (native === null) throw new Error("the published ports left native null");
		await native.write("notes/a.txt", "hello");
		expect(await native.read("notes/a.txt")).toBe("hello");
		// It landed under the plugin's own directory, not the bare root.
		const onDisk = join(dataDirOf(root, PLUGIN_ID), "notes", "a.txt");
		expect(await readFile(onDisk, "utf8")).toBe("hello");
	});

	test("the published ports carry the real kit, so a plugin's host has it", async () => {
		const ports = await buildHostPorts({
			client: null,
			transcripts: createTranscriptStore(),
			nativeRoot: null,
		});
		expect(ports.kit).toBe(APP_KIT);
		expect(createHostFactory(ports)(PLUGIN_ID).host.ui.kit).toBe(APP_KIT);
	});
});
