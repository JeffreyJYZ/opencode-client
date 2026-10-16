import { afterEach, describe, expect, test } from "bun:test";
import type { FormInfo, PermissionRequest } from "@opencode/client";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { SessionComposer } from "@/components/composer/SessionComposer";
import { COMPOSER_PROMPT_LABEL, DOCK_DECISION, DOCK_LABEL } from "@/constants/composer";
import { capturedDocks } from "@/test/capture";
import { renderComposer } from "@/test/composer";
import { type ComposerProbe, composerProbe } from "@/test/composerProbe";

/**
 * The docks (row M2.6). The pending request and the pending form are the **captured**
 * ones (`src/test/fixtures/m25-docks.json`, a real 2.0.29 server's own
 * `permission.list` / `session.form.list` responses), so the shapes the docks read
 * are the shapes the server sends.
 *
 * Every reply is driven with keys: the permission dock's ordinals `1`/`2`/`3`, its
 * `Esc`, and the form's `Enter` and `Esc`. And a dock **replaces** the prompt box, so
 * the box's field is absent while one is pending (requirement 6).
 */

afterEach(cleanup);

const fixture = await capturedDocks();
const pending = fixture.permissions[0] as PermissionRequest;
const form = fixture.forms[0] as FormInfo;

/** Render with one pending permission, and wait for the dock's own refetch to land. */
async function renderWithPermission(
	probe: ComposerProbe = composerProbe({ permissions: [pending] }),
): Promise<ComposerProbe> {
	renderComposer(<SessionComposer sessionID={fixture.sessionID} running={false} />, probe);
	await waitFor(() => expect(screen.getByLabelText(DOCK_LABEL.permission)).toBeDefined());
	return probe;
}

/** The dock's own key container: a `fieldset`, whose implicit role is `group`. */
function dockKeys(): HTMLElement {
	return screen.getByRole("group");
}

describe("the permission dock", () => {
	test("the three decisions are labelled exactly as the wire names them", async () => {
		await renderWithPermission();
		for (const decision of DOCK_DECISION) {
			expect(screen.getByRole("button", { name: decision })).toBeDefined();
		}
		// The request's own subject is on screen, so the dock says what is being asked.
		expect(screen.getByText(new RegExp(pending.action))).toBeDefined();
		expect(screen.getByText(pending.resources[0] as string)).toBeDefined();
	});

	test("`1`, `2` and `3` reply from the keyboard, and the list is refetched after", async () => {
		const probe = await renderWithPermission();
		act(() => fireEvent.keyDown(dockKeys(), { key: "1" }));
		await waitFor(() => expect(probe.permissionReplies).toHaveLength(1));
		expect(probe.permissionReplies[0]).toEqual({
			sessionID: fixture.sessionID,
			requestID: pending.id,
			decision: "once",
		});
		probe.setPermissions([]);
		act(() => fireEvent.keyDown(dockKeys(), { key: "3" }));
		await waitFor(() => expect(probe.permissionReplies).toHaveLength(2));
		expect((probe.permissionReplies[1] as { decision: string }).decision).toBe("reject");
	});

	test("Esc is the third decision — `reject` — so the dock is never silently dismissed", async () => {
		const probe = await renderWithPermission();
		act(() => fireEvent.keyDown(dockKeys(), { key: "Escape" }));
		await waitFor(() => expect(probe.permissionReplies).toHaveLength(1));
		expect((probe.permissionReplies[0] as { decision: string }).decision).toBe("reject");
	});

	test("a dock replaces the prompt box: the field is gone while one is pending", async () => {
		await renderWithPermission();
		expect(screen.queryByLabelText(COMPOSER_PROMPT_LABEL)).toBeNull();
	});

	test("the dock's own refetch removes it once the server has no pending request", async () => {
		const probe = await renderWithPermission();
		probe.setPermissions([]);
		// The dock refetches after a reply — the server's list, not a local flag, is
		// what closes it.
		act(() => fireEvent.keyDown(dockKeys(), { key: "2" }));
		await waitFor(() => expect(screen.queryByLabelText(DOCK_LABEL.permission)).toBeNull());
		await waitFor(() => expect(screen.getByLabelText(COMPOSER_PROMPT_LABEL)).toBeDefined());
	});
});

describe("the question dock", () => {
	async function renderWithForm(
		probe: ComposerProbe = composerProbe({ forms: [form] }),
	): Promise<ComposerProbe> {
		renderComposer(<SessionComposer sessionID={fixture.sessionID} running={false} />, probe);
		await waitFor(() => expect(screen.getByLabelText(DOCK_LABEL.question)).toBeDefined());
		return probe;
	}

	test("Enter answers the field and submits the form with the field's own keys", async () => {
		const probe = await renderWithForm();
		const input = screen.getByLabelText("Target") as HTMLInputElement;
		act(() => fireEvent.change(input, { target: { value: "src/session" } }));
		// Field 1 of 2: Enter advances to the multi-select.
		act(() => fireEvent.keyDown(dockKeys(), { key: "Enter" }));
		await waitFor(() => expect(screen.getByRole("listbox")).toBeDefined());
		// On a multi-select Enter toggles the highlighted option; the submit button then
		// sends both answers, which is the shape `form.reply` takes.
		act(() => fireEvent.keyDown(dockKeys(), { key: "Enter" }));
		act(() => fireEvent.click(screen.getByRole("button", { name: "Submit" })));
		await waitFor(() => expect(probe.formReplies).toHaveLength(1));
		expect(probe.formReplies[0]).toEqual({
			sessionID: fixture.sessionID,
			formID: form.id,
			answer: { target: "src/session", scope: ["tests"] },
		});
	});

	test("Esc cancels the form, so the asker is told nobody answered", async () => {
		const probe = await renderWithForm();
		act(() => fireEvent.keyDown(dockKeys(), { key: "Escape" }));
		await waitFor(() => expect(probe.formCancels).toHaveLength(1));
		expect(probe.formCancels[0]).toEqual({ sessionID: fixture.sessionID, formID: form.id });
	});

	test("a form's title is on screen and the step strip counts the fields", async () => {
		await renderWithForm();
		expect(screen.getByText(form.title)).toBeDefined();
		expect(screen.getByText(`1 of ${form.fields.length}`)).toBeDefined();
	});
});
