import { createContext, useContext } from "react";
import { EMPTY_PANEL_DATA, type PanelData } from "@/session/panelData";

/**
 * The sidebar's data context (M4.11). The host (`Sidebar`) reads `usePanelData`
 * **once** and provides the result here, so a registered panel body reaches its
 * figures without fetching: the panel components stay pure functions of the data
 * they are handed, and mounting one can never start a request of its own.
 *
 * A plugin-registered panel reads nothing from here (it is a `ComponentType`
 * with no props); the built-in bodies are the only readers, through
 * `useSidebarData`. The default is the empty shape, so a body rendered outside a
 * host shows the empty state rather than throwing.
 */

export const SidebarDataContext = createContext<PanelData>(EMPTY_PANEL_DATA);

export function useSidebarData(): PanelData {
	return useContext(SidebarDataContext);
}
