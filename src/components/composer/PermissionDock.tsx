import type { PermissionRequest } from "@opencode/client";
import { useEffect, useRef } from "react";
import { COMPOSER_CONTROL_STYLE, COMPOSER_LINE_STYLE } from "@/components/composer/composerStyles";
import { DockFrame } from "@/components/composer/DockFrame";
import {
	DOCK_CODE_STYLE,
	DOCK_HEADING_STYLE,
	DOCK_TEXT_STYLE,
} from "@/components/composer/dockStyles";
import {
	COMPOSER_DOCK_KEYS,
	DOCK_DECISION,
	DOCK_LABEL,
	DOCK_PERMISSION_ACTION_LABEL,
	DOCK_PERMISSION_RESOURCES_LABEL,
	DOCK_REFUSE,
	type DockDecision,
} from "@/constants/composer";

/**
 * The permission dock (spec 020 §Docks, row M2.6).
 *
 * The three answers are the **wire's own words** — `once`, `always`, `reject`
 * (`PermissionReply`, `docs/opencode-api.md` §4) — and each is reachable from the
 * keyboard twice over: Tab/Enter through the buttons, and the ordinal accelerators
 * `1`/`2`/`3`. `Esc` is the third decision, `reject`, said out loud in the footer,
 * so the dock can never be dismissed into "the session is waiting and nothing is
 * visible": every way out of it is a reply the server understands.
 *
 * Focus lands on the first decision when the dock opens, so the keyboard path needs
 * no mouse to start.
 */

/** The ordinal that reaches each decision, in the order the wire lists them. */
const DECISION_KEYS = ["1", "2", "3"] as const;

export type PermissionDockProps = {
	readonly permission: PermissionRequest;
	/** How many further requests are queued behind this one. */
	readonly more: number;
	readonly error: string | null;
	readonly busy: boolean;
	readonly onDecide: (decision: DockDecision) => void;
};

export function PermissionDock(props: PermissionDockProps) {
	const { permission, busy, onDecide } = props;
	const stepRef = useRef<HTMLFieldSetElement | null>(null);

	// Focus the first decision: the whole dock is answerable without a mouse.
	useEffect(() => {
		stepRef.current?.querySelector("button")?.focus();
	}, []);

	const decide = (index: number) => {
		const decision = DOCK_DECISION[index];
		if (decision !== undefined && !busy) onDecide(decision);
	};

	return (
		<DockFrame
			label={DOCK_LABEL.permission}
			keys={COMPOSER_DOCK_KEYS.permission}
			error={props.error}
			focusRef={stepRef}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					if (!busy) onDecide(DOCK_REFUSE);
					return;
				}
				const index = DECISION_KEYS.indexOf(event.key as (typeof DECISION_KEYS)[number]);
				if (index !== -1) {
					event.preventDefault();
					decide(index);
				}
			}}
		>
			<h3 style={DOCK_HEADING_STYLE}>{DOCK_LABEL.permission}</h3>
			<p style={DOCK_TEXT_STYLE}>{`${DOCK_PERMISSION_ACTION_LABEL}: ${permission.action}`}</p>
			<p style={DOCK_TEXT_STYLE}>{DOCK_PERMISSION_RESOURCES_LABEL}</p>
			{permission.resources.map((resource) => (
				<code key={resource} style={DOCK_CODE_STYLE}>
					{resource}
				</code>
			))}
			{permission.message === undefined ? null : (
				<p style={DOCK_TEXT_STYLE}>{permission.message}</p>
			)}
			<div style={COMPOSER_LINE_STYLE}>
				{DOCK_DECISION.map((decision, index) => (
					<button
						key={decision}
						type="button"
						style={COMPOSER_CONTROL_STYLE}
						aria-keyshortcuts={DECISION_KEYS[index]}
						disabled={busy}
						onClick={() => onDecide(decision)}
					>
						{decision}
					</button>
				))}
				{props.more > 0 ? <span>{`+${props.more}`}</span> : null}
			</div>
		</DockFrame>
	);
}
