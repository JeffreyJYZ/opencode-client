import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { resetSettings } from "@/app/settings/store";
import { VersionSection } from "@/components/VersionSection";
import {
	UPDATE_CHECK_LABEL,
	UPDATE_INSTALL_LABEL,
	UPDATE_NOTICE_LABEL,
	UPDATE_UNSUPPORTED_TEXT,
} from "@/constants/updates";
import { fakeOffer, fakeSeam, resetUpdateFlow } from "@/test/updates";
import { setUpdateSeam } from "@/updates/updater";

/**
 * The About section (M5.3, M5.4, M5.6): the app's version, and the update flow
 * beside it.
 *
 * The flow is the **same one** the startup notice drives, so the section reads
 * and writes the one store — there is no second check loop and no second
 * download path. The seam is replaced here, so no test calls the real plugin.
 */

async function settle(): Promise<void> {
	await act(async () => {
		await Promise.resolve();
	});
}

beforeEach(() => {
	resetSettings();
	resetUpdateFlow();
});

afterEach(() => {
	cleanup();
	resetSettings();
	resetUpdateFlow();
});

describe("the About section", () => {
	test("shows the app's version", () => {
		setUpdateSeam(fakeSeam({ offer: null }));
		render(<VersionSection />);
		const version = document.querySelector("[data-app-version]");
		expect(version?.textContent).toBe("0.1.0");
	});

	test("the check button drives the flow's check", async () => {
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0") }));
		render(<VersionSection />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: UPDATE_CHECK_LABEL }));
		});
		await settle();
		expect(screen.getByRole("status").textContent).toContain("1.2.0");
	});

	test("an offered release can be installed from here too", async () => {
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0") }));
		render(<VersionSection />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: UPDATE_CHECK_LABEL }));
		});
		await settle();
		expect(screen.getByRole("button", { name: UPDATE_INSTALL_LABEL })).toBeDefined();
	});

	test("the section never renders the notice's own region", () => {
		setUpdateSeam(fakeSeam({ offer: null }));
		render(<VersionSection />);
		expect(screen.queryByLabelText(UPDATE_NOTICE_LABEL)).toBeNull();
	});

	test("a build that cannot update says so and offers no check", async () => {
		setUpdateSeam(fakeSeam({ supported: false, offer: null }));
		render(<VersionSection />);
		await settle();
		expect(screen.queryByRole("button", { name: UPDATE_CHECK_LABEL })).toBeNull();
		expect(screen.getByRole("status").textContent).toBe(UPDATE_UNSUPPORTED_TEXT);
	});
});
