import type { Host } from "@/plugins/sdk";

/**
 * hello-world — the smallest real contribution (spec 040 §Plugins shipped as
 * examples): one home slot, one palette command, and a document marker set in
 * `setup` and cleared in `dispose`, which is the lifecycle proof.
 *
 * It is authored to compile straight onto the host globals — JSX uses the classic
 * factory `__ocReact.createElement` — so `bun build` alone emits an entry that
 * imports nothing (spec 040 §Entry file). It declares `window` because it writes
 * that marker on the document itself; rendering a contribution is the host's job
 * and asks for no label.
 */

declare const __ocReact: {
	readonly createElement: typeof import("react").createElement;
	readonly Fragment: typeof import("react").Fragment;
};

const MARKER_ATTRIBUTE = "data-hello-world";
const MARKER_VALUE = "on";
const SLOT = "home.hero";
const SLOT_ID = "hello-world.greeting";
const COMMAND_ID = "hello-world.greet";
const COMMAND_TITLE = "Hello World: greet";
const GREETING = "Hello from a plugin slot.";
const GREETING_STYLE = { color: "var(--oc-accent)", margin: 0 };

function Greeting() {
	return (
		<p style={GREETING_STYLE} data-hello-world={SLOT_ID}>
			{GREETING}
		</p>
	);
}

export default {
	setup(host: Host) {
		host.ui.register({ id: SLOT_ID, slot: SLOT, component: Greeting });
		host.commands.register({
			id: COMMAND_ID,
			title: COMMAND_TITLE,
			run: () => host.notify.toast(GREETING),
		});
		document.documentElement.setAttribute(MARKER_ATTRIBUTE, MARKER_VALUE);
		return {
			dispose() {
				document.documentElement.removeAttribute(MARKER_ATTRIBUTE);
			},
		};
	},
};
