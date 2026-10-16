import { useRef } from "react";
import { PromptBoxView } from "@/components/composer/PromptBoxView";
import { useComposerDrop } from "@/components/composer/useComposerDrop";
import { useComposerEdits } from "@/components/composer/useComposerEdits";
import { useComposerMenu } from "@/components/composer/useComposerMenu";
import { useComposerData } from "@/session/useComposerData";
import { useSessionIdentity } from "@/session/useSessionIdentity";

/**
 * The prompt box (spec 020 §Prompt box, row M2.5): three hooks and one view. The
 * edits own the text, the data owns the sources, the menu owns the highlight and the
 * keys, and `PromptBoxView` draws what they say.
 *
 * The rules are not in the JSX on purpose — the send path is `actions.ts`, the
 * keyboard order is `composerKeys.ts`, and the payload shape is
 * `promptPayload.ts` — so no rule here can drift from the one the tests hold.
 */

export type PromptBoxProps = {
	readonly sessionID: string;
	/** The store's own running flag (`transcript.running`) — never a local copy. */
	readonly running: boolean;
};

export function PromptBox({ sessionID, running }: PromptBoxProps) {
	const identity = useSessionIdentity(sessionID);
	const commandNames = useRef<readonly string[]>([]);
	const edits = useComposerEdits(sessionID, commandNames);
	// The shell's own drop (M5.2) appends through the same path the DOM drop uses.
	useComposerDrop(edits.attachFiles);
	const data = useComposerData(sessionID, edits.text, edits.caret, identity.directory);
	commandNames.current = data.commands.map((command) => command.name);
	const menu = useComposerMenu({
		token: data.token,
		entries: data.entries,
		loadingCommands: data.loadingCommands,
		running,
		onApply: (entry) => {
			if (data.token !== null) edits.applyEntry(entry, data.token);
		},
		onSend: () => void edits.trySend(),
		onInterrupt: () => void edits.interrupt(),
	});

	return (
		<PromptBoxView
			running={running}
			sending={edits.sending}
			error={edits.error}
			text={edits.text}
			areaRef={edits.areaRef}
			onText={(value, caret) => {
				edits.setText(value);
				edits.setCaret(caret);
			}}
			onCaret={edits.onCaret}
			onKeyDown={menu.onKeyDown}
			identity={{
				agent: identity.agent,
				// The whole ref, not just its id: the picker keys and values by the pair.
				model: identity.model,
				variant: identity.model?.variant ?? null,
				agents: data.agents,
				models: data.models,
				onAgent: (agent) => void identity.setAgent(agent),
				onModel: (model) =>
					void identity.setModel({ id: model.id, providerID: model.providerID }),
				onVariant: (variant) => {
					if (identity.model === null) return;
					void identity.setModel({
						id: identity.model.id,
						providerID: identity.model.providerID,
						...(variant === null ? {} : { variant }),
					});
				},
			}}
			entries={data.entries}
			active={menu.active}
			loadingCommands={data.loadingCommands}
			menuOpen={menu.visible}
			onPick={(entry) => {
				if (data.token !== null) edits.applyEntry(entry, data.token);
			}}
			onHover={menu.onHover}
			attachments={edits.attachments}
			onRemoveAttachment={edits.onRemoveAttachment}
			onDrop={edits.onDrop}
			onSend={() => void edits.trySend()}
			onInterrupt={() => void edits.interrupt()}
		/>
	);
}
