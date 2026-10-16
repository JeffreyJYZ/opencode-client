import { EMPTY_STYLE, ROW_DETAIL_STYLE, ROW_STYLE } from "@/components/sidebar/sidebarStyles";
import {
	SIDEBAR_ADDITIONS_PREFIX,
	SIDEBAR_DELETIONS_PREFIX,
	SIDEBAR_DIFF_SEPARATOR,
	SIDEBAR_EMPTY,
	SIDEBAR_ROW_SEPARATOR,
} from "@/constants/sidebar";
import { lastPathSegment } from "@/pages/homeModel";
import type { FilesPanelData } from "@/session/panelData";

/**
 * The Files changed panel body (spec 020 §Sidebar): `vcs.status` for the
 * session's directory (`FilesPanelData.files`). Each row is the server's own
 * file, status and diff counts — the panel adds no arithmetic of its own. The
 * host draws the frame and title (M4.11).
 */

export function FilesPanel({ data }: { readonly data: FilesPanelData }) {
	return (
		<>
			{data.files.length === 0 ? (
				<p style={EMPTY_STYLE}>{SIDEBAR_EMPTY}</p>
			) : (
				data.files.map((entry) => (
					<div key={entry.file} style={ROW_STYLE}>
						<span title={entry.file}>{lastPathSegment(entry.file)}</span>
						<span style={ROW_DETAIL_STYLE}>
							{entry.status}
							{SIDEBAR_ROW_SEPARATOR}
							{SIDEBAR_ADDITIONS_PREFIX}
							{entry.additions}
							{SIDEBAR_DIFF_SEPARATOR}
							{SIDEBAR_DELETIONS_PREFIX}
							{entry.deletions}
						</span>
					</div>
				))
			)}
		</>
	);
}
