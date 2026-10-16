import type { FormField } from "@opencode/client";
import { COMPOSER_CONTROL_STYLE } from "@/components/composer/composerStyles";
import {
	DOCK_OPTION_SELECTED_STYLE,
	DOCK_OPTION_STYLE,
	DOCK_TEXT_STYLE,
} from "@/components/composer/dockStyles";
import { openExternal } from "@/components/transcript/externalLink";
import { DOCK_FORM_TOGGLE_LABEL } from "@/constants/composer";

/**
 * One question form's field (spec 020 §Docks: "options as a list with a selected
 * row"). Every kind the server can send has a control here, and one that cannot be
 * answered in this app — `external` — says so with a link instead of pretending to
 * be an input, which is also why it is not required for the form to submit.
 *
 * The value each control produces is the field's **own answer type**: a string, a
 * number, a boolean, or the selected option keys — the shape `form.reply` takes.
 */

export type FormValue = string | number | boolean | readonly string[];

export type QuestionFieldProps = {
	readonly field: FormField;
	readonly value: FormValue | undefined;
	readonly option: number;
	readonly onValue: (value: FormValue) => void;
	readonly onOption: (index: number) => void;
};

export function QuestionField(props: QuestionFieldProps) {
	const { field } = props;
	if (field.type === "boolean") {
		return (
			<label style={DOCK_TEXT_STYLE}>
				<input
					type="checkbox"
					checked={props.value === true}
					onChange={(event) => props.onValue(event.target.checked)}
				/>
				{field.title ?? field.key}
			</label>
		);
	}
	if (field.type === "multiselect") {
		const selected = Array.isArray(props.value) ? props.value : [];
		return (
			<div role="listbox" aria-label={field.title ?? field.key} aria-multiselectable>
				{field.options.map((option, index) => {
					const chosen = selected.includes(option.value);
					return (
						// The palette's own row pattern: an option outside the Tab order,
						// whose keys the dock's container owns.
						<button
							key={option.value}
							type="button"
							tabIndex={-1}
							role="option"
							aria-selected={chosen}
							data-selected={chosen}
							style={
								index === props.option
									? DOCK_OPTION_SELECTED_STYLE
									: DOCK_OPTION_STYLE
							}
							onMouseEnter={() => props.onOption(index)}
							onClick={() => toggleOption(props, option.value, selected)}
						>
							{chosen ? `${DOCK_FORM_TOGGLE_LABEL} ✓ ` : ""}
							{option.label}
						</button>
					);
				})}
			</div>
		);
	}
	if (field.type === "external") {
		// Never navigate the webview (M2.3): the click goes to the host, not the link.
		return (
			<a
				href={field.url}
				style={DOCK_TEXT_STYLE}
				onClick={(event) => {
					event.preventDefault();
					openExternal(field.url);
				}}
			>
				{field.title ?? field.url}
			</a>
		);
	}
	const numeric = field.type === "number" || field.type === "integer";
	return (
		<input
			type={numeric ? "number" : "text"}
			aria-label={field.title ?? field.key}
			placeholder={field.type === "string" ? field.placeholder : undefined}
			style={COMPOSER_CONTROL_STYLE}
			value={
				typeof props.value === "string" || typeof props.value === "number"
					? props.value
					: ""
			}
			onChange={(event) =>
				props.onValue(numeric ? Number(event.target.value) : event.target.value)
			}
		/>
	);
}

function toggleOption(props: QuestionFieldProps, key: string, selected: readonly string[]): void {
	props.onValue(
		selected.includes(key) ? selected.filter((value) => value !== key) : [...selected, key],
	);
}
