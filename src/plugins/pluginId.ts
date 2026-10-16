/**
 * The plugin id rule (spec 040 §Manifest): **one pattern**, mirrored by `safe_id`
 * in `src-tauri/src/lib.rs`, and `plugin-id-cases.json` is the corpus both
 * languages are checked against — so a change to either side's rule fails the
 * other's test (`bun test` / `cargo test`).
 */

/** One path component: the allowlisted characters, with no leading or trailing `.`. */
export const PLUGIN_ID_PATTERN = /^[A-Za-z0-9_-]([A-Za-z0-9._-]*[A-Za-z0-9_-])?$/;

/** Whether `value` is an id Rust's `safe_id` also accepts (`plugin-id-cases.json`). */
export function isPluginId(value: string): boolean {
	return PLUGIN_ID_PATTERN.test(value);
}
