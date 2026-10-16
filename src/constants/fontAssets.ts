import { BUNDLED_CODE_FONT_FAMILY, DEFAULT_UI_FONT_FAMILY } from "@/constants/settings";

/**
 * The two faces M3.1 bundles (spec 030 §Two font roles): the interface default and
 * the code **fallback**. `path` and `licence` are repo-relative — `theme/base.css`
 * reaches the same files with its own relative url — and `sha256` is the copy that
 * shipped, so `theme/fontBundle.test.ts` fails on a truncated or regenerated file.
 * The machine's `GeistMono Nerd Font` is deliberately **not** here: it is offered
 * by resolved family name with no asset, because the cask owns its updates.
 */

export type BundledFace = {
	/** The family the webview resolves, never a file name. */
	readonly family: string;
	readonly path: string;
	readonly licence: string;
	readonly sha256: string;
};

export const BUNDLED_FACE = {
	ui: {
		family: DEFAULT_UI_FONT_FAMILY,
		path: "src/assets/fonts/geist/Geist-VariableFont_wght.ttf",
		licence: "src/assets/fonts/geist/OFL.txt",
		sha256: "39fb61a385b9bbac6ff86c03a948d32f6d5626cd993e4a7e1a62d73d3a54bc79",
	},
	code: {
		family: BUNDLED_CODE_FONT_FAMILY,
		path: "src/assets/fonts/geist-mono/GeistMono-VariableFont_wght.ttf",
		licence: "src/assets/fonts/geist-mono/OFL.txt",
		sha256: "e8acfc9d5331733427582e4c906174dde5fe57af8f82cdaf906e80d729ff2b18",
	},
} as const satisfies Readonly<Record<string, BundledFace>>;
