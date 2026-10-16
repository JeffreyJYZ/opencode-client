import { useEffect, useState } from "react";
import type { Host } from "@/plugins/sdk";

/**
 * session-export — a palette command that reads `transcript.snapshot()` and
 * writes the open session's transcript through the plugin's **own** storage
 * (capped and namespaced per plugin id) and, when the shell offers a filesystem,
 * into `plugin-data/session-export/` (spec 040 §Plugins shipped as examples).
 *
 * It declares `plugin-data` — the one capability the shell enforces — because it
 * writes into its own data directory. It makes no network call, so `net` is
 * absent on purpose.
 */

const COMMAND_ID = "session-export.export";
const COMMAND_TITLE = "Session: export transcript";
const SECTION_ID = "session-export.section";
const SECTION_TITLE = "Session export";
const STORAGE_KEY = "last-export";
const FILE_NAME = "last-export.md";
const EMPTY_NOTE = "No export yet. Run “Session: export transcript” from the palette.";
const NOTE_STYLE = { color: "var(--oc-text-muted)", margin: 0 };

function asMarkdown(snapshot: { sessionID: string | null; rows: readonly unknown[] }): string {
	const lines = [`# Session ${snapshot.sessionID ?? "(none open)"}`, ""];
	for (const row of snapshot.rows) lines.push(`- ${JSON.stringify(row)}`);
	return `${lines.join("\n")}\n`;
}

async function exportNow(host: Host): Promise<void> {
	const snapshot = host.transcript.snapshot();
	const text = asMarkdown(snapshot);
	await host.storage.set(STORAGE_KEY, text);
	if (host.native !== null) await host.native.write(FILE_NAME, text);
	host.notify.toast(`Exported ${snapshot.rows.length} row(s).`);
	host.log.info(`exported ${snapshot.rows.length} row(s) of ${String(snapshot.sessionID)}`);
}

function ExportSection({ host }: { readonly host: Host }) {
	const [size, setSize] = useState<string | null>(null);
	useEffect(() => {
		let live = true;
		host.storage
			.get(STORAGE_KEY)
			.then((stored) => {
				if (live) setSize(stored === null ? null : `${stored.length} characters`);
			})
			.catch(() => {});
		return () => {
			live = false;
		};
	}, [host]);
	return <p style={NOTE_STYLE}>{size === null ? EMPTY_NOTE : `Last export: ${size}.`}</p>;
}

export default {
	setup(host: Host) {
		host.commands.register({
			id: COMMAND_ID,
			title: COMMAND_TITLE,
			run: () => {
				void exportNow(host).catch((error: unknown) => {
					host.log.error(`export failed: ${String(error)}`);
				});
			},
		});
		host.settings.registerSection({
			id: SECTION_ID,
			title: SECTION_TITLE,
			component: () => <ExportSection host={host} />,
		});
	},
};
