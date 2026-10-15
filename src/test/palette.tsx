import { fireEvent, render, screen } from "@testing-library/react";
import { requestCommandPalette } from "@/app/tabSync";
import { CommandPalette } from "@/components/CommandPalette";
import { ClientProvider } from "@/session/ClientProvider";
import type { OpenCodeClient } from "@/session/client";
import type { PickerPage } from "@/test/picker";

/**
 * The palette's test fixture: a client with the two sources that hit the server
 * (`session.list`, `command.list`) and a render helper that opens the palette the
 * way the app does — the `oc:command-palette` signal ⌘K dispatches — so no test
 * reaches into the component's state.
 */

/** The opener button's label; the tests use it to focus and click. */
export const PALETTE_OPEN_LABEL = "open palette";

/** A client whose session list and command list are the fixture's. */
export function paletteClient(
	page: PickerPage,
	commands: ReadonlyArray<{ name: string; description?: string }> = [],
): OpenCodeClient {
	return {
		session: { list: () => Promise.resolve(page) },
		command: { list: () => Promise.resolve({ data: commands }) },
		server: { info: () => Promise.resolve({ version: "2.0.29" }) },
	} as unknown as OpenCodeClient;
}

/** Render the palette behind its real opener, and return the opener. */
export function renderPalette(client: OpenCodeClient): HTMLElement {
	render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<button type="button" onClick={requestCommandPalette}>
				{PALETTE_OPEN_LABEL}
			</button>
			<CommandPalette />
		</ClientProvider>,
	);
	return screen.getByText(PALETTE_OPEN_LABEL);
}

/** Focus the opener, open the palette, and return its search field. */
export function openPalette(): HTMLInputElement {
	const opener = screen.getByText(PALETTE_OPEN_LABEL);
	opener.focus();
	fireEvent.click(opener);
	return screen.getByRole("combobox") as HTMLInputElement;
}
