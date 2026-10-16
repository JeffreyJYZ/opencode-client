import {
	PLUGIN_DATA_MAX_BYTES,
	PLUGIN_STORAGE_KEY_PATTERN,
	PLUGIN_STORAGE_SEPARATOR,
} from "@/constants/plugins";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";

/**
 * A plugin's own key-value store (spec 040 §The host, `storage`), **capped and
 * namespace-scoped per plugin id**.
 *
 * - The host joins the plugin's id and its keys with `PLUGIN_STORAGE_SEPARATOR`,
 *   so two plugins writing the same key write two different rows and a plugin
 *   cannot read another's keys through this API. A key carrying the separator (or
 *   any character outside the pattern) is **refused**, not silently scoped.
 * - The total a plugin holds is bounded by `PLUGIN_DATA_MAX_BYTES`. A write that
 *   would cross the cap is **refused**, never trimmed: a trimmed value is a
 *   corrupt one and the plugin cannot tell.
 *
 * A refusal **rejects** the returned promise and records a `PluginFault`, so the
 * attempt is visible both to the plugin that made it and in the manager's log.
 * The backend is a port: `createMemoryStorageBackend` is the dev/test one, and
 * M4.5 supplies the persisted one.
 */

export type PluginStorageBackend = {
	read(key: string): string | null;
	write(key: string, value: string): void;
	remove(key: string): void;
	/** Every key this backend holds, namespaced or not. */
	keys(): readonly string[];
};

/** The backend a host gets when the app supplies none: one process's memory. */
export function createMemoryStorageBackend(): PluginStorageBackend {
	const values = new Map<string, string>();
	return {
		read: (key) => values.get(key) ?? null,
		write: (key, value) => {
			values.set(key, value);
		},
		remove: (key) => {
			values.delete(key);
		},
		keys: () => [...values.keys()],
	};
}

export type PluginStorage = {
	get(key: string): Promise<string | null>;
	set(key: string, value: string): Promise<void>;
	delete(key: string): Promise<void>;
	/** The plugin's own keys, without the namespace. */
	keys(): Promise<readonly string[]>;
};

const encoder = new TextEncoder();

/** The bytes a value occupies, which is what the cap counts. */
export function byteLength(value: string): number {
	return encoder.encode(value).length;
}

export type StorageInput = {
	readonly pluginId: string;
	readonly backend: PluginStorageBackend;
	readonly maxBytes?: number;
};

export function createPluginStorage(input: StorageInput): PluginStorage {
	const { pluginId, backend } = input;
	const maxBytes = input.maxBytes ?? PLUGIN_DATA_MAX_BYTES;
	const prefix = `${pluginId}${PLUGIN_STORAGE_SEPARATOR}`;
	const own = (key: string) => key.startsWith(prefix);
	const scoped = (key: string) => `${prefix}${key}`;

	function refuse(reason: FaultReason, subject: string, message: string): Error {
		recordFault({ area: FAULT_AREAS.storage, reason, subject, message });
		return new Error(message);
	}

	/** A key the plugin may not name: empty, or not one path-safe component. */
	function keyProblem(key: unknown): string | null {
		if (typeof key !== "string" || key === "") return "an empty key";
		if (!PLUGIN_STORAGE_KEY_PATTERN.test(key)) {
			return `the key "${key}" is not one path-safe component (the namespace is the host's)`;
		}
		return null;
	}

	function usedBytes(): number {
		let total = 0;
		for (const key of backend.keys()) {
			if (own(key)) total += byteLength(backend.read(key) ?? "");
		}
		return total;
	}

	function refuseKey(operation: string, key: unknown): Error {
		return refuse(
			FAULT_REASONS.invalidKey,
			String(key),
			`storage.${operation} refused: ${keyProblem(key)}`,
		);
	}

	return {
		async get(key) {
			if (keyProblem(key) !== null) throw refuseKey("get", key);
			return backend.read(scoped(key));
		},
		async set(key, value) {
			if (keyProblem(key) !== null) throw refuseKey("set", key);
			if (typeof value !== "string") {
				throw refuse(
					FAULT_REASONS.malformedEntry,
					String(key),
					`storage.set refused: the value of "${String(key)}" is not a string`,
				);
			}
			const previous = backend.read(scoped(key));
			const total =
				usedBytes() - (previous === null ? 0 : byteLength(previous)) + byteLength(value);
			if (total > maxBytes) {
				throw refuse(
					FAULT_REASONS.storageOverCap,
					pluginId,
					`the write of "${key}" would put "${pluginId}" at ${total} bytes, over the ${maxBytes}-byte cap; the value was refused, not trimmed`,
				);
			}
			backend.write(scoped(key), value);
		},
		async delete(key) {
			if (keyProblem(key) !== null) throw refuseKey("delete", key);
			backend.remove(scoped(key));
		},
		async keys() {
			return backend
				.keys()
				.filter(own)
				.map((key) => key.slice(prefix.length));
		},
	};
}
