import { SHELL_LABEL, SHELL_PROMPT } from "@/constants/transcriptUi";
import type { ShellRow as ShellRowModel } from "@/session/transcript";
import { shellStatusLabel } from "./rowModel";
import {
	CODE_STYLE,
	HEAD_STYLE,
	META_STYLE,
	OUTPUT_STYLE,
	ROW_STYLE,
	rowIdentity,
} from "./rowStyles";

/**
 * A shell command the session ran, and its output.
 *
 * `output` is the row's own string — `output.output`, the paged object's one field
 * (api §4), already flattened by M2.1's reducer. The status is the server's own
 * (`running`/`exited`/`timeout`/`killed`), shown verbatim when it is a value this
 * build does not know, so a new server state can never read as "done".
 *
 * The output block is M2.4's seam, exactly as in the tool row.
 */
export function ShellRow({ row }: { readonly row: ShellRowModel }) {
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			<header style={HEAD_STYLE}>
				<span style={META_STYLE}>{SHELL_LABEL}</span>
				<code style={CODE_STYLE}>{`${SHELL_PROMPT} ${row.command}`}</code>
				<span style={META_STYLE} data-status={row.status}>
					{shellStatusLabel(row.status)}
				</span>
			</header>
			{row.output !== "" && <pre style={OUTPUT_STYLE}>{row.output}</pre>}
		</article>
	);
}
