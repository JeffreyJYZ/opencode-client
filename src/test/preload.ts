import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { POLL_TIMEOUT_MS } from "@/test/budget";

/** The origin the test window starts at, so a relative path can be navigated to. */
const TEST_WINDOW_URL = "http://localhost/";

/**
 * Install happy-dom's DOM globals for the `bun test` run (bunfig.toml
 * `[test] preload`).
 *
 * The preload is evaluated **once per process, not once per file** (bun 1.4.3
 * runs the whole suite in one process), so every test file sees these globals —
 * including one that would rather have the real `fetch`, since happy-dom's is
 * same-origin. A test that needs cross-origin `fetch` therefore cannot share this
 * run; it needs its own bunfig without the preload.
 */
GlobalRegistrator.register({ url: TEST_WINDOW_URL });

/**
 * happy-dom 21's `Node.prototype.nodeName` getter returns `""` when it is
 * invoked directly, while `node.nodeName` resolves through `Element.prototype`
 * and works — measured (happy-dom 21.0.1, bun 1.4.3):
 *
 *   Object.getOwnPropertyDescriptor(Node.prototype, "nodeName").get.call(el) → ""
 *   el.nodeName                                                              → "P"
 *
 * DOMPurify 3.4.17 reads node names through exactly that cached `Node.prototype`
 * getter (`_readNodeName`), so under happy-dom it sees every element as unnamed,
 * calls it disallowed and **unwraps** it: `<p>hi</p>` sanitises to `hi`, silently,
 * and a `javascript:` href survives inside a hoisted child. The app runs in
 * WebKit, where the base getter already returns the right name, so this is
 * test-environment repair, not app behaviour.
 */
const nodeName = Object.getOwnPropertyDescriptor(Node.prototype, "nodeName");
if (nodeName?.get !== undefined) {
	const read = nodeName.get;
	/** The nearest `nodeName` getter above `node`, memoised per prototype. */
	const nearest = new WeakMap<object, ((this: Node) => unknown) | null>();
	const getterFor = (proto: object | null): ((this: Node) => unknown) | null => {
		if (proto === null || proto === Node.prototype) return null;
		const cached = nearest.get(proto);
		if (cached !== undefined) return cached;
		const descriptor = Object.getOwnPropertyDescriptor(proto, "nodeName");
		const found = descriptor?.get ?? getterFor(Object.getPrototypeOf(proto));
		nearest.set(proto, found);
		return found;
	};
	Object.defineProperty(Node.prototype, "nodeName", {
		...nodeName,
		get(this: Node): unknown {
			const getter = getterFor(Object.getPrototypeOf(this));
			return getter === null ? read.call(this) : getter.call(this);
		},
	});
}

/**
 * The suite's polling budget (M1.4d), applied once here so no test file carries a
 * number of its own — the constants and their reasoning are in `src/test/budget`.
 *
 * `@testing-library/react` is imported **dynamically**, after registration:
 * `@testing-library/dom` binds its `screen` at module load
 * (`typeof document !== "undefined" && document.body`), so a static import would
 * hoist above `GlobalRegistrator.register()` and leave every test's `screen`
 * unbound for the whole run. `configure` only writes the shared config object,
 * which each wait reads when it runs.
 */
const { configure } = await import("@testing-library/react");
configure({ asyncUtilTimeout: POLL_TIMEOUT_MS });
