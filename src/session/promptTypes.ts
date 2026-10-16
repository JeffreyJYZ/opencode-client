import type { COMPOSER_MENTION_KIND } from "@/constants/composer";

/**
 * The composer's own types (M2.5), split from the builder so both the seam and the
 * components name the same shapes without a cycle: `promptTypes` ← `promptPayload`
 * ← `actions` ← the hooks and components.
 */

/** A mention's kind — the three `@` sources spec 020 §Prompt box names. */
export type MentionKind = keyof typeof COMPOSER_MENTION_KIND;

/**
 * One structured mention (spec 020 §Prompt box): the span in the text, and the
 * server-facing value it resolves to — a path, an agent name, or a skill id.
 */
export type ComposerMention = {
	readonly kind: MentionKind;
	readonly start: number;
	readonly end: number;
	readonly text: string;
	readonly value: string;
};

/** One attachment: a local path the server can read. Nothing else is sendable. */
export type Attachment = {
	readonly uri: string;
	readonly name?: string;
	/** `false` when the entry has no path yet — it is refused before the prompt leaves. */
	readonly sendable: boolean;
};

/** Everything one prompt carries, whatever way it was sent from. */
export type PromptRequest = {
	readonly sessionID: string;
	readonly text: string;
	readonly attachments: readonly Attachment[];
	readonly mentions: readonly ComposerMention[];
};
