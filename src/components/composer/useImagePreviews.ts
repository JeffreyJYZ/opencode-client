import { useEffect, useMemo, useRef, useState } from "react";
import {
	dataUrlOf,
	type ImagePreview,
	imageMimeOf,
	previewPathOf,
} from "@/components/composer/attachmentImage";
import { readImageBase64 } from "@/native/readImage";
import type { Attachment } from "@/session/promptTypes";

/**
 * The attached images' previews (M2.24). Only images are asked for (spec 020
 * §Prompt box: "only images preview"); each read is the shell's (`readImageBase64`
 * — the web build has no shell and answers `null`), and a read that refuses leaves
 * a `null` source so the strip can say so rather than render nothing.
 *
 * `read` is injectable so the wiring is provable in the DOM-less suite, where no
 * shell exists; the app always passes the default. Results are cached by uri, so a
 * re-render never re-reads a file, and a settled entry keeps its answer.
 */
export function useImagePreviews(
	attachments: readonly Attachment[],
	read: (path: string) => Promise<string | null> = readImageBase64,
): readonly ImagePreview[] {
	const images = useMemo(
		() => attachments.filter((attachment) => imageMimeOf(attachment) !== null),
		[attachments],
	);
	const sources = useRef(new Map<string, string | null>());
	const [, settled] = useState(0);

	useEffect(() => {
		const pending = images.filter((attachment) => !sources.current.has(attachment.uri));
		if (pending.length === 0) return;
		let cancelled = false;
		void Promise.all(
			pending.map(async (attachment) => {
				const path = previewPathOf(attachment.uri);
				const mime = imageMimeOf(attachment);
				const base64 = path === null ? null : await read(path);
				sources.current.set(
					attachment.uri,
					base64 === null || mime === null ? null : dataUrlOf(mime, base64),
				);
			}),
		).then(() => {
			if (!cancelled) settled((count) => count + 1);
		});
		return () => {
			cancelled = true;
		};
	}, [images, read]);

	// An entry with no answer yet is left out: the strip draws nothing until the
	// shell's read lands, rather than flashing an empty frame.
	return images.flatMap((attachment) => {
		const src = sources.current.get(attachment.uri);
		if (src === undefined) return [];
		return [{ uri: attachment.uri, name: attachment.name ?? attachment.uri, src }];
	});
}
