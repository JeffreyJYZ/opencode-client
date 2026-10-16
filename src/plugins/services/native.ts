import { openExternal as openInBrowser } from "@/components/transcript/externalLink";
import { PLUGIN_DATA_DIR } from "@/constants/plugins";
import { FAULT_AREAS, FAULT_REASONS, recordFault } from "@/plugins/faults";
import { isInside, PATH_SEPARATOR, parentOf, pathProblem } from "@/plugins/services/nativePath";

/**
 * The `native` service (spec 040 §The host, `native`): the shell's filesystem,
 * **path-scoped to `plugin-data/<id>/`**. Every method resolves the plugin-named
 * path first — a parent segment or an absolute path is refused by the pure rule,
 * and a path whose **resolved parent** leaves the data directory (a symlink) is
 * refused too, so an escape is refused rather than discouraged.
 *
 * The filesystem is a port (`NativeFs`): the app's adapter is the Tauri bridge
 * (M5.2), and the tests' is the real one, so a symlink is a symlink. A host with
 * no adapter has `native === null` (spec 040: "`null` on web"), so a plugin checks
 * for `null` instead of calling into a shell that is not there.
 */

export type NativeFs = {
	/** The real path: every symlink in `path` resolved. Rejects when it does not exist. */
	readonly realpath: (path: string) => Promise<string>;
	readonly readText: (path: string) => Promise<string>;
	readonly writeText: (path: string, value: string) => Promise<void>;
	readonly list: (dir: string) => Promise<readonly string[]>;
	readonly remove: (path: string) => Promise<void>;
	readonly mkdirp: (dir: string) => Promise<void>;
};

export type PluginNative = {
	dataDir(): Promise<string>;
	read(relative: string): Promise<string>;
	write(relative: string, value: string): Promise<void>;
	list(relative?: string): Promise<readonly string[]>;
	remove(relative: string): Promise<void>;
	openExternal(url: string): Promise<void>;
	pickDirectory(defaultPath?: string): Promise<string | null>;
};

export type NativeInput = {
	readonly pluginId: string;
	readonly fs: NativeFs;
	/** The app's data root; the data dir is `<root>/plugin-data/<id>`. */
	readonly dataRoot: string;
	readonly openExternal?: (url: string) => void;
	readonly pickDirectory?: (defaultPath?: string) => Promise<string | null>;
};

/** The one place the data directory's shape is decided. */
export function dataDirOf(dataRoot: string, pluginId: string): string {
	return `${dataRoot}${PATH_SEPARATOR}${PLUGIN_DATA_DIR}${PATH_SEPARATOR}${pluginId}`;
}

export function createPluginNative(input: NativeInput): PluginNative {
	const { pluginId, fs } = input;
	const dir = dataDirOf(input.dataRoot, pluginId);
	const open = input.openExternal ?? openInBrowser;
	const pick = input.pickDirectory ?? (async () => null);

	function refuse(subject: string, message: string): Error {
		recordFault({
			area: FAULT_AREAS.native,
			reason: FAULT_REASONS.pathEscape,
			subject,
			message,
		});
		return new Error(message);
	}

	async function rootDir(): Promise<string> {
		await fs.mkdirp(dir);
		return fs.realpath(dir);
	}

	/**
	 * The absolute path a plugin-named one resolves to, or a refusal. The pure
	 * rule runs first (it needs no filesystem), then the **parent's** real path is
	 * checked against the data directory's — which is where a symlink is caught,
	 * and it works for a write, whose own target does not exist yet.
	 */
	async function resolve(relative: string, create: boolean): Promise<string> {
		const problem = pathProblem(relative);
		if (problem !== null) throw refuse(relative, `native refused "${relative}": ${problem}`);
		const root = await rootDir();
		const target = `${dir}${PATH_SEPARATOR}${relative}`;
		const parent = parentOf(target);
		if (create) await fs.mkdirp(parent);
		const realParent = await fs.realpath(parent);
		if (!isInside(root, realParent)) {
			throw refuse(
				relative,
				`native refused "${relative}": it resolves outside "${dir}" — a symlink leaves the plugin's own data directory`,
			);
		}
		return target;
	}

	return {
		async dataDir() {
			await fs.mkdirp(dir);
			return dir;
		},
		async read(relative) {
			return fs.readText(await resolve(relative, false));
		},
		async write(relative, value) {
			await fs.writeText(await resolve(relative, true), value);
		},
		async list(relative = "") {
			const target = relative === "" ? await rootDir() : await resolve(relative, false);
			return fs.list(target);
		},
		async remove(relative) {
			await fs.remove(await resolve(relative, false));
		},
		async openExternal(url) {
			open(url);
		},
		async pickDirectory(defaultPath) {
			return pick(defaultPath);
		},
	};
}
