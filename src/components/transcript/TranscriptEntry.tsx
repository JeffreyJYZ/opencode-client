import { memo } from "react";
import { ROW_KIND } from "@/constants/transcript";
import type { TranscriptRow } from "@/session/transcript";
import { ErrorRow } from "./ErrorRow";
import { FooterRow } from "./FooterRow";
import { NoticeRow } from "./NoticeRow";
import { ProseRow } from "./ProseRow";
import { ReasoningRow } from "./ReasoningRow";
import { isSubagent } from "./rowModel";
import { ShellRow } from "./ShellRow";
import { SubagentRow } from "./SubagentRow";
import { ToolRow } from "./ToolRow";
import { UserBand } from "./UserBand";

/**
 * One row of the transcript, dispatched on its kind (M2.2).
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
 */
function Entry({ row }: { readonly row: TranscriptRow }) {
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
