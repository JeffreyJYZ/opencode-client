import type { AgentInfo, ModelInfo, ModelRef } from "@opencode/client";
import { COMPOSER_CONTROL_STYLE, COMPOSER_LINE_STYLE } from "@/components/composer/composerStyles";
import {
	COMPOSER_AGENT_LABEL,
	COMPOSER_IDENTITY_SEPARATOR,
	COMPOSER_MODEL_LABEL,
	COMPOSER_THINKING_LABEL,
	COMPOSER_THINKING_OFF,
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
	// so both the key, the value and this lookup use the pair (see `composerReads.ts`).
	const current = props.models.find(
		(model) => model.providerID === props.model?.providerID && model.id === props.model?.id,
	);
	const variants = current?.variants ?? [];
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
								{model.name}
							</option>
						))}
					</select>
				</label>
				{COMPOSER_IDENTITY_SEPARATOR}
				<button
					type="button"
					style={COMPOSER_CONTROL_STYLE}
					disabled={variants.length === 0}
					title={COMPOSER_THINKING_LABEL}
					onClick={() => {
						// The thinking mode is the model's own variant: cycling it is the only
						// switch the pinned server exposes for it (`session.switchModel`).
						const at = variants.findIndex((variant) => variant.id === props.variant);
						const next = variants[(at + 1) % variants.length];
						props.onVariant(next === undefined ? null : next.id);
					}}
				>
					{`${COMPOSER_THINKING_LABEL}: ${
						props.variant === null ? COMPOSER_THINKING_OFF : COMPOSER_THINKING_ON
					}`}
				</button>
			</span>
		</div>
	);
}
