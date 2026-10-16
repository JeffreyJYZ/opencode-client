import { Component, type ReactNode } from "react";
import { FAULT_AREAS, FAULT_REASONS, recordFault } from "@/plugins/faults";

/**
 * One settings section's boundary (M3.5: a section that throws leaves the surface
 * rendering the others and records a fault). A section whose component throws
 * while rendering is **inert** — it renders nothing, exactly as a refused slot
 * contribution does — and the
 * throw is recorded as a `PluginFault` (area `settings`), so the reason is
 * findable rather than console-only. The sections around it keep rendering and
 * the tab stays usable.
 *
 * A class, because React's error-boundary API is one:
 * `getDerivedStateFromError` swaps this section for nothing and
 * `componentDidCatch` is the only place the error object reaches the fault log.
 * The surface keys the boundary by the section id, so re-registering an id
 * remounts a fresh boundary rather than leaving a failed one in place.
 */

export type SettingsSectionBoundaryProps = {
	/** The section's registry id — the fault's subject. */
	readonly id: string;
	readonly children: ReactNode;
};

type State = { readonly failed: boolean };

const HEALTHY: State = { failed: false };

export class SettingsSectionBoundary extends Component<SettingsSectionBoundaryProps, State> {
	override state: State = HEALTHY;

	static getDerivedStateFromError(): State {
		return { failed: true };
	}

	override componentDidCatch(error: Error): void {
		recordFault({
			area: FAULT_AREAS.settings,
			reason: FAULT_REASONS.sectionThrew,
			subject: this.props.id,
			message: `the settings section "${this.props.id}" threw while rendering: ${error.message}`,
		});
	}

	override render(): ReactNode {
		return this.state.failed ? null : this.props.children;
	}
}
