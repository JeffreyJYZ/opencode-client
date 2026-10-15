import { useEffect, useState } from "react";
import { useClient } from "@/session/ClientProvider";
import { EMPTY_PANEL_DATA, loadPanelData, type PanelData } from "@/session/panelData";
import { readBranch } from "@/session/vcsBranch";

/**
 * The sidebar's one subscription to the server (M2.7): read every panel's figure
 * when the open session changes, and hold the result. The panel components take
 * their data as props and fetch nothing, so mounting a panel can never start a
 * request of its own — one read, one shape, one place to trace a figure to.
 *
 * The branch is filled by a **second** read, not by the first: `vcs.get` is a
 * bounded retry and waiting on it would hold the whole sidebar empty. So the
 * panels paint as soon as their own reads answer, and the Session panel's branch
 * appears when the retry resolves — or stays empty when it is spent.
 */

export type PanelDataState = {
	readonly data: PanelData;
	readonly loading: boolean;
};

const IDLE: PanelDataState = { data: EMPTY_PANEL_DATA, loading: false };

export function usePanelData(sessionID: string | null): PanelDataState {
	const client = useClient();
	const [state, setState] = useState<PanelDataState>(IDLE);

	useEffect(() => {
		if (client === null || sessionID === null) {
			setState(IDLE);
			return;
		}
		let cancelled = false;
		setState((previous) => ({ ...previous, loading: true }));
		void loadPanelData(client, sessionID).then((data) => {
			if (cancelled) return;
			setState({ data, loading: false });
			const directory = data.session.info?.location.directory;
			if (directory === undefined) return;
			void readBranch(client, directory).then((branch) => {
				if (cancelled || branch === null) return;
				setState((previous) => ({
					...previous,
					data: {
						...previous.data,
						session: { ...previous.data.session, branch },
					},
				}));
			});
		});
		return () => {
			cancelled = true;
		};
	}, [client, sessionID]);

	return state;
}
