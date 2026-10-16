import { isComponent } from "@/plugins/validation";

/**
 * What is wrong with a settings section a caller offered, or `null` when nothing
 * is (M3.5, the same rule `plugins/registry.ts` gives a slot contribution).
 *
 * The parameter is `unknown` on purpose: the caller is a plugin boundary, so a
 * malformed shape arrives as data, not as a type error the compiler already
 * caught. An id with no name, a label a surface cannot render, or a component
 * that is not one is refused — the section is never listed, so the surface
 * renders the others rather than a broken pane.
 */
export function sectionProblem(section: unknown): string | null {
	if (typeof section !== "object" || section === null) return "no section object";
	const { id, label, component, order } = section as {
		readonly id?: unknown;
		readonly label?: unknown;
		readonly component?: unknown;
		readonly order?: unknown;
	};
	if (typeof id !== "string" || id.trim() === "") return "an empty id";
	if (typeof label !== "string" || label.trim() === "") return "an empty label";
	if (!isComponent(component)) return "a missing or malformed component";
	if (order !== undefined && !Number.isFinite(order)) {
		return `a non-finite order (${String(order)})`;
	}
	return null;
}
