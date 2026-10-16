import { describe, expect, test } from "bun:test";
import { dataUrlOf, imageMimeOf, previewPathOf } from "@/components/composer/attachmentImage";
import { COMPOSER_IMAGE_MIME } from "@/constants/preview";
import type { Attachment } from "@/session/promptTypes";

/**
 * Which attachments preview and what the page shows them from (M2.24). Pure: the
 * type comes from the extension, the uri becomes the absolute path the shell
 * reads, and the base64 becomes the `data:` url the policy already admits.
 */

function attachment(uri: string, name?: string): Attachment {
	return { uri, name, sendable: true };
}

describe("imageMimeOf decides what previews", () => {
	test("the known extensions preview, by their own mime", () => {
		for (const [extension, mime] of Object.entries(COMPOSER_IMAGE_MIME)) {
			expect(imageMimeOf(attachment(`/tmp/shot.${extension}`))).toBe(mime);
		}
	});

	test("the extension is case-insensitive and the name is read before the uri", () => {
		expect(imageMimeOf(attachment("/tmp/SHOT.PNG"))).toBe(COMPOSER_IMAGE_MIME.png);
		expect(imageMimeOf(attachment("/tmp/blob", "shot.jpeg"))).toBe(COMPOSER_IMAGE_MIME.jpeg);
	});

	test("a non-image keeps whatever it does today", () => {
		expect(imageMimeOf(attachment("/tmp/notes.txt"))).toBeNull();
		expect(imageMimeOf(attachment("/tmp/no-extension"))).toBeNull();
		expect(imageMimeOf(attachment("", "makefile"))).toBeNull();
	});
});

describe("previewPathOf hands the shell a path it can read", () => {
	test("a plain path and a file:// url both resolve to the absolute path", () => {
		expect(previewPathOf("/tmp/shot.png")).toBe("/tmp/shot.png");
		expect(previewPathOf("file:///tmp/shot.png")).toBe("/tmp/shot.png");
	});

	test("a percent-encoded file url is decoded, and a bad escape is left alone", () => {
		expect(previewPathOf("file:///Users/me/a%20b.png")).toBe("/Users/me/a b.png");
		expect(previewPathOf("file:///tmp/a%zz.png")).toBe("/tmp/a%zz.png");
	});

	test("a relative uri is no path at all", () => {
		expect(previewPathOf("shot.png")).toBeNull();
		expect(previewPathOf("")).toBeNull();
	});
});

describe("dataUrlOf builds the url the policy admits", () => {
	test("the mime and the base64 make one data url", () => {
		expect(dataUrlOf(COMPOSER_IMAGE_MIME.png, "aGk=")).toBe("data:image/png;base64,aGk=");
	});
});
