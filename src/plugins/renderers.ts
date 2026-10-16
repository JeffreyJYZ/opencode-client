import type { ComponentType } from "react";
import { createCollection } from "@/plugins/collection";
import { type Disposable, REFUSED } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";
import { isComponent } from "@/plugins/validation";

/**
 * The transcript-renderer registry (spec 040 §The host, `renderers.register`):
 * **override** a transcript renderer for one kind. The registry is keyed by
 * `kind`, so a later registration for the same kind is the one in force — that is
 * what "override" means — and the earlier handle removes nothing once it has been
 * replaced. An unknown kind or a malformed entry is inert plus a `PluginFault`.
 *
 * The kinds are the spec's own tuple: `message`, `markdown`, `reasoning`, `tool`,
 * `marker`. The registry holds **only overrides**: `rendererFor` returns `null` when
 * a kind has none, and the transcript — not the row components — is what reads it
 * (`TranscriptEntry`, mapping its row kinds onto these five through
 * `components/transcript/rowRenderers.ts`). With nothing registered the transcript
 * keeps its built-in row, so M2.2's defaults are byte-for-byte what renders.
 */

export const RENDERER_KIND = {
	/** A user prompt. */
	message: "message",
	/** Assistant prose, rendered as markdown. */
	markdown: "markdown",
	reasoning: "reasoning",
	/** A tool or shell call. */
	tool: "tool",
	/** A small labelled row: an error, a notice, the per-prompt footer. */
	marker: "marker",
} as const;

export type RendererKind = (typeof RENDERER_KIND)[keyof typeof RENDERER_KIND];

/** The tuple form, for the runtime check below. */
export const RENDERER_KINDS: readonly RendererKind[] = Object.values(RENDERER_KIND);

const KNOWN_KINDS: ReadonlySet<string> = new Set<string>(RENDERER_KINDS);

/** The runtime half of the tuple: how a contribution's `kind` is checked. */
export function isRendererKind(value: string): value is RendererKind {
	return KNOWN_KINDS.has(value);
}

export type RendererContribution = {
	readonly id: string;
	readonly kind: string;
	readonly component: ComponentType;
};

const renderers = createCollection<RendererContribution>({
	keyOf: (contribution) => contribution.kind,
	ordered: false,
	onChange: notify,
});
const listeners = new Set<() => void>();

function notify(): void {
	for (const listener of listeners) listener();
}

function refuse(reason: FaultReason, subject: string, message: string): Disposable {
	recordFault({ area: FAULT_AREAS.renderers, reason, subject, message });
	return REFUSED;
}

/** Register one renderer override. Synchronous; the handle removes it while it is the one in force. */
export function registerRenderer(contribution: RendererContribution): Disposable {
	const subject = typeof contribution?.id === "string" ? contribution.id : "?";
	if (typeof contribution?.id !== "string" || contribution.id.trim() === "") {
		return refuse(
			FAULT_REASONS.malformedEntry,
			subject,
			`the renderer "${subject}" has an empty id`,
		);
	}
	if (typeof contribution.kind !== "string" || !isRendererKind(contribution.kind)) {
		return refuse(
			FAULT_REASONS.unknownKind,
			subject,
			`the renderer "${subject}" names the unknown kind "${String(contribution.kind)}"`,
		);
	}
	if (!isComponent(contribution.component)) {
		return refuse(
			FAULT_REASONS.malformedEntry,
			subject,
			`the renderer "${subject}" has a missing or malformed component`,
		);
	}
	return renderers.set(contribution);
}

/** The renderer in force for a kind, or `null` so the caller keeps its default. */
export function rendererFor(kind: string): RendererContribution | null {
	return renderers.get(kind) ?? null;
}

export function listRenderers(): readonly RendererContribution[] {
	return renderers.list();
}

export function subscribeToRenderers(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The tests' reset; production never calls it. */
export function resetRenderers(): void {
	renderers.replaceAll([]);
}
