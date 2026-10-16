import type { ImagePreview } from "@/components/composer/attachmentImage";
import {
	COMPOSER_PREVIEW_FAILED_STYLE,
	COMPOSER_PREVIEW_STRIP_STYLE,
	COMPOSER_PREVIEW_STYLE,
} from "@/components/composer/composerStyles";
import { COMPOSER_PREVIEW_FAILED, COMPOSER_PREVIEW_LABEL } from "@/constants/preview";

/**
 * The attached images, above the input (spec 020 §Prompt box: "Images preview
 * inline above the input", M2.24). A pure view: the sources are resolved by
 * `useImagePreviews`, so this draws exactly what it is handed and the suite can
 * prove the render with no shell in sight.
 *
 * Removal is not repeated here — the attachment strip's own `×` is the one
 * affordance, and removing an attachment drops its preview with it.
 */

export type ComposerImagePreviewsProps = {
	readonly previews: readonly ImagePreview[];
};

export function ComposerImagePreviews({ previews }: ComposerImagePreviewsProps) {
	if (previews.length === 0) return null;
	return (
		<ul style={COMPOSER_PREVIEW_STRIP_STYLE} aria-label={COMPOSER_PREVIEW_LABEL}>
			{previews.map((preview) => (
				<li key={preview.uri}>
					{preview.src === null ? (
						<span style={COMPOSER_PREVIEW_FAILED_STYLE}>
							<span>{preview.name}</span>
							<span>{COMPOSER_PREVIEW_FAILED}</span>
						</span>
					) : (
						<img
							src={preview.src}
							alt={preview.name}
							// biome-ignore lint/a11y/noNoninteractiveTabindex: the row requires the preview be keyboard-reachable, and the image is the node that carries it
							tabIndex={0}
							style={COMPOSER_PREVIEW_STYLE}
						/>
					)}
				</li>
			))}
		</ul>
	);
}
