import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ModalHost } from "@/components/notify/ModalHost";
import { pushModal, requestConfirm, resetModals } from "@/components/notify/modalStore";
import { KEY_ESCAPE } from "@/constants/keys";
import {
	NOTIFY_ACCEPT_LABEL,
	NOTIFY_CANCEL_LABEL,
	NOTIFY_DISMISS_LABEL,
	NOTIFY_MODAL_ROLE,
} from "@/constants/notify";

/**
 * The modal host (M4.20): a plugin's notice and its `confirm` are a **real dialog**
 * — an `alertdialog` with the app's focus trap and Escape — and `confirm` resolves
 * the answer the user gives. Escape and cancel are `false`; that is the answer, not
 * a default.
 */

afterEach(() => {
	cleanup();
	resetModals();
});

describe("the modal host", () => {
	test("a modal notice reaches the dialog", () => {
		render(<ModalHost />);
		act(() => {
			pushModal("A plugin has something to say");
		});
		expect(screen.getByRole(NOTIFY_MODAL_ROLE).textContent).toContain(
			"A plugin has something to say",
		);
	});

	test("a notice is dismissed by its named affordance", () => {
		render(<ModalHost />);
		act(() => {
			pushModal("notice");
		});
		act(() => fireEvent.click(screen.getByText(NOTIFY_DISMISS_LABEL)));
		expect(screen.queryByRole(NOTIFY_MODAL_ROLE)).toBeNull();
	});

	test("confirm resolves true on the affirmative", async () => {
		const answer = requestConfirm("sure?");
		render(<ModalHost />);
		act(() => fireEvent.click(screen.getByText(NOTIFY_ACCEPT_LABEL)));
		expect(await answer).toBe(true);
		expect(screen.queryByRole(NOTIFY_MODAL_ROLE)).toBeNull();
	});

	test("confirm resolves false on cancel", async () => {
		const answer = requestConfirm("sure?");
		render(<ModalHost />);
		act(() => fireEvent.click(screen.getByText(NOTIFY_CANCEL_LABEL)));
		expect(await answer).toBe(false);
		expect(screen.queryByRole(NOTIFY_MODAL_ROLE)).toBeNull();
	});

	test("confirm resolves false on Escape — the user's answer, not a default", async () => {
		const answer = requestConfirm("sure?");
		render(<ModalHost />);
		act(() => fireEvent.keyDown(document, { key: KEY_ESCAPE }));
		expect(await answer).toBe(false);
	});
});
