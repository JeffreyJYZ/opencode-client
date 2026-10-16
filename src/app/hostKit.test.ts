import { describe, expect, test } from "bun:test";
import { APP_KIT } from "@/app/hostKit";
import { Button } from "@/components/Button";
import { ContextMenu } from "@/components/contextmenu/ContextMenu";
import { Section } from "@/components/Section";
import { PanelField, SidebarPanel } from "@/components/sidebar/SidebarPanel";
import { Markdown } from "@/components/transcript/Markdown";
import { createHostFactory } from "@/plugins/host";
import { PLUGIN_KIT } from "@/plugins/kit";

/**
 * M4.21: `ui.kit` is the app's own primitives. Each advertised name is the
 * component the app itself renders — checked by identity, not by shape — and
 * a host built with no kit still gets the frozen empty default.
 */

describe("the app kit", () => {
	test("exposes every name the host table advertises, each the app's own", () => {
		expect(APP_KIT.Button).toBe(Button);
		expect(APP_KIT.Panel).toBe(SidebarPanel);
		expect(APP_KIT.Section).toBe(Section);
		expect(APP_KIT.FieldRow).toBe(PanelField);
		expect(APP_KIT.Menu).toBe(ContextMenu);
		expect(APP_KIT.Markdown).toBe(Markdown);
	});

	test("is frozen", () => {
		expect(Object.isFrozen(APP_KIT)).toBe(true);
	});

	test("a host with no kit still gets the empty default", () => {
		const { host } = createHostFactory()("m421-a");
		expect(host.ui.kit).toBe(PLUGIN_KIT);
		expect(host.ui.kit).toEqual({});
		expect(Object.isFrozen(host.ui.kit)).toBe(true);
	});

	test("a host built with the app kit carries it", () => {
		const { host } = createHostFactory({ kit: APP_KIT })("m421-a");
		expect(host.ui.kit).toBe(APP_KIT);
	});
});
