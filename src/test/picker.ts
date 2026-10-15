import type { OpenCodeClient } from "@/session/client";

/**
 * Fixtures for the session picker's tests. Shared so the data-path test and the
 * component tests page the same way and a page size of two is one shape, not
 * three copies.
 */

/** A root session row as `session.list` returns it. */
export function pickerRow(
	id: string,
	title: string,
	directory: string,
	updated = 1,
): Record<string, unknown> {
	return {
		id,
		title,
		parentID: undefined,
		projectID: "p",
		cost: 0,
		tokens: {},
		time: { created: updated, updated },
		location: { directory },
	};
}

/** A child row: it must never reach the picker. */
export function childRow(id: string, parent: string, title: string): Record<string, unknown> {
	return { ...pickerRow(id, title, "/dev/apps/child"), parentID: parent };
}

/**
 * One `session.list` page. Model the **measured** shape (`docs/opencode-api.md`
 * §4): a page that carries rows always carries a `next` anchor, even when it is
 * short; the page that ends the list is `{ data: [], cursor: {} }` — empty, no
 * `next`. A non-empty page that merely omits `next` is a shape the server never
 * sends and would hide an end-of-list defect.
 */
export type PickerPage = {
	readonly data: readonly Record<string, unknown>[];
	readonly cursor?: { readonly next?: string | null };
};

/** The key the first page (no cursor) is stored under. */
export const FIRST_PAGE = "first";

export type PagedClient = {
	readonly client: OpenCodeClient;
	/** Every `session.list` query, in order. */
	readonly calls: unknown[];
};

/**
 * A client whose `session.list` answers by the cursor it was asked with: the
 * first call has no cursor and gets `pages[FIRST_PAGE]`, a call carrying `cN`
 * gets `pages.cN`. An unknown cursor resolves to an empty last page.
 */
export function pagedClient(pages: Record<string, PickerPage>): PagedClient {
	const calls: unknown[] = [];
	const client = {
		session: {
			list: (arg: { cursor?: string }) => {
				calls.push(arg);
				const page = pages[arg?.cursor ?? FIRST_PAGE];
				return Promise.resolve(page ?? { data: [], cursor: {} });
			},
		},
		server: { info: () => Promise.resolve({ version: "2.0.29" }) },
	} as unknown as OpenCodeClient;
	return { client, calls };
}
