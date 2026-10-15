import {
	COST_DECIMALS,
	SHELL_STATUS_LABEL,
	SUBAGENT_DETAIL_FIELDS,
	SUBAGENT_SESSION_FIELD,
	SUBAGENT_TOOL_NAME,
} from "@/constants/transcriptUi";
import type { FooterRow, ToolRow } from "@/session/transcript";

/**
 * The transcript rows' pure derivations (M2.2): a tool call's input object and the
 * three label lookups. No React and no store here, so a row component stays a pure
 * function of its row and every derivation is testable on its own.
 *
 * A tool's input arrives as **text**, because M2.1 stores what the stream sent —
 * a partial JSON string while the call is still streaming, an object once
 * `session.tool.called` has landed. A parse that fails is a legitimate state (the
 * call is mid-stream), never a throw.
 */

/** The tool's input as an object, or `null` while it is still partial or blank. */
export function parsedInput(text: string): Record<string, unknown> | null {
	if (text.trim() === "") return null;
	try {
		const value: unknown = JSON.parse(text);
		return typeof value === "object" && value !== null
			? (value as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

/** A string field of a tool row's input, when the input has one. */
export function inputField(row: ToolRow, key: string): string | undefined {
	const value = parsedInput(row.input)?.[key];
	return typeof value === "string" && value !== "" ? value : undefined;
}

/** Whether a tool row is a subagent call — the store marks it by its tool name. */
export function isSubagent(row: ToolRow): boolean {
	return row.name === SUBAGENT_TOOL_NAME;
}

/** What a subagent row is *about*: its description, else its agent, else nothing. */
export function subagentDetail(row: ToolRow): string | undefined {
	for (const field of SUBAGENT_DETAIL_FIELDS) {
		const value = inputField(row, field);
		if (value !== undefined) return value;
	}
	return undefined;
}

/** The child session a subagent call continues, when the input names one. */
export function subagentSession(row: ToolRow): string | undefined {
	return inputField(row, SUBAGENT_SESSION_FIELD);
}

/** A shell's status word; an unknown value is shown verbatim rather than hidden. */
export function shellStatusLabel(status: string): string {
	const known = SHELL_STATUS_LABEL[status as keyof typeof SHELL_STATUS_LABEL];
	return known ?? status;
}

/** The per-prompt footer's one line: what finished, and its cost when the step had one. */
export function footerText(row: FooterRow): string {
	return row.cost === undefined
		? row.finish
		: `${row.finish} · ${row.cost.toFixed(COST_DECIMALS)}`;
}
