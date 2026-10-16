import type { DragEvent, MouseEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { type Tab as TabState, tabKey } from "@/app/tabModel";
import { ContextMenu } from "@/components/contextmenu/ContextMenu";
import { tabMenuItems } from "@/components/contextmenu/surfaceItems";
import { useSurfaceMenu } from "@/components/contextmenu/useContextMenu";
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
 * The dot reads the running set the event stream feeds (M2.1); the unread pip
 * reads the store and clears on visit. Reorder is the native HTML5 drag path —
 * no library — with the index riding `dataTransfer`.
 */

export const TAB_DRAG_MIME = "application/x-oc-tab-index";

export function tabTitle(tab: TabState, titles?: ReadonlyMap<string, string>): string {
	if (tab.kind === TAB_KIND.settings) return SETTINGS_TAB_LABEL;
	const title = titles?.get(tab.id)?.trim();
	return title === undefined || title === "" ? tab.id : title;
}

export type TabProps = {
	readonly tab: TabState;
	readonly index: number;
	readonly active: boolean;
	readonly running: boolean;
	readonly unread: boolean;
	/** Session titles the app already holds (id → title); absent ids read as the id. */
	readonly titles?: ReadonlyMap<string, string>;
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
	titles,
	onActivate,
	onClose,
	onMove,
}: TabProps) {
	const title = tabTitle(tab, titles);
	const menu = useSurfaceMenu(tabKey(tab));
	const items = tabMenuItems(tab);
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
	const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (menu.onMenuKey(event)) return;
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			onActivate(tab);
		}
	};
	return (
		<>
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
				onContextMenu={menu.onContextMenu}
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
			{menu.point !== null ? (
				<ContextMenu items={items} at={menu.point} onClose={menu.close} />
			) : null}
		</>
	);
}
