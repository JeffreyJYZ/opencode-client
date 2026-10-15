import type { CSSProperties } from "react";
import { lastPathSegment, sessionTitle } from "@/pages/homeModel";
import type { SessionRow } from "@/session/useSessions";

const BUTTON_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-2) var(--oc-space-3)",
	cursor: "pointer",
	fontFamily: "var(--oc-font-ui)",
};

export type HomeContinueCardProps = {
	readonly id: string;
	readonly session: SessionRow | undefined;
	readonly onOpen: (id: string) => void;
};

export function HomeContinueCard({ id, session, onOpen }: HomeContinueCardProps) {
	const title = session === undefined ? id : sessionTitle(session);
	const location = session === undefined ? "" : lastPathSegment(session.location.directory);
	return (
		<section style={{ marginBottom: "var(--oc-space-4)" }}>
			<h2>Continue where you left off</h2>
			<button type="button" style={BUTTON_STYLE} onClick={() => onOpen(id)}>
				{title}
				{location !== "" ? ` · ${location}` : ""}
			</button>
		</section>
	);
}
