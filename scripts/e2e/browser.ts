import { E2E_BROWSER_SESSION } from "@/constants/e2e";
import { TARGET_GLOBAL } from "@/constants/server";
import { run } from "./infra";

/**
 * The `agent-browser` edge of the proof: every call is scoped to the proof's own
 * **private** session, and the initialisation script is what hands the page its target
 * — the browser's stand-in for the Tauri shell's injected global (spec 010 §Window),
 * registered before the first navigation so the app sees it at startup.
 *
 * The assertions run **in the page** and answer a boolean, so the proof never parses a
 * page dump and never asserts the DOM's paint, only the DOM's structure.
 */

/** Run one `agent-browser` command in the proof's private session. */
export function ab(args: string[]): { code: number; out: string; err: string } {
	return run(["agent-browser", "--session", E2E_BROWSER_SESSION, ...args]);
}

/** Write the init script that injects the target global before any page script runs. */
export async function writeInitScript(path: string, url: string, password: string): Promise<void> {
	await Bun.write(path, `window.${TARGET_GLOBAL} = ${JSON.stringify({ url, password })};\n`);
}

/** Navigate to `appUrl` with the injected target registered for this and later loads. */
export function openPage(appUrl: string, initScript: string): void {
	ab(["open", appUrl, "--init-script", initScript]);
}

/** Evaluate an expression that must answer a boolean; anything else counts as a gap. */
export function evalBool(expression: string): boolean {
	const { out } = ab(["eval", expression]);
	const line = out.trim().split("\n").filter(Boolean).pop() ?? "";
	try {
		return JSON.parse(line) === true;
	} catch {
		return false;
	}
}

/** The page's own errors, as text — empty means clean. */
export function pageErrors(): string {
	return ab(["errors"]).out.trim();
}

/** Close the proof's session only. `--all` closes every agent's, so it is never used. */
export function closeBrowser(): void {
	ab(["close"]);
}
