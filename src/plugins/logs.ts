import { PLUGIN_LOG_LEVEL, type PluginLogLevel } from "@/constants/plugins";

/**
 * A plugin's scoped log (spec 040 §The host, `log`). The plugin manager (M4.5)
 * renders this list and nothing else reads it, which is why it is its own store
 * rather than a `PluginFault` — a log line is not a refusal.
 */

export type PluginLogEntry = {
	readonly id: number;
	readonly pluginId: string;
	readonly level: PluginLogLevel;
	readonly message: string;
	readonly at: number;
};

/** A line as a caller writes it; the store assigns the id and the time. */
export type LogInput = Omit<PluginLogEntry, "id" | "at">;

let entries: readonly PluginLogEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function notify(): void {
	for (const listener of listeners) listener();
}

export function recordLog(input: LogInput): PluginLogEntry {
	const entry: PluginLogEntry = { id: nextId++, at: Date.now(), ...input };
	entries = [...entries, entry];
	notify();
	return entry;
}

/** Every line so far, oldest first. A stable identity until one is added. */
export function listLogs(): readonly PluginLogEntry[] {
	return entries;
}

/** Drop every line. The tests' reset; the manager (M4.5) may offer it as "clear". */
export function clearLogs(): void {
	entries = [];
	notify();
}

export function subscribeToLogs(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The logger a plugin's host hands it: every line is stamped with the plugin's id. */
export type PluginLogger = {
	readonly debug: (message: string) => void;
	readonly info: (message: string) => void;
	readonly warn: (message: string) => void;
	readonly error: (message: string) => void;
};

export function createLogger(pluginId: string): PluginLogger {
	const write = (level: PluginLogLevel) => (message: string) => {
		recordLog({ pluginId, level, message });
	};
	return {
		debug: write(PLUGIN_LOG_LEVEL.debug),
		info: write(PLUGIN_LOG_LEVEL.info),
		warn: write(PLUGIN_LOG_LEVEL.warn),
		error: write(PLUGIN_LOG_LEVEL.error),
	};
}
