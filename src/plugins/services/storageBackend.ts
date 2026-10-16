import { PLUGIN_STORAGE_BACKEND_KEY } from "@/constants/plugins";
import type { PluginStorageBackend } from "@/plugins/services/storage";

/**
 * The app's **persisted** plugin-storage backend (M4.10): one `localStorage` row
 * holding the whole namespaced map, so a plugin's `storage` survives a reload.
 *
 * The brief named a backend "rooted at the plugin data root" — that root does not
 * exist yet (see `native/`: the M5.2 bridge has no filesystem commands and no data
 * root), so this roots it where the app's own data already lives, `localStorage`,
 * beside the settings blob and the installed records. The cap is still
 * `PLUGIN_DATA_MAX_BYTES`, enforced a layer up in `createPluginStorage`, so the
 * backend stores bytes and never decides what fits.
 *
 * A backend with no `localStorage` (a DOM-less test) is **memory only**: reads and
 * writes work for the process and nothing persists, which is honest rather than a
 * throw.
 */

/** The browser's storage, or `null` where there is none (a DOM-less test). */
function store(): Storage | null {
	return typeof localStorage === "undefined" ? null : localStorage;
}

/** The parsed map, or `{}` for anything unreadable — the next write replaces it. */
function readMap(storage: Storage): Record<string, string> {
	try {
		const raw = storage.getItem(PLUGIN_STORAGE_BACKEND_KEY);
		if (raw === null) return {};
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
		const map: Record<string, string> = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (typeof value === "string") map[key] = value;
		}
		return map;
	} catch {
		return {};
	}
}

export function createLocalStorageBackend(storage: Storage | null = store()): PluginStorageBackend {
	const memory = new Map<string, string>();

	function read(key: string): string | null {
		if (storage === null) return memory.get(key) ?? null;
		return readMap(storage)[key] ?? null;
	}

	function write(key: string, value: string): void {
		if (storage === null) {
			memory.set(key, value);
			return;
		}
		storage.setItem(
			PLUGIN_STORAGE_BACKEND_KEY,
			JSON.stringify({ ...readMap(storage), [key]: value }),
		);
	}

	function remove(key: string): void {
		if (storage === null) {
			memory.delete(key);
			return;
		}
		const map = readMap(storage);
		delete map[key];
		storage.setItem(PLUGIN_STORAGE_BACKEND_KEY, JSON.stringify(map));
	}

	function keys(): readonly string[] {
		if (storage === null) return [...memory.keys()];
		return Object.keys(readMap(storage));
	}

	return { read, write, remove, keys };
}
