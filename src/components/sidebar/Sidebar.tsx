import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { setSidebarWidth } from "@/app/settings/sidebarActions";
import { useSettings } from "@/app/settings/useSettings";
import { useActiveSessionId } from "@/app/useActiveSession";
import { SidebarPanel } from "@/components/sidebar/SidebarPanel";
import { SidebarDataContext } from "@/components/sidebar/sidebarData";
import {
	RESIZER_STYLE,
	SIDEBAR_SCROLL_STYLE,
	SIDEBAR_STYLE,
} from "@/components/sidebar/sidebarStyles";
import { SIDEBAR_LABEL, SIDEBAR_RESIZE_LABEL } from "@/constants/sidebar";
import { listPanels, subscribeToPanels } from "@/plugins/panels";
import { usePanelData } from "@/session/usePanelData";

/**
 * The sidebar (spec 020 §Sidebar): the frame, the ⌘B-visibility it reads from
 * the settings blob, and the drag that writes the width back through the store.
 * It owns **layout only** — each panel is handed its data and fetches nothing.
 *
 * It hosts the panel registry (M4.11): it draws the frame from each registered
 * `title` and renders each registered `component` — the built-ins register
 * through the same `registerPanel` a plugin's does, so the region renders exactly
 * the contributions and there is no second route. The data is read **once**
 * (`usePanelData`) and provided through `SidebarDataContext`, so a body that
 * needs figures reaches them without fetching.
 *
 * The drag listens on `window` while it is live, so the pointer may leave the
 * thin handle without losing the resize; the width is written on every move, and
 * `setSidebarWidth` clamps it, so no gesture can exceed the bound.
 *
 * A child session gets no sidebar (it has no session of its own to describe).
 */

export function Sidebar() {
	const sessionID = useActiveSessionId();
	const sidebar = useSettings().settings.sidebar;
	const { data } = usePanelData(sessionID);
	const panels = useSyncExternalStore(subscribeToPanels, listPanels);
	const [dragging, setDragging] = useState(false);
	const origin = useRef<{ readonly x: number; readonly width: number } | null>(null);

	useEffect(() => {
		if (!dragging) return;
		const onMove = (event: PointerEvent) => {
			const start = origin.current;
			if (start === null) return;
			// The sidebar is on the right: moving the pointer left grows it.
			setSidebarWidth(start.width + (start.x - event.clientX));
		};
		const onUp = () => setDragging(false);
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		return () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
	}, [dragging]);

	const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
		origin.current = { x: event.clientX, width: sidebar.width };
		setDragging(true);
	};

	if (sessionID === null) return null;
	if (data.session.info !== null && data.session.info.parentID !== undefined) return null;
	if (!sidebar.visible) return null;

	return (
		<aside aria-label={SIDEBAR_LABEL} style={{ ...SIDEBAR_STYLE, width: sidebar.width }}>
			<hr
				aria-orientation="vertical"
				aria-label={SIDEBAR_RESIZE_LABEL}
				onPointerDown={beginResize}
				style={RESIZER_STYLE}
			/>
			<div style={SIDEBAR_SCROLL_STYLE}>
				<SidebarDataContext.Provider value={data}>
					{panels.map((entry) => (
						<SidebarPanel key={entry.id} title={entry.title}>
							<entry.component />
						</SidebarPanel>
					))}
				</SidebarDataContext.Provider>
			</div>
		</aside>
	);
}
