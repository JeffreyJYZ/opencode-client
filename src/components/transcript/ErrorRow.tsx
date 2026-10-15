import type { CSSProperties } from "react";
import type { ErrorRow as ErrorRowModel } from "@/session/transcript";
import { ROW_STYLE, rowIdentity, TEXT_STYLE } from "./rowStyles";

/**
 * A failure the session reported (`session.execution.failed`, `session.step.failed`).
 *
 * It carries `role="alert"`: a turn that failed must be announced, not left for the
 * reader to notice (spec 010 §Desktop behaviours: never a silent failure).
 */
const ERROR_STYLE: CSSProperties = { ...TEXT_STYLE, color: "var(--oc-danger)" };

export function ErrorRow({ row }: { readonly row: ErrorRowModel }) {
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			<p role="alert" style={ERROR_STYLE}>
				{row.message}
			</p>
		</article>
	);
}
