import { useEffect, useState } from "react";
import { HIGHLIGHT_DEBOUNCE_MS } from "@/constants/markdown";
import { highlightCode } from "./highlight";

/**
 * One fence's highlighted HTML, debounced (M2.3).
 *
 * A fence that is still streaming changes on every delta; highlighting each
 * intermediate state would run the engine once per frame for text nobody reads.
 * So the work is scheduled `HIGHLIGHT_DEBOUNCE_MS` after the code last changed —
 * a streamed fence, however many deltas it arrives in, settles once and runs the
 * engine once. `highlightCode` itself memoises, so a later re-render (an
 * unrelated row appending above) does not run it again either.
 */

export function useHighlightedCode(code: string, language: string): string | null {
	const [html, setHtml] = useState<string | null>(null);
	useEffect(() => {
		let live = true;
		const timer = setTimeout(() => {
			void highlightCode(code, language).then((result) => {
				if (live) setHtml(result);
			});
		}, HIGHLIGHT_DEBOUNCE_MS);
		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [code, language]);
	return html;
}
