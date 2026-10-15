/**
 * Copy a statusline segment's value (spec 020 §Statusline: "click copies").
 *
 * Best-effort on purpose: the Clipboard API is absent in some webviews and a
 * permission can be refused, and neither is worth a toast for a copy the user
 * can redo by selecting the text. Nothing else in the statusline is decorative,
 * so a segment that cannot copy still names what it holds in its title.
 */
export async function copyValue(value: string): Promise<void> {
	try {
		await navigator.clipboard?.writeText(value);
	} catch {
		// A refused clipboard is not a state the statusline reports.
	}
}
