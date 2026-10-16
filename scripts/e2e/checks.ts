import { COMPOSER_LABEL, COMPOSER_PROMPT_LABEL, COMPOSER_SEND_LABEL } from "@/constants/composer";
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
	];
}
