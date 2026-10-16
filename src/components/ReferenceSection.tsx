import type { CSSProperties } from "react";
import {
	REFERENCE_CAPABILITIES_LABEL,
	REFERENCE_CONSENT_MARK,
	REFERENCE_ENFORCED_MARK,
	REFERENCE_ENTRY_LABEL,
	REFERENCE_ENTRY_NOTE,
	REFERENCE_ENTRY_ROW,
	REFERENCE_GENERATED_NOTE,
	REFERENCE_LOCKED_MARK,
	REFERENCE_MEMBERS_NOTE,
	REFERENCE_NOT_ALLOWED,
	REFERENCE_NOT_ALLOWED_LABEL,
	REFERENCE_REGISTRIES_LABEL,
	REFERENCE_SECTION,
	REFERENCE_SERVICES_LABEL,
	REFERENCE_SLOTS_LABEL,
	REFERENCE_VERSION_LINE,
} from "@/constants/reference";
import { SECTION_STYLE } from "@/constants/settingsUi";
import { REFERENCE } from "@/docs/reference.generated";

/**
 * The in-app API reference (M4.8, spec 040 §Build, install, develop), rendered as a
 * settings section so the plugin author who is about to write a plugin finds it
 * beside the manager, and the command palette lists it with the other sections.
 *
 * It renders the **generated** data and nothing else — no list here is typed by
 * hand, so a registry or a slot added to the code appears without an edit to this
 * file. Its own words are `constants/reference.ts`.
 */

const NOTE_STYLE: CSSProperties = { color: "var(--oc-text-muted)", margin: 0 };
const CODE_STYLE: CSSProperties = { color: "var(--oc-text)" };
const LIST_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
	margin: 0,
	paddingLeft: "var(--oc-space-4)",
};

type Member = { readonly name: string; readonly signature: string };

function Members({ members }: { readonly members: readonly Member[] }) {
	return (
		<ul style={LIST_STYLE}>
			{members.map((member) => (
				<li key={member.name}>
					<code style={CODE_STYLE}>{member.name}</code>{" "}
					<span style={NOTE_STYLE}>{member.signature}</span>
				</li>
			))}
		</ul>
	);
}

/** The entry-file contract's rows: the labels are copy, every value is the code's. */
function entryRows(): ReadonlyArray<{ label: string; value: string }> {
	const { entry } = REFERENCE;
	return [
		{
			label: REFERENCE_ENTRY_ROW.source,
			value: `${entry.sourceDir}/<id>/${entry.sourceNames.join(" | ")}`,
		},
		{ label: REFERENCE_ENTRY_ROW.built, value: `${entry.outDir}/<id>/${entry.defaultName}` },
		{ label: REFERENCE_ENTRY_ROW.globals, value: Object.values(entry.globals).join(", ") },
		{ label: REFERENCE_ENTRY_ROW.rewritten, value: entry.rewritten.join(", ") },
		{ label: REFERENCE_ENTRY_ROW.refused, value: entry.refused.join(", ") },
		{ label: REFERENCE_ENTRY_ROW.dataDir, value: `${entry.dataDir}/<id>/` },
		{ label: REFERENCE_ENTRY_ROW.cap, value: `${String(entry.dataMaxBytes)} bytes per plugin` },
		{ label: REFERENCE_ENTRY_ROW.storageKey, value: entry.storageKeyPattern },
		{ label: REFERENCE_ENTRY_ROW.separator, value: entry.storageSeparator },
	];
}

export function ReferenceSection() {
	const registries = REFERENCE.host.filter((member) => member.kind === "registry");
	const services = REFERENCE.host.filter((member) => member.kind === "service");
	return (
		<section style={SECTION_STYLE} data-section={REFERENCE_SECTION}>
			<p style={NOTE_STYLE}>
				{REFERENCE_VERSION_LINE(REFERENCE.apiVersion, REFERENCE.appVersion)}
			</p>
			<p style={NOTE_STYLE} data-reference-generated>
				{REFERENCE_GENERATED_NOTE}
			</p>

			<h3>{REFERENCE_NOT_ALLOWED_LABEL}</h3>
			<ul style={LIST_STYLE}>
				<li>
					{REFERENCE_NOT_ALLOWED.lockedAreas(
						REFERENCE.lockedAreas,
						REFERENCE.lockedAreaFault,
					)}
				</li>
				<li>{REFERENCE_NOT_ALLOWED.managerSection(REFERENCE.managerSection)}</li>
				<li>{REFERENCE_NOT_ALLOWED.sandbox}</li>
			</ul>

			<h3>{REFERENCE_REGISTRIES_LABEL}</h3>
			<p style={NOTE_STYLE}>{REFERENCE_MEMBERS_NOTE}</p>
			<Members members={registries} />

			<h3>{REFERENCE_SERVICES_LABEL}</h3>
			<Members members={services} />

			<h3>{REFERENCE_SLOTS_LABEL}</h3>
			<ul style={LIST_STYLE} data-reference-slots>
				{REFERENCE.slots.map((slot) => (
					<li key={slot.name}>
						<code style={CODE_STYLE}>{slot.name}</code>
						{slot.locked ? ` — ${REFERENCE_LOCKED_MARK}` : ""}
					</li>
				))}
			</ul>

			<h3>{REFERENCE_CAPABILITIES_LABEL}</h3>
			<ul style={LIST_STYLE}>
				{REFERENCE.capabilities.map((capability) => (
					<li key={capability.label}>
						<code style={CODE_STYLE}>{capability.label}</code>
						{` — ${capability.enforced ? REFERENCE_ENFORCED_MARK : REFERENCE_CONSENT_MARK}`}
					</li>
				))}
			</ul>

			<h3>{REFERENCE_ENTRY_LABEL}</h3>
			<p style={NOTE_STYLE}>{REFERENCE_ENTRY_NOTE}</p>
			<ul style={LIST_STYLE}>
				{entryRows().map((row) => (
					<li key={row.label}>
						<span style={NOTE_STYLE}>{`${row.label}: `}</span>
						<code style={CODE_STYLE}>{row.value}</code>
					</li>
				))}
			</ul>
		</section>
	);
}
