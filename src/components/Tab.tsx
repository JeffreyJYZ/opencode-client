import type { DragEvent, MouseEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { type Tab as TabState, tabKey } from "@/app/tabModel";
import {
	TAB_ACTIVE_STYLE,
	TAB_CLOSE_STYLE,
	TAB_DOT_STYLE,
	TAB_STYLE,
	TAB_TITLE_STYLE,
} from "@/components/tabStyles";
import {
	SETTINGS_TAB_LABEL,
	TAB_CLOSE_LABEL,
	TAB_IDLE_TITLE,
	TAB_KIND,
	TAB_RUNNING_TITLE,
	TAB_UNREAD_LABEL,
	UNREAD_MARK,
} from "@/constants/tabs";

/**
 * One tab: a status dot, a title, a close affordance (spec 010 §Top nav).
 *
 * The dot reads the polled `session.active()` map until M2.1's stream lands;
 * the unread pip reads the store and clears on visit. Reorder is the native
 * HTML5 drag path — no library — with the index riding `dataTransfer`.
 */

export const TAB_DRAG_MIME = "application/x-oc-tab-index";

export function tabTitle(tab: TabState): string {
	return tab.kind === TAB_KIND.settings ? SETTINGS_TAB_LABEL : tab.id;
}

export type TabProps = {
	readonly tab: TabState;
	readonly index: number;
	readonly active: boolean;
	readonly running: boolean;
	readonly unread: boolean;
	readonly onActivate: (tab: TabState) => void;
	readonly onClose: (tab: TabState) => void;
	readonly onMove: (from: number, to: number) => void;
};

export function Tab({
	tab,
	index,
	active,
	running,
	unread,
	onActivate,
	onClose,
	onMove,
}: TabProps) {
	const title = tabTitle(tab);
	const onAuxClick = (event: MouseEvent) => {
		if (event.button === 1) {
			event.preventDefault();
			onClose(tab);
		}
	};
	const onDrop = (event: DragEvent) => {
		event.preventDefault();
		const from = Number.parseInt(event.dataTransfer.getData(TAB_DRAG_MIME), 10);
		if (Number.isInteger(from)) onMove(from, index);
	};
	const onKeyDown = (event: ReactKeyboardEvent) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onActivate(tab);
		}
	};
	return (
		<div
			role="tab"
			aria-selected={active}
			data-tab={tabKey(tab)}
			draggable
			tabIndex={0}
			onDragStart={(event) => {
				event.dataTransfer.setData(TAB_DRAG_MIME, String(index));
				event.dataTransfer.effectAllowed = "move";
			}}
			onDragOver={(event) => {
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
			}}
			onDrop={onDrop}
			onClick={() => onActivate(tab)}
			onKeyDown={onKeyDown}
			onAuxClick={onAuxClick}
			style={active ? TAB_ACTIVE_STYLE : TAB_STYLE}
			title={title}
		>
			<span
				title={running ? TAB_RUNNING_TITLE : TAB_IDLE_TITLE}
				style={{
					...TAB_DOT_STYLE,
					background: running ? "var(--oc-accent)" : "var(--oc-border)",
				}}
			/>
			<span style={TAB_TITLE_STYLE}>{title}</span>
			{unread && !active ? (
				<span role="img" aria-label={TAB_UNREAD_LABEL}>
					{UNREAD_MARK}
				</span>
			) : null}
			<button
				type="button"
				aria-label={`Close ${title}`}
				style={TAB_CLOSE_STYLE}
				onClick={(event) => {
					event.stopPropagation();
					onClose(tab);
				}}
			>
				{TAB_CLOSE_LABEL}
			</button>
		</div>
	);
}
