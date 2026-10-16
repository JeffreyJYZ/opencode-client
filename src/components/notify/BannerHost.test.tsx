import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BannerHost } from "@/components/notify/BannerHost";
import { pushBanner, resetBanners } from "@/components/notify/bannerStore";
import { TOAST_TIMEOUT_MS } from "@/constants/native";
import {
	NOTIFY_BANNER_DISMISS_LABEL,
	NOTIFY_BANNER_REGION_LABEL,
	NOTIFY_BANNER_ROLE,
} from "@/constants/notify";

/**
 * The banner host (M4.20): a persistent, dismissible, accessible region. It is
 * announced as a status, carries a named dismiss, and — unlike a toast — it does
 * **not** time out. That difference is the whole reason the sink exists.
 */

afterEach(() => {
	cleanup();
	resetBanners();
});

describe("the banner host", () => {
	test("renders nothing at all until something is said", () => {
		const { container } = render(<BannerHost />);
		expect(container.querySelector(`[aria-label="${NOTIFY_BANNER_REGION_LABEL}"]`)).toBeNull();
	});

	test("a banner is announced as a status and carries its message", () => {
		render(<BannerHost />);
		act(() => {
			pushBanner("A plugin has something to say");
		});
		expect(screen.getByRole(NOTIFY_BANNER_ROLE).textContent).toContain(
			"A plugin has something to say",
		);
	});

	test("the named dismiss removes exactly its own banner", () => {
		render(<BannerHost />);
		act(() => {
			pushBanner("one");
			pushBanner("two");
		});
		const dismisses = screen.getAllByLabelText(NOTIFY_BANNER_DISMISS_LABEL);
		expect(dismisses).toHaveLength(2);
		act(() => fireEvent.click(dismisses[1] as HTMLElement));
		expect(screen.getAllByRole(NOTIFY_BANNER_ROLE)).toHaveLength(1);
	});

	test("a banner does NOT self-dismiss — it outlives a toast's timeout", async () => {
		render(<BannerHost />);
		act(() => {
			pushBanner("stays put");
		});
		await act(async () => {
			await Bun.sleep(TOAST_TIMEOUT_MS + 200);
		});
		expect(screen.getByRole(NOTIFY_BANNER_ROLE)).toBeDefined();
	});
});
