import type { SlotContribution } from "@/plugins/registry";
import { isComponent } from "@/plugins/validation";

/**
 * The slot registry's **validation** half (plan M4.3: "validation out from
 * storage"). What a contribution must be is decided here, so `registry.ts` is the
 * registration and lock policy and nothing else — the same split the settings
 * registry already makes with `sectionValidation.ts`.
 */

/** What is wrong with a slot contribution, or `null` when nothing is. */
export function slotProblem(contribution: SlotContribution): string | null {
	if (typeof contribution.id !== "string" || contribution.id.trim() === "") return "an empty id";
	if (!isComponent(contribution.component)) return "a missing or malformed component";
	const order = contribution.order;
	if (order !== undefined && !Number.isFinite(order)) {
		return `a non-finite order (${String(order)})`;
	}
	return null;
}
