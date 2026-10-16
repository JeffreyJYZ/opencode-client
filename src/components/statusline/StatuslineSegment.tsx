import { copyValue } from "@/components/statusline/copyValue";
import { SEGMENT_STYLE } from "@/components/statusline/statuslineStyles";

/**
 * One statusline segment (spec 020 §Statusline: "every segment is a button").
 * A segment either copies a value or runs an action — the title names which, so
 * a segment is never a decorative span.
 */
export function StatuslineSegment({
	label,
	copy,
	title,
	action,
}: {
	readonly label: string;
	readonly copy?: string;
	readonly title: string;
	readonly action?: () => void;
}) {
	return (
		<button
			type="button"
			title={title}
			onClick={() => {
				if (action !== undefined) action();
				else if (copy !== undefined) void copyValue(copy);
			}}
			style={SEGMENT_STYLE}
		>
			{label}
		</button>
	);
}
