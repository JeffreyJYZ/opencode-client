import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { resetSettings } from "@/app/settings/store";
import { UpdateNotice } from "@/components/UpdateNotice";
import {
	UPDATE_DISMISS_LABEL,
	UPDATE_INSTALL_LABEL,
	UPDATE_NOTICE_LABEL,
} from "@/constants/updates";
import { fakeOffer, fakeSeam, resetUpdateFlow } from "@/test/updates";
import { setUpdateSeam } from "@/updates/updater";

/**
 * The update notice (M5.6): the app's own surface for a release on offer.
 *
 * The seam is replaced here, so no test in this file calls the real plugin.
 */

/** Let the notice's own startup check settle. */
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

describe("the update notice", () => {
	test("shows nothing at all when there is no offer", async () => {
		setUpdateSeam(fakeSeam({ offer: null }));
		render(<UpdateNotice />);
		await settle();
		expect(screen.queryByLabelText(UPDATE_NOTICE_LABEL)).toBeNull();
	});

	test("shows nothing when the check fails", async () => {
		setUpdateSeam({
			isSupported: () => true,
			check: () => Promise.reject(new Error("offline")),
			downloadAndInstall: () => Promise.resolve(),
			relaunch: () => Promise.resolve(),
		});
		render(<UpdateNotice />);
		await settle();
		expect(screen.queryByLabelText(UPDATE_NOTICE_LABEL)).toBeNull();
	});

	test("shows nothing in a build that cannot update", async () => {
		setUpdateSeam(fakeSeam({ supported: false, offer: fakeOffer("1.2.0") }));
		render(<UpdateNotice />);
		await settle();
		expect(screen.queryByLabelText(UPDATE_NOTICE_LABEL)).toBeNull();
	});

	test("offers the release it found, with a way to install it", async () => {
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0") }));
		render(<UpdateNotice />);
		await settle();
		const notice = screen.getByLabelText(UPDATE_NOTICE_LABEL);
		expect(notice.textContent).toContain("1.2.0");
		expect(screen.getByRole("button", { name: UPDATE_INSTALL_LABEL })).toBeDefined();
	});

	test("the download's progress is shown while it runs", async () => {
		const pending = Promise.withResolvers<void>();
		setUpdateSeam({
			isSupported: () => true,
			check: () => Promise.resolve(fakeOffer("1.2.0")),
			downloadAndInstall: async (_offer, report) => {
				report({ received: 40, total: 100 });
				await pending.promise;
			},
			relaunch: () => Promise.resolve(),
		});
		render(<UpdateNotice />);
		await settle();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: UPDATE_INSTALL_LABEL }));
		});
		expect(screen.getByLabelText(UPDATE_NOTICE_LABEL).textContent).toContain("40%");
		await act(async () => {
			pending.resolve();
		});
	});

	test("dismissing the offer hides the notice", async () => {
		setUpdateSeam(fakeSeam({ offer: fakeOffer("1.2.0") }));
		render(<UpdateNotice />);
		await settle();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: UPDATE_DISMISS_LABEL }));
		});
		expect(screen.queryByLabelText(UPDATE_NOTICE_LABEL)).toBeNull();
	});
});
