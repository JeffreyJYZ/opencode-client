import type { RefObject } from "react";
import { useEffect } from "react";
import { COMPOSER_SLASH_PREFIX } from "@/constants/composer";
import { COMMAND_RUN_EVENT } from "@/constants/palette";

/**
 * M1.6's named seam, filled (M2.5): the palette's command row fires
 * `COMMAND_RUN_EVENT` and the composer appends `/<name> ` to the box — the same text
 * accepting that row from the composer's own menu would insert, so the two entries
 * into a server command cannot drift apart.
 *
 * A hook of its own because it is a **window** subscription with its own lifetime,
 * while the box's text is state the composer owns.
 */
export function useComposerCommandSignal(input: {
	readonly textRef: RefObject<string>;
	readonly areaRef: RefObject<HTMLTextAreaElement | null>;
	readonly setText: (text: string) => void;
	readonly setCaret: (caret: number) => void;
}): void {
	const { textRef, areaRef, setText, setCaret } = input;
	useEffect(() => {
		const onRun = (event: Event) => {
			const name = (event as CustomEvent<{ name?: string }>).detail?.name;
			if (typeof name !== "string" || name === "") return;
			const current = textRef.current;
			const prefix = current.trimEnd() === "" ? "" : `${current.trimEnd()}\n`;
			const next = `${prefix}${COMPOSER_SLASH_PREFIX}${name} `;
			setText(next);
			setCaret(next.length);
			areaRef.current?.focus();
		};
		window.addEventListener(COMMAND_RUN_EVENT, onRun);
		return () => window.removeEventListener(COMMAND_RUN_EVENT, onRun);
	}, [areaRef, setCaret, setText, textRef]);
}
