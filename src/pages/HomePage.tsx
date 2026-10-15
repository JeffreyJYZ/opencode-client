import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { setLastOpenedSession, useLastOpenedSessionId } from "@/app/lastOpened";
import { activateTabAndGo, requestNewSession } from "@/app/tabSync";
import { openTab } from "@/app/tabs";
import { Slot } from "@/components/Slot";
import { ROUTE_KIND } from "@/constants/routes";
import { TAB_KIND } from "@/constants/tabs";
import { HomeContinueCard } from "@/pages/HomeContinueCard";
import { HomeRecentsSection } from "@/pages/HomeRecents";
import { groupSessionsByDay } from "@/pages/homeModel";
import { useClient, useConnection, useTarget } from "@/session/ClientProvider";
import { type SessionRow, useSessions } from "@/session/useSessions";

const BUTTON_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-2) var(--oc-space-3)",
	cursor: "pointer",
	fontFamily: "var(--oc-font-ui)",
};
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
		const tab = { kind: TAB_KIND.settings };
		openTab(tab);
		activateTabAndGo(tab);
	};
	const lastOpenedSession: SessionRow | undefined =
		lastOpenedId === null ? undefined : sessions.find((session) => session.id === lastOpenedId);
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
				<HomeContinueCard
					id={lastOpenedId}
					session={lastOpenedSession}
					onOpen={openSession}
				/>
			)}
			<HomeRecentsSection
				status={status}
				groups={groups}
				url={url}
				version={version}
				onNew={onNew}
				openSession={openSession}
			/>
			<div style={{ marginTop: "var(--oc-space-4)" }}>
				<button
					type="button"
					style={{ ...BUTTON_STYLE, background: "var(--oc-accent)" }}
					onClick={onNew}
				>
					New session
				</button>
			</div>
			<Slot id="home.widgets" />
			<Slot id="home.actions" />
		</main>
	);
}
