import type { ReactNode } from "react";
import { SECTION_STYLE } from "@/constants/settingsUi";

/**
 * The app's settings section frame (M4.21, spec 040 §The host `ui.kit`): the
 * `<section>` every settings section hand-rolls (`settingsUi.SECTION_STYLE`
 * plus its registry name), so a plugin's section matches a built-in's without
 * copying either.
 *
 * The surface draws the registry's `label` as the `<h2>` (M4.11), so the frame
 * carries no title of its own — `name` is the registry id, rendered as
 * `data-section` exactly as the hand-rolled sections do.
 */

export function Section({
	name,
	children,
}: {
	readonly name: string;
	readonly children: ReactNode;
}) {
	return (
		<section style={SECTION_STYLE} data-section={name}>
			{children}
		</section>
	);
}
