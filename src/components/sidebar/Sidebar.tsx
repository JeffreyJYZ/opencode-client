import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { sidebarShown } from "@/app/settings/sidebar";
import { setSidebarWidth } from "@/app/settings/sidebarActions";
import { useNarrowViewport } from "@/app/settings/sidebarVisibility";
import { useSettings } from "@/app/settings/useSettings";
import { useActiveSessionId } from "@/app/useActiveSession";
import { Slot } from "@/components/Slot";
import { SidebarPanel } from "@/components/sidebar/SidebarPanel";
import { SidebarDataContext } from "@/components/sidebar/sidebarData";
import {
	RESIZER_STYLE,
	SIDEBAR_SCROLL_STYLE,
	SIDEBAR_STYLE,
} from "@/components/sidebar/sidebarStyles";
import { SIDEBAR_LABEL, SIDEBAR_RESIZE_LABEL } from "@/constants/sidebar";
import { SLOT } from "@/constants/slots";
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
 * **Two registries meet in this column, and a panel author must pick the right
 * one (M4.12).** `panels.register({ id, title, component, order? })` is the
 * *panel* registry: it draws the frame (`SidebarPanel`) from the registered
 * `title`, so a contribution carries chrome, and the built-in five (M2.7) come
 * from it. The *slot* `session.sidebar.panels` is the plugin `ui.register` route:
 * a bare component with no chrome, rendered below the panels. Both are advertised
 * (spec 040 §Slots), so both render — reach for `panels.register` for a titled
 * region and for the slot to add a node to the column. They stay two because the
 * panel's `title`/`order` have nowhere to go in a bare slot contribution; the
 * slot below used to be advertised with no host at all, which is the defect M4.12
 * closes.
 *
 * The drag listens on `window` while it is live, so the pointer may leave the
 * thin handle without losing the resize; the width is written on every move, and
 * `setSidebarWidth` clamps it, so no gesture can exceed the bound.
 *
 * A child session gets no sidebar (it has no session of its own to describe), and
 * a **narrow window** hides it unless the user explicitly toggled it open there
 * (M2.25, spec 020 §Sidebar's visibility rule): the effective value is
 * `sidebarShown`, so the wide flag alone never un-hides a fresh narrow window.
 */

export function Sidebar() {
	const sessionID = useActiveSessionId();
	const sidebar = useSettings().settings.sidebar;
	const narrow = useNarrowViewport();
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
	if (!sidebarShown(sidebar, narrow)) return null;

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
					<Slot id={SLOT.sessionSidebarPanels} />
				</SidebarDataContext.Provider>
			</div>
		</aside>
	);
}
