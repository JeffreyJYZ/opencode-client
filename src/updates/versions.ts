/**
 * The one place that decides whether a release may surface (M5.6).
 *
 * A dismissal is remembered **per version** (the release the user declined), so
 * the rule is: a release surfaces unless it is the declined one or is older
 * than it. A *newer* release still reaches the user — that is the whole promise
 * of a dismissal, and it is why the compare below is a dot-number compare and
 * not a string equality.
 *
 * Both decisions live here and nowhere else, so the notice and the Settings
 * section cannot disagree about what the user has already refused.
 */

const DOT_VERSION = /^\d+\.\d+\.\d+$/;

/** The numbers of a dot-version, or `null` when it is not one. */
function parts(version: string): readonly number[] | null {
	if (!DOT_VERSION.test(version)) return null;
	return version.split(".").map(Number);
}

/** Whether `candidate` is strictly newer than `baseline`. */
function isNewer(candidate: string, baseline: string): boolean {
	const a = parts(candidate);
	const b = parts(baseline);
	if (a === null || b === null) return false;
	return a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])));
}

/**
 * Whether an offered release may still be shown after `declined` was declined.
 *
 * `null` means nothing was declined, so everything surfaces. A release that
 * cannot be compared by number (`1.3.0-rc1`) surfaces as well: an undecidable
 * pair must not hide a real update forever.
 */
export function surfacesAfterDismissal(offered: string, declined: string | null): boolean {
	if (declined === null) return true;
	if (offered === declined) return false;
	if (parts(offered) === null || parts(declined) === null) return true;
	return isNewer(offered, declined);
}
