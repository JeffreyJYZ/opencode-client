import { COMPOSER_FILE_SCHEME } from "@/constants/composer";
import { COMPOSER_IMAGE_MIME } from "@/constants/preview";
import type { Attachment } from "@/session/promptTypes";

/**
 * Which attachments preview, and what the page shows them from (spec 020 §Prompt
 * box: "Images preview inline above the input", M2.24). All pure: the extension
 * decides the type, the uri becomes the absolute path the shell reads, and the
 * base64 the shell returns becomes the `data:` url the policy already admits
 * (`csp.rs::IMG_SRC`). Nothing here touches the DOM or the shell.
 */

/** One preview the strip draws: the `data:` url, or `null` when the read refused. */
export type ImagePreview = {
	readonly uri: string;
	readonly name: string;
	readonly src: string | null;
};

/** The lower-case extension of a path or name, without its dot, or `""`. */
function extensionOf(value: string): string {
	const clean = (value.split(/[?#]/)[0] ?? "").split("/").at(-1) ?? "";
	const dot = clean.lastIndexOf(".");
	return dot === -1 ? "" : clean.slice(dot + 1).toLowerCase();
}

/**
 * The image mime an attachment previews as, or `null` when it is not an image.
 * The name is checked before the uri: a drop names the file, and a uri that lost
 * its extension (a query, a fragment) still previews.
 */
export function imageMimeOf(attachment: Attachment): string | null {
	const byName = extensionOf(attachment.name ?? "");
	const byUri = extensionOf(attachment.uri);
	return COMPOSER_IMAGE_MIME[byName] ?? COMPOSER_IMAGE_MIME[byUri] ?? null;
}

/** `value` percent-decoded, or `value` itself when it is not a valid escape. */
function decoded(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/**
 * The absolute path under `uri`, or `null` when there is none.
 *
 * A drop may hand a `file://` url (the DOM route) or a plain path (the shell's own
 * Finder drop, M5.2); only an absolute path is one the shell can read, and the
 * shell refuses everything else anyway.
 */
export function previewPathOf(uri: string): string | null {
	const trimmed = uri.trim();
	const path = trimmed.startsWith(COMPOSER_FILE_SCHEME)
		? decoded(trimmed.slice(COMPOSER_FILE_SCHEME.length))
		: trimmed;
	return path.startsWith("/") ? path : null;
}

/** The `data:` url for the base64 payload the shell read. */
export function dataUrlOf(mime: string, base64: string): string {
	return `data:${mime};base64,${base64}`;
}
