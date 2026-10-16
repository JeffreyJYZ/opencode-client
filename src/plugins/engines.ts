/**
 * The `engines.app` range check (spec 040 §Manifest). Only what the spec names is
 * understood: `*` accepts anything, and `>=x.y.z` requires at least that version.
 * Any other range is one the host cannot honour, so it is **refused** rather than
 * silently accepted — a plugin that asked for something unknown has not been told
 * it will work.
 */
export const ENGINES_ANY = "*";

const AT_LEAST = ">=";
const VERSION_SHAPE = /^\d+(\.\d+)*$/;

/** The numeric parts of `version`, or `null` when it is not a dotted number list. */
function parts(version: string): number[] | null {
	if (!VERSION_SHAPE.test(version)) return null;
	return version.split(".").map(Number);
}

/** Whether `appVersion` satisfies `range`; a range the host cannot read is `false`. */
export function satisfiesEngines(range: string, appVersion: string): boolean {
	const wanted = range.trim();
	if (wanted === ENGINES_ANY) return true;
	if (!wanted.startsWith(AT_LEAST)) return false;
	const floor = parts(wanted.slice(AT_LEAST.length).trim());
	const actual = parts(appVersion);
	if (floor === null || actual === null) return false;
	const length = Math.max(floor.length, actual.length);
	for (let index = 0; index < length; index++) {
		const left = floor[index] ?? 0;
		const right = actual[index] ?? 0;
		if (left !== right) return right > left;
	}
	return true;
}
