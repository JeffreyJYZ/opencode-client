import { type ComponentType, memo, useSyncExternalStore } from "react";
import { ROW_KIND } from "@/constants/transcript";
import { rendererFor, subscribeToRenderers } from "@/plugins/renderers";
import { ErrorRow } from "./ErrorRow";
import { FooterRow } from "./FooterRow";
import { NoticeRow } from "./NoticeRow";
import { ProseRow } from "./ProseRow";
import { ReasoningRow } from "./ReasoningRow";
import { isSubagent } from "./rowModel";
import { type RendererRowProps, rendererKindFor } from "./rowRenderers";
import { ShellRow } from "./ShellRow";
import { SubagentRow } from "./SubagentRow";
import { ToolRow } from "./ToolRow";
import { UserBand } from "./UserBand";

/**
 * One row of the transcript, dispatched on its kind (M2.2, M4.13).
 *
 * **The registry first, the switch as the default.** The row's kind maps to one of
 * the five renderer kinds (`rowRenderers.ts`); a plugin that registered a renderer
 * for that kind replaces the whole built-in row. With nothing registered
 * `rendererFor` returns `null` and the exhaustive switch below renders exactly the
 * row M2.2 always rendered, so the seam costs no regression.
 *
 * The switch is **exhaustive over the store's `TranscriptRow` union**, so a new row
 * family is a type error here rather than a silently missing surface. `memo` is
 * what keeps an append cheap: the store keeps untouched rows **by reference**, so
 * every earlier row's props are identical and it never re-renders — the growing row
 * is the only one that does, and it keeps its DOM node because its key (`row.id`)
 * did not change.
 *
 * A subagent is not a row kind of its own: the store marks it as the tool call whose
 * name is `subagent` (`transcriptTools.ts`), so the family is decided here, from the
 * row, and nowhere else.
 *
 * `useSyncExternalStore` is what makes a renderer registered **after** a row mounted
 * take effect: the registry notifies, the row re-renders, and the override replaces
 * the built-in in place. `rendererFor` returns the registered entry itself, a stable
 * identity until it is replaced, which is what the store's snapshot must be.
 */
function Entry({ row }: RendererRowProps) {
	const kind = rendererKindFor(row.kind);
	const override = useSyncExternalStore(
		subscribeToRenderers,
		() => rendererFor(kind),
		() => rendererFor(kind),
	);
	if (override !== null) {
		// The registry holds the plugin-facing `ComponentType` (untyped props); the
		// transcript is what fixes the contract, handing every renderer the same one
		// prop a built-in row takes.
		const Renderer = override.component as ComponentType<RendererRowProps>;
		return <Renderer row={row} />;
	}
	switch (row.kind) {
		case ROW_KIND.user:
			return <UserBand row={row} />;
		case ROW_KIND.prose:
			return <ProseRow row={row} />;
		case ROW_KIND.reasoning:
			return <ReasoningRow row={row} />;
		case ROW_KIND.tool:
			return isSubagent(row) ? <SubagentRow row={row} /> : <ToolRow row={row} />;
		case ROW_KIND.shell:
			return <ShellRow row={row} />;
		case ROW_KIND.error:
			return <ErrorRow row={row} />;
		case ROW_KIND.notice:
			return <NoticeRow row={row} />;
		case ROW_KIND.footer:
			return <FooterRow row={row} />;
	}
}

export const TranscriptEntry = memo(Entry);
