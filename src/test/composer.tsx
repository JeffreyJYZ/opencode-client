import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { COMPOSER_MENU_OPTION_PREFIX, COMPOSER_PROMPT_LABEL } from "@/constants/composer";
import { ClientProvider } from "@/session/ClientProvider";
import type { ComposerProbe } from "@/test/composerProbe";

/**
 * The prompt field, by **label**: the identity line's two `<select>` elements are
 * comboboxes too (an implicit role), so only the label names the field. Focus first,
 * because a caret exists only in a focused field and the whole suite shares one
 * document.
 */
export function promptField(): HTMLTextAreaElement {
	return screen.getByLabelText(COMPOSER_PROMPT_LABEL) as HTMLTextAreaElement;
}

/** Type into the field and put the caret after the text — what typing really does. */
export function typePrompt(value: string): HTMLTextAreaElement {
	const field = promptField();
	act(() => {
		field.focus();
		fireEvent.change(field, { target: { value } });
		field.setSelectionRange(value.length, value.length);
		fireEvent.select(field);
	});
	return field;
}

/**
 * The menu's own rows, by the id prefix the menu derives: a role query would also
 * match the identity line's `<select>` children, and whatever another test file left
 * in the shared document.
 */
export function menuRows(): HTMLElement[] {
	return [...document.querySelectorAll<HTMLElement>(`[id^="${COMPOSER_MENU_OPTION_PREFIX}"]`)];
}

/** Render a composer node against the probe's client, without a target or a probe call. */
export function renderComposer(node: ReactNode, probe: ComposerProbe): void {
	render(
		<ClientProvider client={probe.client} probe={() => Promise.resolve()}>
			{node}
		</ClientProvider>,
	);
}
