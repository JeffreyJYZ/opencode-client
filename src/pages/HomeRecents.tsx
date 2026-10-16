import type { CSSProperties } from "react";
import { SESSION_STATUS } from "@/constants/sessions";
import type { RecentGroup } from "@/pages/homeModel";
import { RecentsRow } from "@/pages/RecentsRow";

const BUTTON_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-2) var(--oc-space-3)",
	cursor: "pointer",
};
const PRIMARY_STYLE: CSSProperties = { ...BUTTON_STYLE, background: "var(--oc-accent)" };

export type HomeRecentsProps = {
	readonly status: string;
	readonly onSettings?: () => void;
	readonly groups: readonly RecentGroup[];
	readonly url: string;
	readonly version: string | null;
	readonly onNew: () => void;
	readonly openSession: (id: string) => void;
};

export function HomeRecentsSection({
	status,
	onSettings,
	groups,
	url,
	version,
	onNew,
	openSession,
}: HomeRecentsProps) {
	const headingStyle: CSSProperties = {
		fontSize: "var(--oc-font-size-heading)",
		fontWeight: 600,
		margin: 0,
		color: "var(--oc-text)",
	};
	const dayStyle: CSSProperties = {
		fontSize: "var(--oc-font-size-meta)",
		fontWeight: 500,
		margin: 0,
		color: "var(--oc-text-muted)",
	};
	return (
		<section style={{ display: "flex", flexDirection: "column", gap: "var(--oc-space-4)" }}>
			<div style={{ display: "flex", alignItems: "center", gap: "var(--oc-space-3)" }}>
				<h2 style={headingStyle}>Recents</h2>
				{onSettings !== undefined && (
					<button type="button" style={BUTTON_STYLE} onClick={onSettings}>
						Settings
					</button>
				)}
			</div>
			{status === SESSION_STATUS.loading && <p>Loading sessions…</p>}
			{status === SESSION_STATUS.none && <p>No server connected.</p>}
			{status === SESSION_STATUS.error && <p>Could not load sessions from {url}.</p>}
			{status === SESSION_STATUS.empty && (
				<div style={{ display: "flex", flexDirection: "column", gap: "var(--oc-space-2)" }}>
					<button type="button" style={PRIMARY_STYLE} onClick={onNew}>
						New session
					</button>
					<p>
						Connected to {url} {version !== null ? `(v${version})` : ""}
					</p>
				</div>
			)}
			{status === SESSION_STATUS.ready &&
				groups.map((group) => (
					<section
						key={group.label}
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "var(--oc-space-2)",
						}}
					>
						<h3 style={dayStyle}>{group.label}</h3>
						<ul
							style={{
								listStyle: "none",
								padding: 0,
								margin: 0,
								display: "flex",
								flexDirection: "column",
								gap: "var(--oc-space-2)",
							}}
						>
							{group.sessions.map((session) => (
								<li key={session.id}>
									<RecentsRow session={session} openSession={openSession} />
								</li>
							))}
						</ul>
					</section>
				))}
		</section>
	);
}
