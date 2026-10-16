import { PermissionDock } from "@/components/composer/PermissionDock";
import { PromptBox } from "@/components/composer/PromptBox";
import { QuestionDock } from "@/components/composer/QuestionDock";
import { useDocks } from "@/session/useDocks";

/**
 * The session's input slot (spec 020 §Regions: "prompt box, pinned below the
 * transcript, never scrolls; a dock (permission or question form) replaces it while
 * one is pending").
 *
 * **A dock replaces the box, it does not float over it.** That is requirement 6 by
 * construction: while a permission or a question is pending there is no prompt box to
 * type into, so no prompt can be silently accepted and then refused, and the dock
 * always has the slot's full attention.
 */

export type SessionComposerProps = {
	readonly sessionID: string;
	/** The store's own running flag for this session (`transcript.running`). */
	readonly running: boolean;
};

export function SessionComposer({ sessionID, running }: SessionComposerProps) {
	const docks = useDocks(sessionID);
	if (docks.permission !== null) {
		return (
			<PermissionDock
				permission={docks.permission}
				more={docks.more}
				error={docks.error}
				busy={docks.busy}
				onDecide={(decision) => void docks.decide(decision)}
			/>
		);
	}
	if (docks.form !== null) {
		return (
			<QuestionDock
				form={docks.form}
				error={docks.error}
				busy={docks.busy}
				onAnswer={(answer) => void docks.answer(answer)}
				onCancel={() => void docks.dismiss()}
			/>
		);
	}
	return <PromptBox sessionID={sessionID} running={running} />;
}
