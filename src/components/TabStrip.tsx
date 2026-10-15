import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useSessionActivity } from "@/app/sessionActivity";
import { tabKey } from "@/app/tabModel";
import { activateTabAndGo, closeTabAndGo } from "@/app/tabSync";
import { moveTab } from "@/app/tabs";
import { useTabs } from "@/app/useTabs";
import { Tab, tabTitle } from "@/components/Tab";
import { useMenuDismiss } from "@/components/useMenuDismiss";
import { OVERFLOW_LABEL, OVERFLOW_TITLE } from "@/constants/tabs";

/**
 * The strip: every open view in order, scrolling inside the nav row rather
 * than pushing the right-hand controls off-screen (spec 010 §Top nav).
 *
 * Overflow is twofold: the strip scrolls horizontally with the active tab kept
 * in view, and the `⋯` button lists every tab for a narrow window. Closing the
 * active tab lands on the neighbour the store activated.
 */

const STRIP_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "stretch",
	gap: "var(--oc-space-1)",
	overflowX: "auto",
	minWidth: 0,
	flex: "1 1 auto",
};

const MENU_STYLE: CSSProperties = {
	position: "absolute",
	top: "100%",
	right: 0,
	zIndex: 1,
	display: "flex",
	flexDirection: "column",
	minWidth: "180px",
	background: "var(--oc-surface-raised)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius-panel)",
	padding: "var(--oc-space-1)",
};

const MENU_ITEM_STYLE: CSSProperties = {
	background: "transparent",
	color: "var(--oc-text)",
	fontFamily: "var(--oc-font-ui)",
	fontSize: "var(--oc-font-ui-size)",
	border: "none",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
	cursor: "pointer",
	textAlign: "left",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

const OVERFLOW_WRAP_STYLE: CSSProperties = {
	position: "relative",
	display: "flex",
	alignItems: "center",
	flexShrink: 0,
};

const OVERFLOW_BUTTON_STYLE: CSSProperties = {
	background: "transparent",
	color: "var(--oc-text-muted)",
	fontFamily: "var(--oc-font-ui)",
	fontSize: "var(--oc-font-ui-size)",
	border: "none",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
	cursor: "pointer",
};

export function TabStrip() {
	const { tabs, activeIndex, unread } = useTabs();
	const running = useSessionActivity();
	const [menuOpen, setMenuOpen] = useState(false);
	const stripRef = useRef<HTMLDivElement>(null);
	const overflowRef = useRef<HTMLDivElement>(null);
	const activeKey = activeIndex >= 0 ? tabKey(tabs[activeIndex]) : null;
	useEffect(() => {
		if (activeKey === null) return;
		stripRef.current
			?.querySelector(`[data-tab="${activeKey}"]`)
			?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [activeKey]);
	useMenuDismiss(menuOpen, setMenuOpen, overflowRef);
	if (tabs.length === 0) return null;
	return (
		<div style={{ display: "flex", minWidth: 0, flex: "1 1 auto" }}>
			<div ref={stripRef} role="tablist" aria-label="Open views" style={STRIP_STYLE}>
				{tabs.map((tab, index) => (
					<Tab
						key={tabKey(tab)}
						tab={tab}
						index={index}
						active={index === activeIndex}
						running={tab.kind === "session" && running.has(tab.id)}
						unread={unread.has(tabKey(tab))}
						onActivate={activateTabAndGo}
						onClose={closeTabAndGo}
						onMove={moveTab}
					/>
				))}
			</div>
			<div ref={overflowRef} style={OVERFLOW_WRAP_STYLE}>
				<button
					type="button"
					title={OVERFLOW_TITLE}
					aria-label={OVERFLOW_TITLE}
					aria-expanded={menuOpen}
					style={OVERFLOW_BUTTON_STYLE}
					onClick={() => setMenuOpen((open) => !open)}
				>
					{OVERFLOW_LABEL}
				</button>
				{menuOpen ? (
					<div role="menu" style={MENU_STYLE}>
						{tabs.map((tab) => (
							<button
								key={tabKey(tab)}
								type="button"
								role="menuitem"
								style={MENU_ITEM_STYLE}
								onClick={() => {
									setMenuOpen(false);
									activateTabAndGo(tab);
								}}
							>
								{tabTitle(tab)}
							</button>
						))}
					</div>
				) : null}
			</div>
		</div>
	);
}
