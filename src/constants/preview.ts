/**
 * The attached images' preview vocabulary (spec 020 §Prompt box: "Images preview
 * inline above the input", M2.24). Split from `constants/composer.ts` along the
 * seam the row is about — the preview's own words, size, cap and types — so
 * neither file is two responsibilities.
 *
 * The webview cannot load a `file://` path, so the shell reads the file and the
 * page shows it as a `data:` url — which `csp.rs`'s `img-src` already admits, so
 * the preview widens the content policy by nothing.
 */

/** The preview strip's accessible name, and the word a refused read shows. */
export const COMPOSER_PREVIEW_LABEL = "Image previews";
export const COMPOSER_PREVIEW_FAILED = "Preview unavailable";

/** The thumbnail's largest side, in pixels — a user-visible size, so it is named. */
export const COMPOSER_PREVIEW_MAX_PX = 96;

/**
 * The largest image the preview reads, in bytes — a huge file is **refused**, never
 * truncated silently. **Kept in step with `IMAGE_MAX_BYTES` in
 * `src-tauri/src/native/image.rs`**, which enforces it; its tests read this file
 * and evaluate the product below, so the two caps cannot drift.
 */
export const COMPOSER_PREVIEW_MAX_BYTES = 8 * 1024 * 1024;

/**
 * The types that preview, by lower-case extension. Everything else is not an image
 * and keeps whatever it does today (spec 020 §Prompt box: only images preview).
 */
export const COMPOSER_IMAGE_MIME: Readonly<Record<string, string>> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	bmp: "image/bmp",
	svg: "image/svg+xml",
};
