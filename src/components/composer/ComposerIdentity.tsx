import type { AgentInfo, ModelInfo, ModelRef } from "@opencode/client";
import { COMPOSER_CONTROL_STYLE, COMPOSER_LINE_STYLE } from "@/components/composer/composerStyles";
import {
	COMPOSER_AGENT_LABEL,
	COMPOSER_IDENTITY_SEPARATOR,
	COMPOSER_MODEL_LABEL,
	COMPOSER_THINKING_DISABLED,
	COMPOSER_THINKING_LABEL,
	COMPOSER_THINKING_OFF,
	COMPOSER_THINKING_OFF_VARIANTS,
	COMPOSER_THINKING_ON,
} from "@/constants/composer";
import { modelOptionKey } from "@/session/composerReads";

/**
 * The identity line (spec 020 §Prompt box: "agent · model · thinking mode", each a
 * clickable control). The values are the **session's own** (`session.get`) and the
 * choices are `agent.list` / `model.list`; picking one calls the seam's
 * `session.switchAgent` / `session.switchModel`, so the line is a control, not a
 * label.
 *
 * A native `<select>` on purpose: it is keyboard-complete for free (arrow, type,
 * Enter) and a webview renders it as the platform's own menu — the right shape for
 * a control whose job is "pick one of a known list", and one that cannot invent a
 * focus trap of its own next to the composer's menu.
 *
 * The thinking control is a **binary toggle**, not a cycle over `model.variants`
 * (M2.14): *off* selects the variant the model itself names for thinking off
 * (`COMPOSER_THINKING_OFF_VARIANTS`), *on* clears the override; a model with no such
 * variant shows the control disabled with the reason, so effort budgets
 * (`low`/`high`/`max`) are never smuggled through it.
 */

export type ComposerIdentityProps = {
	readonly agent: string | null;
	/** The session's model (`session.get`): a `ModelRef`, so the picker knows the provider. */
	readonly model: ModelRef | null;
	readonly variant: string | null;
	readonly agents: readonly AgentInfo[];
	readonly models: readonly ModelInfo[];
	readonly onAgent: (agent: string) => void;
	readonly onModel: (model: ModelInfo) => void;
	readonly onVariant: (variant: string | null) => void;
};

export function ComposerIdentity(props: ComposerIdentityProps) {
	// `modelOptionKey` is `providerID/id`: an `id` alone is not unique across providers,
	// so the key, the value, this lookup **and the option's own text** all use the pair
	// (see `composerReads.ts`). Key/value/text are one string on purpose — the friendly
	// `name` is dropped, because a bare name cannot tell two providers' same `id` apart.
	const current = props.models.find(
		(model) => model.providerID === props.model?.providerID && model.id === props.model?.id,
	);
	const offVariant = current?.variants.find((variant) =>
		COMPOSER_THINKING_OFF_VARIANTS.includes(variant.id),
	);
	// *off* is the variant the model itself names for thinking off; anything else —
	// including no override at all — is *on*.
	const thinkingOff =
		props.variant !== null && COMPOSER_THINKING_OFF_VARIANTS.includes(props.variant);
	return (
		<div style={COMPOSER_LINE_STYLE}>
			<span>
				<label>
					{COMPOSER_AGENT_LABEL}
					<select
						aria-label={COMPOSER_AGENT_LABEL}
						style={COMPOSER_CONTROL_STYLE}
						value={props.agent ?? ""}
						onChange={(event) => props.onAgent(event.target.value)}
					>
						<option value="">—</option>
						{props.agents.map((agent) => (
							// Key, value and what a switch sends are all `agent.id`. The
							// session's own `agent` (`session.get`) is an id, and the server
							// resolves a switch with `Agent.select(id)` (`ID.make(agent)` into
							// the agent map), so the id is the field the wire means; `name` is
							// only the label. Keying by one field and valuing by another is
							// incoherent either way: a shared `id` collides in the key, and a
							// shared `name` gives two options one value, so the second entry
							// cannot be chosen at all.
							<option key={agent.id} value={agent.id}>
								{agent.name}
							</option>
						))}
					</select>
				</label>
				{COMPOSER_IDENTITY_SEPARATOR}
				<label>
					{COMPOSER_MODEL_LABEL}
					<select
						aria-label={COMPOSER_MODEL_LABEL}
						style={COMPOSER_CONTROL_STYLE}
						value={props.model === null ? "" : modelOptionKey(props.model)}
						onChange={(event) => {
							const chosen = props.models.find(
								(model) => modelOptionKey(model) === event.target.value,
							);
							if (chosen !== undefined) props.onModel(chosen);
						}}
					>
						<option value="">—</option>
						{props.models.map((model) => (
							<option key={modelOptionKey(model)} value={modelOptionKey(model)}>
								{modelOptionKey(model)}
							</option>
						))}
					</select>
				</label>
				{COMPOSER_IDENTITY_SEPARATOR}
				<button
					type="button"
					style={COMPOSER_CONTROL_STYLE}
					disabled={offVariant === undefined}
					title={
						offVariant === undefined
							? COMPOSER_THINKING_DISABLED
							: COMPOSER_THINKING_LABEL
					}
					onClick={() => {
						// A binary toggle through the variant the model itself names for thinking
						// off (`off`/`none`): *off* selects that variant, *on* clears the override
						// so the model's own default applies. Never a cycle over `variants` —
						// those are effort budgets (`low`/`high`/`max`), which this control is not.
						if (offVariant === undefined) return;
						props.onVariant(thinkingOff ? null : offVariant.id);
					}}
				>
					{`${COMPOSER_THINKING_LABEL}: ${
						thinkingOff ? COMPOSER_THINKING_OFF : COMPOSER_THINKING_ON
					}`}
				</button>
			</span>
		</div>
	);
}
