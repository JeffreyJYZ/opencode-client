import {
	COMPOSER_ATTACH_TYPE,
	COMPOSER_ATTACH_UNSUPPORTED,
	COMPOSER_LABEL,
	COMPOSER_PROMPT_LABEL,
	COMPOSER_SEND_LABEL,
} from "@/constants/composer";
import { E2E_SESSION_DIR } from "@/constants/e2e";
import { ROUTE_KIND } from "@/constants/routes";
import { TARGET_GLOBAL } from "@/constants/server";
import { TRANSCRIPT_LABEL } from "@/constants/transcriptUi";

/**
 * The proof's whole assertion set, kept in one place so a reader can see what `bun run
 * e2e` actually checks without reading the orchestration around it. Small and
 * load-bearing on purpose: six checks that would each fail for a real reason.
 *
 * Every expression runs **in the page** and answers a boolean, and every selector is
 * built from the same named constants the components use (`COMPOSER_LABEL`,
 * `TRANSCRIPT_LABEL`, `ROUTE_KIND`), so renaming a region breaks this at compile time
 * rather than silently asserting nothing. None of them asserts the DOM's paint.
 */

/** One assertion: a label for the verdict, and the in-page expression that must be true. */
export type Check = {
	readonly label: string;
	readonly expression: string;
};

/** The home surface: the shell booted, the injected target is in play, and it was fetched. */
export function homeChecks(targetUrl: string): Check[] {
	return [
		{
			label: "the shell boots and home renders",
			expression: `!!document.querySelector('main[data-route="${ROUTE_KIND.home}"]')`,
		},
		{
			label: "the injected target is the one in play",
			expression: `(() => { const t = globalThis.${TARGET_GLOBAL}; return !!t && t.url === ${JSON.stringify(targetUrl)}; })()`,
		},
		{
			label: "home lists the seeded session, so the target was really fetched",
			expression: `(() => document.body.innerText.includes(${JSON.stringify(E2E_SESSION_DIR)}))()`,
		},
	];
}

/** The drop target — the composer's own prompt field, by its named label. */
const FIELD = `textarea[aria-label="${COMPOSER_PROMPT_LABEL}"]`;

/**
 * The composer's drop rules (M5.2, requirement 5). This is the **DOM** route, which is
 * the one the web build has; a Finder drop goes through the shell instead and is proven
 * only in the built app. Each expression returns a promise, because a drop's attachment
 * lands on a re-render the proof has to let flush before it looks.
 */
export function composerDropChecks(): Check[] {
	return [
		{
			label: "a dropped path attaches, named from its last segment",
			expression: `(async () => {
				const field = document.querySelector(${JSON.stringify(FIELD)});
				if (!(field instanceof HTMLTextAreaElement)) return false;
				const data = new DataTransfer();
				data.setData(${JSON.stringify(COMPOSER_ATTACH_TYPE)}, "file:///tmp/e2e-drop.txt");
				field.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: data }));
				await new Promise((resolve) => setTimeout(resolve, 80));
				return document.body.innerText.includes("e2e-drop.txt");
			})()`,
		},
		{
			label: "a drop with no path says so and keeps the draft",
			expression: `(async () => {
				const field = document.querySelector(${JSON.stringify(FIELD)});
				if (!(field instanceof HTMLTextAreaElement)) return false;
				const value = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
				value.call(field, "keep me");
				field.dispatchEvent(new Event("input", { bubbles: true }));
				const data = new DataTransfer();
				data.items.add(new File(["x"], "no-path.txt", { type: "text/plain" }));
				field.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: data }));
				await new Promise((resolve) => setTimeout(resolve, 80));
				return document.body.innerText.includes(${JSON.stringify(COMPOSER_ATTACH_UNSUPPORTED)}) && field.value === "keep me";
			})()`,
		},
	];
}

/** A session's own surface: the transcript region, and a composer with a send affordance. */
export function sessionChecks(sessionID: string): Check[] {
	return [
		{
			label: "opening a session shows its transcript region",
			expression: `!!document.querySelector('main[data-route="${ROUTE_KIND.session}"][data-session="${sessionID}"] [aria-label="${TRANSCRIPT_LABEL}"]')`,
		},
		{
			label: "the composer exists with a send affordance",
			expression: `(() => { const box = document.querySelector('[aria-label="${COMPOSER_LABEL}"]'); if (!box) return false; if (!box.querySelector('textarea[aria-label="${COMPOSER_PROMPT_LABEL}"]')) return false; return [...box.querySelectorAll('button')].some((b) => b.textContent.trim() === ${JSON.stringify(COMPOSER_SEND_LABEL)}); })()`,
		},
		...composerDropChecks(),
	];
}
