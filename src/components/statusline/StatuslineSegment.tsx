import { copyValue } from "@/components/statusline/copyValue";
import { SEGMENT_STYLE } from "@/components/statusline/statuslineStyles";

/**
 * One statusline segment (spec 020 §Statusline: "every segment is a button").
 * The label is what is shown, the `copy` value is what a click copies, and the
 * title names the action — so a segment is never a decorative span.
 */
export function StatuslineSegment({
	label,
	copy,
	title,
}: {
	readonly label: string;
	readonly copy: string;
	readonly title: string;
}) {
	return (
		<button
			type="button"
			title={title}
			onClick={() => void copyValue(copy)}
			style={SEGMENT_STYLE}
		>
			{label}
		</button>
	);
}
