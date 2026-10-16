import { useActiveSessionId } from "@/app/useActiveSession";
import { Slot } from "@/components/Slot";
import { StatuslineSegment } from "@/components/statusline/StatuslineSegment";
import { BAR_STYLE, GROUP_STYLE, HINT_STYLE } from "@/components/statusline/statuslineStyles";
import { SLOT } from "@/constants/slots";
import {
	STATUSLINE_HINT,
	STATUSLINE_LABEL,
	STATUSLINE_SEGMENT_TITLE,
	STATUSLINE_SUBAGENT_PREFIX,
	STATUSLINE_SUBAGENT_SUFFIX,
	STATUSLINE_TOKENS_SUFFIX,
	STATUSLINE_UNKNOWN,
} from "@/constants/statusline";
import { formatSpend, formatTokens } from "@/session/amounts";
import { locationLabel } from "@/session/statuslineData";
import { useStatusline } from "@/session/useStatusline";

/**
 * The statusline (spec 020 §Statusline, M2.8): location then branch on the left;
 * subagents, the session's own tokens and spend, and a contextual hint on the
 * right. The branch arrives in a second read, so it is appended only when it has
 * resolved — the location is never held back waiting for it.
 */
export function Statusline() {
	const sessionID = useActiveSessionId();
	const data = useStatusline(sessionID);
	if (data === null) return null;
	return (
		<footer role="contentinfo" aria-label={STATUSLINE_LABEL} style={BAR_STYLE}>
			<div style={GROUP_STYLE}>
				<Slot id={SLOT.statuslineLeft} />
				{data.directory === null ? (
					<span style={HINT_STYLE}>{STATUSLINE_UNKNOWN}</span>
				) : (
					<StatuslineSegment
						label={locationLabel(data.directory, data.branch)}
						copy={data.directory}
						title={STATUSLINE_SEGMENT_TITLE.location}
					/>
				)}
			</div>
			<div style={GROUP_STYLE}>
				{data.subagents > 0 ? (
					<StatuslineSegment
						label={`${STATUSLINE_SUBAGENT_PREFIX} ${data.subagents} ${STATUSLINE_SUBAGENT_SUFFIX}`}
						copy={String(data.subagents)}
						title={STATUSLINE_SEGMENT_TITLE.subagents}
					/>
				) : null}
				{data.tokens === null ? null : (
					<StatuslineSegment
						label={`${formatTokens(data.tokens)} ${STATUSLINE_TOKENS_SUFFIX}`}
						copy={String(data.tokens)}
						title={STATUSLINE_SEGMENT_TITLE.tokens}
					/>
				)}
				{data.spend === null ? null : (
					<StatuslineSegment
						label={formatSpend(data.spend)}
						copy={String(data.spend)}
						title={STATUSLINE_SEGMENT_TITLE.spend}
					/>
				)}
				<span style={HINT_STYLE}>
					{data.running ? STATUSLINE_HINT.running : STATUSLINE_HINT.idle}
				</span>
				<Slot id={SLOT.statuslineRight} />
			</div>
		</footer>
	);
}
