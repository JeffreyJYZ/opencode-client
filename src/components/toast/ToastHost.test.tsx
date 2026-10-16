import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToastHost } from "@/components/toast/ToastHost";
import { pushToast, resetToasts } from "@/components/toast/toastStore";
import {
	TOAST_DISMISS_LABEL,
	TOAST_REGION_LABEL,
	TOAST_ROLE,
	TOAST_TIMEOUT_MS,
} from "@/constants/native";

/**
 * The toast host (M5.2, requirement 3): a toast is a **real, dismissible, accessible**
 * element. Its role is the ARIA role it is announced under, its dismiss is a named
 * button, and it removes itself after the named timeout — the three things "a toast"
 * has to mean for it to be more than a painted div.
 */

afterEach(() => {
	cleanup();
	resetToasts();
});

describe("the toast host", () => {
	test("renders nothing at all until something is said", () => {
		const { container } = render(<ToastHost />);
		expect(container.querySelector(`[aria-label="${TOAST_REGION_LABEL}"]`)).toBeNull();
	});

	test("an outcome is announced as a status, a failure as an alert", () => {
		render(<ToastHost />);
		act(() => {
			pushToast("Copied", TOAST_ROLE.status);
			pushToast("Copy failed", TOAST_ROLE.alert);
		});
		expect(screen.getByRole(TOAST_ROLE.status).textContent).toContain("Copied");
		expect(screen.getByRole(TOAST_ROLE.alert).textContent).toContain("Copy failed");
	});

	test("the named dismiss button removes exactly its own toast", () => {
		render(<ToastHost />);
		act(() => {
			pushToast("Copied", TOAST_ROLE.status);
			pushToast("Copy failed", TOAST_ROLE.alert);
		});
		const dismisses = screen.getAllByLabelText(TOAST_DISMISS_LABEL);
		expect(dismisses).toHaveLength(2);
		act(() => fireEvent.click(dismisses[1] as HTMLElement));
		expect(screen.queryByRole(TOAST_ROLE.alert)).toBeNull();
		expect(screen.getByRole(TOAST_ROLE.status)).toBeDefined();
	});

	test("a toast dismisses itself after TOAST_TIMEOUT_MS", async () => {
		render(<ToastHost />);
		act(() => {
			pushToast("by itself");
		});
		expect(screen.getByRole(TOAST_ROLE.status)).toBeDefined();
		await act(async () => {
			await Bun.sleep(TOAST_TIMEOUT_MS + 200);
		});
		expect(screen.queryByRole(TOAST_ROLE.status)).toBeNull();
	});
});
