import type { ComponentType } from "react";
import { createCollection } from "@/plugins/collection";
import { type Disposable, REFUSED } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";
import { isComponent } from "@/plugins/validation";

/**
 * The sidebar-panel registry (spec 040 §The host, `panels.register`): a panel for
 * `session.sidebar.panels`. A refused contribution is inert — nothing renders,
 * one `PluginFault` is recorded, nothing throws.
 *
 * The panel's `title` is the chrome the sidebar draws around it; the sidebar
 * reads this list through `listPanels`/`subscribeToPanels`. The built-in panels
 * (M2.7) register through this same function.
 */

export type PanelContribution = {
	readonly id: string;
	readonly title: string;
	readonly component: ComponentType;
	/** Lower sorts first; without one a panel sorts after every ordered one. */
	readonly order?: number;
};

const panels = createCollection<PanelContribution>({ onChange: notify });
const listeners = new Set<() => void>();

function notify(): void {
	for (const listener of listeners) listener();
}

function refuse(reason: FaultReason, subject: string, message: string): Disposable {
	recordFault({ area: FAULT_AREAS.panels, reason, subject, message });
	return REFUSED;
}

function problemWith(contribution: PanelContribution): string | null {
	if (typeof contribution?.id !== "string" || contribution.id.trim() === "") return "an empty id";
	if (typeof contribution.title !== "string" || contribution.title.trim() === "")
		return "an empty title";
	if (!isComponent(contribution.component)) return "a missing or malformed component";
	if (contribution.order !== undefined && !Number.isFinite(contribution.order)) {
		return `a non-finite order (${String(contribution.order)})`;
	}
	return null;
}

/** Register one panel. Synchronous; the handle removes exactly this entry. */
export function registerPanel(contribution: PanelContribution): Disposable {
	const problem = problemWith(contribution);
	if (problem !== null) {
		const subject = typeof contribution?.id === "string" ? contribution.id : "?";
		return refuse(
			FAULT_REASONS.malformedEntry,
			subject,
			`the panel "${subject}" has ${problem}`,
		);
	}
	if (panels.has(contribution.id)) {
		return refuse(
			FAULT_REASONS.duplicateId,
			contribution.id,
			`the panel id "${contribution.id}" is already registered`,
		);
	}
	return panels.set(contribution);
}

export function listPanels(): readonly PanelContribution[] {
	return panels.list();
}

export function subscribeToPanels(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The tests' reset; production never calls it. */
export function resetPanels(): void {
	panels.replaceAll([]);
}
