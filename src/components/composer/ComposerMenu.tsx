import type { CSSProperties } from "react";
import {
	COMPOSER_MENU_STYLE,
	COMPOSER_ROW_ACTIVE_STYLE,
	COMPOSER_ROW_STYLE,
} from "@/components/composer/composerStyles";
import {
	COMPOSER_MENU_EMPTY,
	COMPOSER_MENU_LABEL,
	COMPOSER_MENU_LIST_ID,
	COMPOSER_MENU_LOADING,
	COMPOSER_MENU_OPTION_PREFIX,
} from "@/constants/composer";
import type { ComposerEntry } from "@/session/composerEntries";

/**
 * The composer menu (M2.5; spec 020 §Prompt box): one listbox for both triggers,
 * because a slash command and a mention row differ only in what they insert.
 *
 * Two honest states, and they are **not** the same word: `command.list()` loads
 * asynchronously (`docs/opencode-api.md` §4), so an empty list before the first read
 * says `Loading commands…`, and only a settled read may say nothing matches. Each
 * row prints its source (`Client` / `Server` / `File` / `Agent` / `Skill`), which is
 * how a client command and a server command of the same name stay distinguishable.
 *
 * The textarea keeps focus: the rows are options of a listbox the field names with
 * `aria-activedescendant`, the pattern the palette already uses.
 */

export function menuOptionId(id: string): string {
	return `${COMPOSER_MENU_OPTION_PREFIX}${id}`;
}

export type ComposerMenuProps = {
	readonly entries: readonly ComposerEntry[];
	readonly active: number;
	readonly loading: boolean;
	readonly onPick: (entry: ComposerEntry) => void;
	readonly onHover: (index: number) => void;
};

export function ComposerMenu({ entries, active, loading, onPick, onHover }: ComposerMenuProps) {
	if (entries.length === 0 && !loading) {
		return (
			<div style={COMPOSER_MENU_STYLE} role="presentation">
				<span style={COMPOSER_ROW_STYLE}>{COMPOSER_MENU_EMPTY}</span>
			</div>
		);
	}
	return (
		<div
			style={COMPOSER_MENU_STYLE}
			id={COMPOSER_MENU_LIST_ID}
			role="listbox"
			aria-label={COMPOSER_MENU_LABEL}
		>
			{entries.length === 0 ? (
				<span style={COMPOSER_ROW_STYLE}>{COMPOSER_MENU_LOADING}</span>
			) : (
				entries.map((entry, index) => (
					// The palette's own row pattern: an option outside the Tab order, whose
					// keys the field owns through `aria-activedescendant`.
					<button
						key={entry.id}
						type="button"
						tabIndex={-1}
						id={menuOptionId(entry.id)}
						role="option"
						aria-selected={index === active}
						data-source={entry.source}
						style={index === active ? COMPOSER_ROW_ACTIVE_STYLE : COMPOSER_ROW_STYLE}
						onMouseEnter={() => onHover(index)}
						onMouseDown={(event) => {
							// Keep the field's focus so the keyboard stays the way in.
							event.preventDefault();
							onPick(entry);
						}}
					>
						<span>{entry.label}</span>
						<span style={SOURCE_STYLE}>{entry.source}</span>
						<span style={DETAIL_STYLE} title={entry.detail}>
							{entry.detail}
						</span>
					</button>
				))
			)}
		</div>
	);
}

const SOURCE_STYLE: CSSProperties = { color: "var(--oc-text-muted)" };
const DETAIL_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};
