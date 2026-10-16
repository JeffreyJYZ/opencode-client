import { createCollection } from "@/plugins/collection";
import { type Disposable, REFUSED } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";

/**
 * The command registry (spec 040 §The host, `commands.register`): a palette
 * command, optionally keybound. A refused contribution is inert — nothing is
 * listed, one `PluginFault` is recorded, nothing throws (spec 040 §The host).
 *
 * The palette reads this list through `listCommands`/`subscribeToCommands`
 * (M4.11: `usePaletteData` subscribes and `CommandPalette` runs a row through
 * `runCommand`), beside the server's own `command.list`; a command's `keybinding`
 * is the seam the keymap fills, not a binding this registry installs.
 */

export type CommandContribution = {
	readonly id: string;
	readonly title: string;
	readonly run: () => void;
	readonly keybinding?: string;
};

const commands = createCollection<CommandContribution>({ ordered: false, onChange: notify });
const listeners = new Set<() => void>();

function notify(): void {
	for (const listener of listeners) listener();
}

function refuse(reason: FaultReason, subject: string, message: string): Disposable {
	recordFault({ area: FAULT_AREAS.commands, reason, subject, message });
	return REFUSED;
}

function subjectOf(contribution: CommandContribution): string {
	const id = contribution?.id;
	return typeof id === "string" ? id : "?";
}

function problemWith(contribution: CommandContribution): string | null {
	if (typeof contribution?.id !== "string" || contribution.id.trim() === "") return "an empty id";
	if (typeof contribution.title !== "string" || contribution.title.trim() === "")
		return "an empty title";
	if (typeof contribution.run !== "function") return "no run function";
	if (contribution.keybinding !== undefined && typeof contribution.keybinding !== "string") {
		return "a non-string keybinding";
	}
	return null;
}

/** Register one command. Synchronous; the handle removes exactly this entry. */
export function registerCommand(contribution: CommandContribution): Disposable {
	const problem = problemWith(contribution);
	if (problem !== null) {
		const subject = subjectOf(contribution);
		return refuse(
			FAULT_REASONS.malformedEntry,
			subject,
			`the command "${subject}" has ${problem}`,
		);
	}
	if (commands.has(contribution.id)) {
		return refuse(
			FAULT_REASONS.duplicateId,
			contribution.id,
			`the command id "${contribution.id}" is already registered`,
		);
	}
	return commands.set(contribution);
}

export function listCommands(): readonly CommandContribution[] {
	return commands.list();
}

export function getCommand(id: string): CommandContribution | undefined {
	return commands.get(id);
}

/** Run one command by id. An unknown id is refused with a fault, never a throw. */
export function runCommand(id: string): boolean {
	const command = commands.get(id);
	if (command === undefined) {
		recordFault({
			area: FAULT_AREAS.commands,
			reason: FAULT_REASONS.unknownId,
			subject: id,
			message: `no command is registered under "${id}"`,
		});
		return false;
	}
	command.run();
	return true;
}

export function subscribeToCommands(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The tests' reset; production never calls it. */
export function resetCommands(): void {
	commands.replaceAll([]);
}
