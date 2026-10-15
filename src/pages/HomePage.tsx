import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { setLastOpenedSession, useLastOpenedSessionId } from "@/app/lastOpened";
import { navigate, settingsRoute } from "@/app/router";
import { activateTabAndGo, requestNewSession } from "@/app/tabSync";
import { openTab } from "@/app/tabs";
import { Slot } from "@/components/Slot";
import { ROUTE_KIND } from "@/constants/routes";
import { SESSION_STATUS } from "@/constants/sessions";
import { TAB_KIND } from "@/constants/tabs";
import {
	agentModel,
	groupSessionsByDay,
	lastPathSegment,
	relativeTime,
	sessionTitle,
} from "@/pages/homeModel";
import { useClient, useConnection, useTarget } from "@/session/ClientProvider";
import { useSessions } from "@/session/useSessions";

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
function openSession(id: string): void {
	setLastOpenedSession(id);
	const tab = { kind: TAB_KIND.session, id };
	openTab(tab);
	activateTabAndGo(tab);
}
export function HomePage() {
	const client = useClient();
	const target = useTarget();
	const connection = useConnection();
	const { sessions, status } = useSessions();
	const lastOpenedId = useLastOpenedSessionId();
	const [version, setVersion] = useState<string | null>(null);
	useEffect(() => {
		if (client === null) {
			setVersion(null);
			return;
		}
		let cancelled = false;
		client.server
			.info()
			.then((info) => {
				if (!cancelled) setVersion(info.version);
			})
			.catch(() => {
				if (!cancelled) setVersion(null);
			});
		return () => {
			cancelled = true;
		};
	}, [client]);
	const groups = groupSessionsByDay(sessions);
	const connectionUrl = "url" in connection ? (connection as { url: string }).url : undefined;
	const url = target?.url ?? connectionUrl ?? "";
	const onNew = (): void => {
		requestNewSession();
	};
	const onSettings = (): void => {
		navigate(settingsRoute());
	};
	return (
		<main data-route={ROUTE_KIND.home} style={{ padding: "var(--oc-space-4)" }}>
			<Slot id="home.hero" />
			<div
				style={{
					display: "flex",
					justifyContent: "flex-end",
					marginBottom: "var(--oc-space-3)",
				}}
			>
				<button type="button" style={BUTTON_STYLE} onClick={onSettings}>
					Settings
				</button>
			</div>
			{lastOpenedId !== null && (
				<section style={{ marginBottom: "var(--oc-space-4)" }}>
					<h2>Continue where you left off</h2>
					<button
						type="button"
						style={BUTTON_STYLE}
						onClick={() => openSession(lastOpenedId)}
					>
						{lastOpenedId}
					</button>
				</section>
			)}
			<section>
				<h2>Recents</h2>
				{status === SESSION_STATUS.loading && <p>Loading sessions…</p>}
				{status === SESSION_STATUS.none && <p>No server connected.</p>}
				{status === SESSION_STATUS.error && <p>Could not load sessions.</p>}
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
											<span>
												{" "}
												{lastPathSegment(session.location.directory)}
											</span>
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
			<div style={{ marginTop: "var(--oc-space-4)" }}>
				<button type="button" style={PRIMARY_STYLE} onClick={onNew}>
					New session
				</button>
			</div>
			<Slot id="home.widgets" />
			<Slot id="home.actions" />
		</main>
	);
}
