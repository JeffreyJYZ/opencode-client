import type { FormInfo, PermissionRequest } from "@opencode/client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { DOCK_REFUSE, DOCK_REPLY_FAILED, type DockDecision } from "@/constants/composer";
import { cancelForm, replyForm, replyPermission } from "@/session/actions";
import { useClient, useConnection, useDockSignals } from "@/session/ClientProvider";
import { readPendingForms, readPendingPermissions } from "@/session/composerReads";
import { CONNECTION_STATUS } from "@/session/connectionState";

/**
 * The two docks' data (M2.6). **The docks own their refetch** — `M2.1` left
 * `session.permissions` and `form.*` deliberately unheld — and they refetch at four
 * moments, all of them the server's own state rather than a local guess:
 *
 * 1. **Mount and session switch** — a new session's pending requests.
 * 2. **A dock frame** (`permission.*`, `form.*`) — the ingest ticks the session's
 *    `dockSignals` revision, and the dock re-reads the list. The list is the
 *    authority; the frame is only the cue, so a dropped frame costs a delay, not a
 *    lost dock.
 * 3. **A live transition** — the connection going online (spec 050: "pending
 *    permissions/forms refetch on every live transition").
 * 4. **After a reply** — the dock closes on the server's answer, not on a local flag.
 *
 * Neither dock can be left with no affordance: a pending request always renders a
 * dock, and a failed reply keeps it open with a named error.
 */

export type Docks = {
	readonly permission: PermissionRequest | null;
	readonly more: number;
	readonly form: FormInfo | null;
	readonly error: string | null;
	readonly busy: boolean;
	readonly decide: (decision: DockDecision) => Promise<void>;
	readonly answer: (
		answer: Readonly<Record<string, string | number | boolean | readonly string[]>>,
	) => Promise<void>;
	/** Esc in the permission dock: the wire's safe decision. */
	readonly refuse: () => Promise<void>;
	/** Esc in the question dock: cancel the form so the asker is told. */
	readonly dismiss: () => Promise<void>;
};

export function useDocks(sessionID: string): Docks {
	const client = useClient();
	const signals = useDockSignals();
	const connection = useConnection();
	const revision = useSyncExternalStore(signals.subscribe, () => signals.revision(sessionID));
	const [permissions, setPermissions] = useState<readonly PermissionRequest[]>([]);
	const [forms, setForms] = useState<readonly FormInfo[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const online = connection.status === CONNECTION_STATUS.online;

	const refetch = useCallback(async () => {
		if (client === null) {
			setPermissions([]);
			setForms([]);
			return;
		}
		const [pending, pendingForms] = await Promise.all([
			readPendingPermissions(client, sessionID),
			readPendingForms(client, sessionID),
		]);
		setPermissions(pending);
		setForms(pendingForms);
	}, [client, sessionID]);

	useEffect(() => {
		// Both are real dependencies: a dock frame ticks `revision`, and a live
		// transition (`online`) refetches pending requests (spec 050 §Resync policy).
		void revision;
		void online;
		void refetch();
	}, [refetch, revision, online]);

	const settle = useCallback(
		async (call: () => Promise<void>) => {
			setBusy(true);
			try {
				await call();
				setError(null);
				await refetch();
			} catch {
				setError(DOCK_REPLY_FAILED);
			} finally {
				setBusy(false);
			}
		},
		[refetch],
	);

	const permission = permissions[0] ?? null;
	const form = forms[0] ?? null;

	const decide = useCallback(
		async (decision: DockDecision) => {
			if (client === null || permission === null) return;
			await settle(async () => {
				await replyPermission(client, {
					sessionID,
					requestID: permission.id,
					decision,
				});
			});
		},
		[client, permission, sessionID, settle],
	);

	const answer = useCallback(
		async (values: Readonly<Record<string, string | number | boolean | readonly string[]>>) => {
			if (client === null || form === null) return;
			await settle(async () => {
				await replyForm(client, { sessionID, formID: form.id, answer: values });
			});
		},
		[client, form, sessionID, settle],
	);

	const dismiss = useCallback(async () => {
		if (client === null || form === null) return;
		await settle(async () => {
			await cancelForm(client, { sessionID, formID: form.id });
		});
	}, [client, form, sessionID, settle]);

	return {
		permission,
		more: Math.max(0, permissions.length - 1),
		form,
		error,
		busy,
		decide,
		answer,
		refuse: () => decide(DOCK_REFUSE),
		dismiss,
	};
}
