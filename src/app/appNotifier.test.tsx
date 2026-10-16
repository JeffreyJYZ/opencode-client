import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { APP_NOTIFIER } from "@/app/hostPorts";
import { BannerHost } from "@/components/notify/BannerHost";
import { getBanners, resetBanners } from "@/components/notify/bannerStore";
import { ModalHost } from "@/components/notify/ModalHost";
import { getModals, resetModals } from "@/components/notify/modalStore";
import { getToasts, resetToasts } from "@/components/toast/toastStore";
import { NOTIFY_ACCEPT_LABEL, NOTIFY_MODAL_ROLE } from "@/constants/notify";
import { PLUGIN_NOTICE_KIND } from "@/plugins/services/notify";

/**
 * The app's notifier (M4.20) is honest about **which** sink each kind reaches:
 * a `banner` is a banner and never a toast, a `modal` is a dialog, and `confirm`
 * resolves the answer the user gives. The defect this row closes was every kind
 * flattened onto `pushToast`, with a `confirm` hard-wired to `false`.
 */

afterEach(() => {
	cleanup();
	resetBanners();
	resetModals();
	resetToasts();
});

describe("the app's notifier routes each kind to its own sink", () => {
	test("a banner reaches the banner sink and NOT the toast store", () => {
		APP_NOTIFIER.show({ kind: PLUGIN_NOTICE_KIND.banner, message: "banner!" });
		expect(getBanners().map((banner) => banner.message)).toEqual(["banner!"]);
		expect(getToasts()).toHaveLength(0);
	});

	test("a toast reaches the toast store and NOT the banner sink", () => {
		APP_NOTIFIER.show({ kind: PLUGIN_NOTICE_KIND.toast, message: "toast!" });
		expect(getToasts().map((toast) => toast.message)).toEqual(["toast!"]);
		expect(getBanners()).toHaveLength(0);
	});

	test("a modal notice reaches the modal sink, and the dialog draws it", () => {
		render(<ModalHost />);
		act(() => {
			APP_NOTIFIER.show({ kind: PLUGIN_NOTICE_KIND.modal, message: "modal!" });
		});
		expect(getModals().map((request) => request.message)).toEqual(["modal!"]);
		expect(screen.getByRole(NOTIFY_MODAL_ROLE).textContent).toContain("modal!");
	});

	test("a banner notice renders in the banner host", () => {
		render(<BannerHost />);
		act(() => {
			APP_NOTIFIER.show({ kind: PLUGIN_NOTICE_KIND.banner, message: "banner!" });
		});
		expect(screen.getByText("banner!")).toBeDefined();
	});

	test("confirm opens the dialog and resolves the answer the user gives", async () => {
		const answer = APP_NOTIFIER.confirm("proceed?");
		render(<ModalHost />);
		act(() => fireEvent.click(screen.getByText(NOTIFY_ACCEPT_LABEL)));
		expect(await answer).toBe(true);
	});
});
