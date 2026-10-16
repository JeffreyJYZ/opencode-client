import type { CSSProperties } from "react";
import {
	JUMP_LATEST_ATTR,
	JUMP_LATEST_COUNT_PREFIX,
	JUMP_LATEST_COUNT_SUFFIX,
	JUMP_LATEST_LABEL,
} from "@/constants/scroll";
import { META_STYLE } from "./rowStyles";

/**
 * The pill that appears over the transcript once the reader has scrolled away from
 * the tail (spec 010 §Desktop behaviours: "a jump-to-latest pill while scrolled
 * up", M2.9). Its **existence is the state**: the transcript renders it only while
 * `following` is false, so nothing here decides whether the reader is following.
 *
 * It also **states how many rows are below the fold** (M2.22, spec 020 §Scroll): the
 * count arrives as a prop, because it is a read of the DOM and the scroll watcher is
 * where that lives, not the pill.
 *
 * Absolutely positioned in the session view's frame, not inside the scroll
 * container, so it does not travel with the content it is offering to leave.
 */

const PILL_STYLE: CSSProperties = {
	...META_STYLE,
	position: "absolute",
	bottom: "var(--oc-space-3)",
	left: "50%",
	transform: "translateX(-50%)",
	background: "var(--oc-surface-raised-high)",
	border: "var(--oc-hairline) solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	cursor: "pointer",
	padding: "var(--oc-space-1) var(--oc-space-3)",
};

export function JumpToLatest({
	count,
	onClick,
}: {
	readonly count: number;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			style={PILL_STYLE}
			{...{ [JUMP_LATEST_ATTR]: String(true) }}
			onClick={onClick}
		>
			{JUMP_LATEST_LABEL}
			{JUMP_LATEST_COUNT_PREFIX}
			{count}
			{JUMP_LATEST_COUNT_SUFFIX}
		</button>
	);
}
