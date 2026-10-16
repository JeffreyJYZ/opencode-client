import type { OpenCodeClient, SessionInfo } from "@opencode/client";
import { render } from "@testing-library/react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ClientProvider } from "@/session/ClientProvider";

/**
 * The sidebar tests' shared fixtures (M2.7, M2.25): one root session whose panels
 * resolve, the render that mounts the panel, and the viewport stub the narrow rule
 * is driven through — `window.matchMedia`, the seam the panel itself reads. Split
 * out so the width/drag suite and the narrow-window suite share one fixture.
 */

export const SIDEBAR_DIRECTORY = "/tmp/m2728-project";

export const SIDEBAR_SESSION: SessionInfo = {
	id: "ses_root",
	projectID: "proj",
	cost: 0,
	tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
	time: { created: 1, updated: 1 },
	location: { directory: SIDEBAR_DIRECTORY },
};

/** A client whose panel reads all resolve, so the sidebar can render its frame. */
export function sidebarClient(info: SessionInfo = SIDEBAR_SESSION): OpenCodeClient {
	return {
		session: {
			get: () => Promise.resolve(info),
			stats: () => Promise.reject(new Error("not needed")),
			context: () => Promise.resolve([]),
			list: () => Promise.resolve({ data: [], cursor: {} }),
		},
		mcp: {
			list: () => Promise.resolve({ location: { directory: SIDEBAR_DIRECTORY }, data: [] }),
		},
		vcs: {
			status: () => Promise.resolve({ location: { directory: SIDEBAR_DIRECTORY }, data: [] }),
			get: () =>
				Promise.resolve({
					location: { directory: SIDEBAR_DIRECTORY },
					data: { branch: {} },
				}),
		},
	} as unknown as OpenCodeClient;
}

/** Mount the sidebar against `client`. */
export function renderSidebar(client: OpenCodeClient): void {
	render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<Sidebar />
		</ClientProvider>,
	);
}

/**
 * Replace `window.matchMedia` with a list whose `matches` a test sets, so a
 * viewport is driven without faking a style. `set` notifies the subscribers the
 * panel attached, standing in for a window resize crossing the breakpoint.
 */
export function stubViewport(narrow: boolean): {
	set: (narrow: boolean) => void;
	restore: () => void;
} {
	const original = window.matchMedia;
	const listeners = new Set<() => void>();
	let matches = narrow;
	window.matchMedia = ((query: string) =>
		({
			media: query,
			get matches(): boolean {
				return matches;
			},
			addEventListener: (_type: string, listener: () => void) => {
				listeners.add(listener);
			},
			removeEventListener: (_type: string, listener: () => void) => {
				listeners.delete(listener);
			},
		}) as unknown as MediaQueryList) as unknown as typeof window.matchMedia;
	return {
		set: (next: boolean) => {
			matches = next;
			for (const listener of [...listeners]) listener();
		},
		restore: () => {
			window.matchMedia = original;
		},
	};
}
