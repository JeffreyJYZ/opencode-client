import { ROW_KIND, type RowKind } from "@/constants/transcript";
import { RENDERER_KIND, type RendererKind } from "@/plugins/renderers";
import type { TranscriptRow } from "@/session/transcript";

/**
 * Where the transcript's row kinds meet the renderer registry's five kinds (M4.13,
 * spec 040 §The host, `renderers.register`).
 *
 * The two vocabularies are **not the same tuple**: `renderers.register` names
 * `message`, `markdown`, `reasoning`, `tool` and `marker`, while the store has eight
 * row kinds. This table is the one place they meet, so a plugin's `kind` and the row
 * it replaces can never drift apart in a second copy.
 *
 * `tool` covers a shell row too: a shell's command-and-output block is the same
 * override surface a tool call is, and the spec names no `shell` kind. The three
 * small rows — error, notice, footer — are the `marker` bucket: each is a labelled
 * marker line rather than prose.
 */
export const RENDERER_KIND_BY_ROW_KIND: Readonly<Record<RowKind, RendererKind>> = {
	[ROW_KIND.user]: RENDERER_KIND.message,
	[ROW_KIND.prose]: RENDERER_KIND.markdown,
	[ROW_KIND.reasoning]: RENDERER_KIND.reasoning,
	[ROW_KIND.tool]: RENDERER_KIND.tool,
	[ROW_KIND.shell]: RENDERER_KIND.tool,
	[ROW_KIND.error]: RENDERER_KIND.marker,
	[ROW_KIND.notice]: RENDERER_KIND.marker,
	[ROW_KIND.footer]: RENDERER_KIND.marker,
};

/** The renderer kind a row of this kind dispatches through. */
export function rendererKindFor(kind: RowKind): RendererKind {
	return RENDERER_KIND_BY_ROW_KIND[kind];
}

/**
 * What a registered renderer is handed: the same single prop every built-in row
 * takes. The registry stores a plugin-facing `ComponentType` with untyped props, so
 * the transcript is what fixes the contract (`TranscriptEntry`).
 */
export type RendererRowProps = { readonly row: TranscriptRow };
