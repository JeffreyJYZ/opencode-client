import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ImagePreview } from "@/components/composer/attachmentImage";
import { ComposerImagePreviews } from "@/components/composer/ComposerImagePreviews";
import { useImagePreviews } from "@/components/composer/useImagePreviews";
import {
	COMPOSER_IMAGE_MIME,
	COMPOSER_PREVIEW_FAILED,
	COMPOSER_PREVIEW_LABEL,
} from "@/constants/preview";
import type { Attachment } from "@/session/promptTypes";

/**
 * The attached images above the input (M2.24, spec 020 §Prompt box). The view is
 * proved against supplied sources; the hook's own wiring is proved with an
 * injected read, because the DOM-less suite has no shell to read a real file.
 */

afterEach(cleanup);

/** The hook's real output, drawn by the real view — the wiring, not a mock of it. */
function Harness({
	attachments,
	read,
}: {
	readonly attachments: readonly Attachment[];
	readonly read: (path: string) => Promise<string | null>;
}) {
	return <ComposerImagePreviews previews={useImagePreviews(attachments, read)} />;
}

function attachment(uri: string, name?: string): Attachment {
	return { uri, name, sendable: true };
}

function preview(src: string | null): ImagePreview {
	return { uri: "/tmp/shot.png", name: "shot.png", src };
}

describe("the preview strip draws what it is handed", () => {
	test("an image renders as a focusable <img> carrying the data url", () => {
		const src = `data:${COMPOSER_IMAGE_MIME.png};base64,aGk=`;
		render(<ComposerImagePreviews previews={[preview(src)]} />);
		const image = screen.getByAltText("shot.png");
		expect(image.getAttribute("src")).toBe(src);
		expect(image.tabIndex).toBe(0);
		expect(screen.getByLabelText(COMPOSER_PREVIEW_LABEL)).toBeDefined();
	});

	test("a refused read says so instead of drawing nothing", () => {
		render(<ComposerImagePreviews previews={[preview(null)]} />);
		expect(screen.getByText(COMPOSER_PREVIEW_FAILED)).toBeDefined();
		expect(screen.queryByAltText("shot.png")).toBeNull();
	});

	test("nothing attached draws nothing", () => {
		const { container } = render(<ComposerImagePreviews previews={[]} />);
		expect(container.firstChild).toBeNull();
	});
});

describe("the hook reads only images, through the shell's own seam", () => {
	test("an image attachment previews from the base64 the read returned", async () => {
		const read = () => Promise.resolve("aGk=");
		render(<Harness attachments={[attachment("/tmp/shot.png", "shot.png")]} read={read} />);
		await waitFor(() =>
			expect(screen.getByAltText("shot.png").getAttribute("src")).toBe(
				`data:${COMPOSER_IMAGE_MIME.png};base64,aGk=`,
			),
		);
	});

	test("a read the shell refused leaves the named failure", async () => {
		const read = () => Promise.resolve(null);
		render(<Harness attachments={[attachment("/tmp/shot.png", "shot.png")]} read={read} />);
		await waitFor(() => expect(screen.getByText(COMPOSER_PREVIEW_FAILED)).toBeDefined());
	});

	test("a non-image is never read, so it keeps whatever it does today", async () => {
		const paths: string[] = [];
		const read = (path: string) => {
			paths.push(path);
			return Promise.resolve("aGk=");
		};
		const { container } = render(
			<Harness attachments={[attachment("/tmp/notes.txt", "notes.txt")]} read={read} />,
		);
		await waitFor(() => expect(container.firstChild).toBeNull());
		expect(paths).toEqual([]);
	});
});
