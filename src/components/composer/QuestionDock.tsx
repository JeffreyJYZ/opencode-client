import type { FormInfo } from "@opencode/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { COMPOSER_CONTROL_STYLE } from "@/components/composer/composerStyles";
import { DockFrame } from "@/components/composer/DockFrame";
import { DOCK_TEXT_STYLE } from "@/components/composer/dockStyles";
import { type FormValue, QuestionField } from "@/components/composer/QuestionField";
import {
	COMPOSER_DOCK_KEYS,
	DOCK_FORM_EMPTY,
	DOCK_FORM_NEXT_LABEL,
	DOCK_FORM_PROGRESS_SEPARATOR,
	DOCK_FORM_SUBMIT_LABEL,
	DOCK_LABEL,
} from "@/constants/composer";
import { moveIndex } from "@/session/composerMenuModel";

/**
 * The question dock (spec 020 §Docks, row M2.6): one question per step, a `Field N of
 * M` strip, options as a list with a selected row, and Submit on the last field.
 *
 * Keyboard-first, and the whole dock is answerable from the keyboard: focus lands on
 * the step's first control when it opens, arrows move a multi-select's highlighted
 * option without wrapping, `Enter` advances (or toggles that option), and **`Esc`
 * cancels the form** through the seam — so the asker is told nobody answered rather
 * than being left waiting with nothing on screen.
 */

export type QuestionDockProps = {
	readonly form: FormInfo;
	readonly error: string | null;
	readonly busy: boolean;
	readonly onAnswer: (answer: Readonly<Record<string, FormValue>>) => void;
	readonly onCancel: () => void;
};

export function QuestionDock({ form, error, busy, onAnswer, onCancel }: QuestionDockProps) {
	const fields = form.fields;
	const [index, setIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, FormValue>>({});
	const [option, setOption] = useState(0);
	const stepRef = useRef<HTMLFieldSetElement | null>(null);
	const field = fields[index];
	const options = field?.type === "multiselect" ? field.options : [];
	const last = index >= fields.length - 1;

	const advance = useCallback(() => {
		if (last) onAnswer(answers);
		else setIndex(index + 1);
	}, [answers, index, last, onAnswer]);

	// A new step is a new first control to land on: the dock stays mouse-free.
	useEffect(() => {
		void index;
		stepRef.current?.querySelector<HTMLElement>("input, a")?.focus();
	}, [index]);

	return (
		<DockFrame
			label={DOCK_LABEL.question}
			keys={COMPOSER_DOCK_KEYS.question}
			error={error}
			focusRef={stepRef}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					onCancel();
					return;
				}
				if (options.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
					event.preventDefault();
					setOption((current) =>
						moveIndex(current, options.length, event.key === "ArrowDown" ? 1 : -1),
					);
					return;
				}
				if (event.key !== "Enter") return;
				event.preventDefault();
				const chosen = options[option];
				if (chosen !== undefined && field !== undefined) {
					toggleOption(answers, field.key, chosen.value, setAnswers);
					return;
				}
				advance();
			}}
		>
			<h3 style={DOCK_TEXT_STYLE}>{form.title}</h3>
			{fields.length === 0 ? null : (
				<p style={DOCK_TEXT_STYLE}>
					{`${index + 1}${DOCK_FORM_PROGRESS_SEPARATOR}${fields.length}`}
				</p>
			)}
			{field === undefined ? (
				<p style={DOCK_TEXT_STYLE}>{DOCK_FORM_EMPTY}</p>
			) : (
				<>
					<p style={DOCK_TEXT_STYLE}>{field.title ?? field.key}</p>
					<QuestionField
						field={field}
						value={answers[field.key]}
						option={option}
						onValue={(value) =>
							setAnswers((current) => ({ ...current, [field.key]: value }))
						}
						onOption={setOption}
					/>
				</>
			)}
			<div>
				<button
					type="button"
					style={COMPOSER_CONTROL_STYLE}
					disabled={busy || field === undefined}
					onClick={advance}
				>
					{last ? DOCK_FORM_SUBMIT_LABEL : DOCK_FORM_NEXT_LABEL}
				</button>
			</div>
		</DockFrame>
	);
}

/** Toggle one option of a multi-select field's answer, keeping the server's array shape. */
function toggleOption(
	answers: Readonly<Record<string, FormValue>>,
	key: string,
	value: string,
	setAnswers: (update: (current: Record<string, FormValue>) => Record<string, FormValue>) => void,
): void {
	const current = answers[key];
	const selected = Array.isArray(current) ? current : [];
	setAnswers((all) => ({
		...all,
		[key]: selected.includes(value)
			? selected.filter((entry) => entry !== value)
			: [...selected, value],
	}));
}
