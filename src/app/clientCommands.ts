import { homeRoute, navigate } from "@/app/router";
import { toggleSidebar } from "@/app/settings/sidebarActions";
import {
	closeActiveTabAndGo,
	openSettingsAndGo,
	requestCommandPalette,
	requestNewSession,
} from "@/app/tabSync";

/**
 * The app's **client commands** (spec 050 §Commands: "the composer's menu is the
 * union of the server's `command.list()` and the app's client commands"). A client
 * command is executed here and **never becomes a prompt**; a server command inserts
 * `/<name> ` instead.
 *
 * Every one of these is an existing action of the app — a chord's action, a menu
 * item — so the composer is a third entry point to behaviour that already exists
 * rather than a second implementation of it. The list is short and deliberate: a
 * client command earns its place by being reachable from the keyboard while typing.
 */

export type ClientCommand = {
	/** The name after `/`, and the id the menu disambiguates a server command from. */
	readonly name: string;
	/** What the row says it does. */
	readonly description: string;
	/** The row's label. */
	readonly label: string;
	/** Run it in the app. */
	readonly run: () => void;
};

/** The names, so a test (and the docs) can hold the registry to its own list. */
export const CLIENT_COMMAND_NAMES = {
	newSession: "new",
	settings: "settings",
	home: "home",
	palette: "palette",
	sidebar: "sidebar",
	close: "close",
} as const;

/** The registry, in the order the menu lists it. */
export const CLIENT_COMMANDS: readonly ClientCommand[] = [
	{
		name: CLIENT_COMMAND_NAMES.newSession,
		description: "New session",
		label: "New session",
		run: requestNewSession,
	},
	{
		name: CLIENT_COMMAND_NAMES.settings,
		description: "Open settings",
		label: "Open settings",
		run: openSettingsAndGo,
	},
	{
		name: CLIENT_COMMAND_NAMES.home,
		description: "Go home",
		label: "Go home",
		run: () => navigate(homeRoute()),
	},
	{
		name: CLIENT_COMMAND_NAMES.palette,
		description: "Command palette",
		label: "Command palette",
		run: requestCommandPalette,
	},
	{
		name: CLIENT_COMMAND_NAMES.sidebar,
		description: "Toggle sidebar",
		label: "Toggle sidebar",
		run: toggleSidebar,
	},
	{
		name: CLIENT_COMMAND_NAMES.close,
		description: "Close this tab",
		label: "Close this tab",
		run: closeActiveTabAndGo,
	},
];

/** One client command by name, or `undefined`. */
export function clientCommand(name: string): ClientCommand | undefined {
	return CLIENT_COMMANDS.find((command) => command.name === name);
}
