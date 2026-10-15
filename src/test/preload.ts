import { GlobalRegistrator } from "@happy-dom/global-registrator";

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
