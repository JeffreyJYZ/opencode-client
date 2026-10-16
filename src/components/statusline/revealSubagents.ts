import { setNarrowSidebarVisible, setSidebarVisible } from "@/app/settings/sidebarActions";
import { isNarrowViewport } from "@/app/settings/sidebarVisibility";
import { PANEL_ID_ATTRIBUTE } from "@/constants/panelDom";
import { SIDEBAR_PANEL } from "@/constants/sidebar";

/**
 * The statusline's subagent segment (spec 020 §Statusline: the click "opens the
 * subagent list"). Reveal first, then scroll and focus — in that order, on a
 * later frame: the reveal mounts the panel, so scrolling and focusing on the same
 * tick would reach nothing.
 */

/** How many frames to wait for the revealed panel to mount before giving up. */
const REVEAL_ATTEMPTS = 3;

/** The sidebar's Subagents panel, or null while it is not mounted. */
export function subagentsPanelElement(): HTMLElement | null {
	const panel = document.querySelector(`[${PANEL_ID_ATTRIBUTE}="${SIDEBAR_PANEL.subagents}"]`);
	return panel instanceof HTMLElement ? panel : null;
}

function nextFrame(work: () => void): void {
	if (typeof requestAnimationFrame === "function") requestAnimationFrame(work);
	else setTimeout(work, 0);
}

/** Scroll the mounted panel into view and move focus to it. */
function focusPanel(panel: HTMLElement): void {
	if (typeof panel.scrollIntoView === "function") panel.scrollIntoView({ block: "nearest" });
	panel.focus();
}

function focusAfterReveal(remaining: number): void {
	const panel = subagentsPanelElement();
	if (panel !== null) {
		focusPanel(panel);
		return;
	}
	if (remaining > 0) nextFrame(() => focusAfterReveal(remaining - 1));
}

/**
 * Open the app's single subagent list: reveal the sidebar through the settings
 * seam (never the flag directly), then — after the reveal has rendered — scroll
 * the Subagents panel into view and focus it.
 */
export function revealSubagentsPanel(): void {
	if (isNarrowViewport()) setNarrowSidebarVisible(true);
	else setSidebarVisible(true);
	focusAfterReveal(REVEAL_ATTEMPTS);
}
