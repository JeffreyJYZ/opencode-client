import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { resetSettingsSections } from "@/app/settings/sections";
import { resetTabs } from "@/app/tabs";
import { COMMAND_RUN_EVENT } from "@/constants/palette";
import { ROUTE_PATH } from "@/constants/routes";
import { registerCommand, resetCommands } from "@/plugins/commands";
import { openPalette, paletteClient, renderPalette } from "@/test/palette";

/**
 * M4.11: the palette's **second** command provider. A command registered through
 * the host's `commands.register` (the path a plugin uses) appears as a row and
 * **runs** in-process through the registry, beside the server's own
 * `command.list`. This is the row's evidence: not that a name was listed, but
 * that Enter reached the command's `run`.
 */

afterEach(cleanup);
afterEach(resetTabs);
afterEach(resetSettingsSections);
afterEach(resetCommands);
beforeEach(() => window.history.pushState(null, "", ROUTE_PATH.home));

describe("a plugin command in the palette", () => {
	test("it is listed and Enter runs it through the registry", async () => {
		let ran = 0;
		registerCommand({
			id: "probe.export",
			title: "Probe: export transcript",
			run: () => {
				ran += 1;
			},
		});
		renderPalette(paletteClient({ data: [], cursor: {} }));
		const input = openPalette();
		fireEvent.change(input, { target: { value: "probe" } });
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
		expect(screen.getByRole("option").textContent).toContain("Probe: export transcript");
		fireEvent.keyDown(input, { key: "Enter" });
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(ran).toBe(1);
	});

	test("a server command still emits its run signal, not the registry path", async () => {
		registerCommand({ id: "probe.only", title: "Probe: only", run: () => {} });
		const seen: string[] = [];
		const onRun = (event: Event): void => {
			seen.push((event as CustomEvent<{ name: string }>).detail.name);
		};
		window.addEventListener(COMMAND_RUN_EVENT, onRun);
		renderPalette(paletteClient({ data: [], cursor: {} }, [{ name: "commit" }]));
		const input = openPalette();
		fireEvent.change(input, { target: { value: "commit" } });
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
		fireEvent.keyDown(input, { key: "Enter" });
		window.removeEventListener(COMMAND_RUN_EVENT, onRun);
		expect(seen).toEqual(["commit"]);
	});
});
