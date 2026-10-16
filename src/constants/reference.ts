/**
 * The in-app API reference's copy (M4.8, spec 040 §Build, install, develop). The
 * **data** is generated (`src/docs/reference.generated.ts`, read from the SDK types
 * and the code's own tables by `scripts/generate-reference.ts`); this file holds
 * only the words around it, so a change to the page's wording never touches the
 * generator and a change to the code never touches the wording.
 */

/** The section's `data-section` marker, like its neighbours'. */
export const REFERENCE_SECTION = "reference";

export const REFERENCE_TITLE = "Plugin API";

/** Who wrote the data below, and why it cannot rot. */
export const REFERENCE_GENERATED_NOTE =
	"Read out of the code, not typed by hand: scripts/generate-reference.ts takes the Host type's own members from src/plugins/sdk.ts and every slot, capability and entry-file table from the modules that declare them, and a test fails when this page and the generator disagree.";

export const REFERENCE_VERSION_LINE = (api: string, app: string): string =>
	`Host API ${api} — the app built against it is ${app}. A manifest naming another major is refused.`;

export const REFERENCE_REGISTRIES_LABEL = "Registries";
export const REFERENCE_SERVICES_LABEL = "Services";
export const REFERENCE_SLOTS_LABEL = "Slots";
export const REFERENCE_CAPABILITIES_LABEL = "Capabilities";
export const REFERENCE_ENTRY_LABEL = "The built entry";
export const REFERENCE_NOT_ALLOWED_LABEL = "What a plugin may not do";

export const REFERENCE_MEMBERS_NOTE =
	"A registry registers synchronously and hands back a Disposable that retracts exactly one contribution; a service returns promises. Every name and signature below is the host API's own.";

export const REFERENCE_LOCKED_MARK = "locked";
export const REFERENCE_ENFORCED_MARK = "enforced";
export const REFERENCE_CONSENT_MARK = "consent label";
export const REFERENCE_NONE = "none";

/** The three rules a plugin author has to know, each naming what the code does. */
export const REFERENCE_NOT_ALLOWED = {
	lockedAreas: (areas: readonly string[], reason: string): string =>
		`Contribute to ${areas.join(" or ")}: these are the two locked areas. A contribution there is inert — nothing renders — and is recorded as a "${reason}" fault.`,
	managerSection: (id: string): string =>
		`Replace a built-in settings section. The plugin manager's own is "${id}", and it is the only way back to a plugin's switch, so a plugin may not take it.`,
	sandbox:
		"Assume a boundary. Capabilities are consent labels, not a sandbox (spec 040 §Capabilities and trust): only plugin-data is enforced, by path scoping in the shell's safe_id, and a plugin runs in the app's process with the app's reach. Read the source — there is no untrusted tier.",
};

/** The labels of the entry-file contract's rows; the values come from the code. */
export const REFERENCE_ENTRY_ROW = {
	source: "Source (committed)",
	built: "Built entry",
	globals: "Host globals",
	rewritten: "Rewritten imports",
	refused: "Refused imports",
	dataDir: "Data directory",
	cap: "Storage cap",
	storageKey: "Storage keys",
	separator: "Namespace separator",
} as const;

export const REFERENCE_ENTRY_NOTE =
	"A built entry must import nothing: the host raises its API and React as globals immediately before the import, so a plugin uses the app's own React rather than a second copy.";
