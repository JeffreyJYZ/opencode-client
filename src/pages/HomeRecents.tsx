import type { CSSProperties } from "react";
import { SESSION_STATUS } from "@/constants/sessions";
import type { RecentGroup } from "@/pages/homeModel";
import { agentModel, lastPathSegment, relativeTime, sessionTitle } from "@/pages/homeModel";

const BUTTON_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-2) var(--oc-space-3)",
	cursor: "pointer",
	fontFamily: "var(--oc-font-ui)",
};
const PRIMARY_STYLE: CSSProperties = { ...BUTTON_STYLE, background: "var(--oc-accent)" };

export type HomeRecentsProps = {
	readonly status: string;
	readonly groups: readonly RecentGroup[];
	readonly url: string;
	readonly version: string | null;
	readonly onNew: () => void;
	readonly openSession: (id: string) => void;
};

export function HomeRecentsSection({
	status,
	groups,
	url,
	version,
	onNew,
	openSession,
}: HomeRecentsProps) {
	return (
		<section>
			<h2>Recents</h2>
			{status === SESSION_STATUS.loading && <p>Loading sessions…</p>}
			{status === SESSION_STATUS.none && <p>No server connected.</p>}
			{status === SESSION_STATUS.error && <p>Could not load sessions from {url}.</p>}
			{status === SESSION_STATUS.empty && (
				<div>
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
					<section key={group.label}>
						<h3>{group.label}</h3>
						<ul style={{ listStyle: "none", padding: 0 }}>
							{group.sessions.map((session) => (
								<li key={session.id}>
									<button
										type="button"
										style={BUTTON_STYLE}
										onClick={() => openSession(session.id)}
									>
										<span>{sessionTitle(session)}</span>
										<span> {lastPathSegment(session.location.directory)}</span>
										<span> {relativeTime(session.time.updated)}</span>
										{agentModel(session) !== null && (
											<span> {agentModel(session)}</span>
										)}
									</button>
								</li>
							))}
						</ul>
					</section>
				))}
		</section>
	);
}
