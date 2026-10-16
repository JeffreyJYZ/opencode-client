import { useState } from "react";
import { INPUT_STYLE, LABEL_STYLE } from "@/constants/settingsUi";
import {
	FACE_DATALIST_ID,
	FACE_REFUSAL_ID,
	FACE_REFUSED_TEXT,
	TYPOGRAPHY_FIELD_ID,
	TYPOGRAPHY_ROLE_LABEL,
} from "@/constants/typography";
import { faceNames, resolveFace } from "@/theme/faces";
import type { FontRole } from "@/theme/fonts";

/**
 * The face picker (spec 030 §Face picker, M3.3): the role's family control.
 *
 * A combobox over the names this app can resolve, not a free-text field. A value
 * that resolves — canonical name or the cask's alias, any case — is committed
 * and canonicalised, because two names for one face would make the blob lie
 * about what is on screen. A value that does not resolve is **refused**: nothing
 * is written, and the field says so, because the alternative (storing it) makes
 * a misspelt family fall through the stack and look applied.
 *
 * The draft is local and derived from the stored value rather than synced into
 * it, so an outside change (the section's reset) wins without an effect: while
 * `from` still matches the store, the draft is what the user is typing; the
 * moment the store moves, the store is what is shown.
 */

/** The refusal notice's accent; the token, so no component holds a colour. */
const REFUSAL_STYLE = { color: "var(--oc-danger)" };

/** The refusal is a status, not an error on the field: the app is still usable. */
const REFUSAL_ROLE = "status";

export function FacePicker({
	role,
	value,
	onChange,
}: {
	readonly role: FontRole;
	readonly value: string;
	readonly onChange: (family: string) => void;
}) {
	const [draft, setDraft] = useState({ text: value, from: value });
	const [refused, setRefused] = useState<string | null>(null);
	const shown = draft.from === value ? draft.text : value;
	const id = TYPOGRAPHY_FIELD_ID[role].family;
	const refusalId = FACE_REFUSAL_ID[role];

	function commit(text: string): void {
		const face = resolveFace(role, text);
		if (face === null) {
			setRefused(text);
			return;
		}
		setRefused(null);
		setDraft({ text: face.family, from: face.family });
		if (face.family !== value) onChange(face.family);
	}

	return (
		<div style={LABEL_STYLE}>
			<label htmlFor={id}>{TYPOGRAPHY_ROLE_LABEL[role].family}</label>
			<input
				id={id}
				list={FACE_DATALIST_ID[role]}
				style={INPUT_STYLE}
				value={shown}
				autoComplete="off"
				spellCheck={false}
				aria-invalid={refused !== null}
				aria-describedby={refused === null ? undefined : refusalId}
				onChange={(event) => {
					setDraft({ text: event.target.value, from: value });
					setRefused(null);
				}}
				// Commit on leave or Enter: committing per keystroke would refuse
				// every prefix of a name the user is still typing.
				onBlur={(event) => {
					commit(event.target.value);
				}}
				onKeyDown={(event) => {
					if (event.key !== "Enter") return;
					event.preventDefault();
					commit(event.currentTarget.value);
				}}
			/>
			<datalist id={FACE_DATALIST_ID[role]}>
				{faceNames(role).map((name) => (
					<option key={name} value={name} />
				))}
			</datalist>
			{refused === null ? null : (
				<span id={refusalId} role={REFUSAL_ROLE} style={REFUSAL_STYLE}>
					{FACE_REFUSED_TEXT(refused)}
				</span>
			)}
		</div>
	);
}
