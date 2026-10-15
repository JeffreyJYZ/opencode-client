import type { CSSProperties } from "react";
import { useSettings } from "@/app/settings/useSettings";

/**
 * What the user is told when the stored settings could not be used (spec 010
 * §Persistence: a newer build's blob is preserved, an unreadable one is
 * replaced). A one-line band, like the offline banner: the app boots either way,
 * and silence would be the one dishonest option.
 */

const NOTICE_STYLE: CSSProperties = {
	padding: "var(--oc-space-2) var(--oc-space-4)",
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	borderBottom: "1px solid var(--oc-warn)",
};

export function SettingsNotice() {
	const notice = useSettings().notice;
	if (notice === null) return null;
	return (
		<div role="status" data-settings-notice={notice.id} style={NOTICE_STYLE}>
			{notice.message}
		</div>
	);
}
