import type { ComponentType } from "react";
import { normalizePath, pathToRoute } from "@/app/router";
import { type Disposable, REFUSED } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";
import { isComponent } from "@/plugins/validation";

/**
 * The route registry (spec 040 §The host, `routes.register`): a plugin may add a
 * path the router serves. A refused contribution is inert — nothing renders, a
 * `PluginFault` is recorded, and nothing throws.
 *
 * A registered path serves unknown paths only: it may not replace a built-in
 * route (home, a session, or settings), since `/settings` is the route to the
 * plugin manager. Built-in routes win the match; a colliding registration is
 * refused here rather than silently losing it later.
 */

/** What a route contribution carries. `id` and `path` are each unique. */
export type RouteContribution = {
	readonly id: string;
	readonly path: string;
	readonly component: ComponentType;
};

const byPath = new Map<string, RouteContribution>();
const byId = new Map<string, RouteContribution>();
const listeners = new Set<() => void>();

function notify(): void {
	for (const listener of listeners) listener();
}

function refuse(reason: FaultReason, subject: string, message: string): Disposable {
	recordFault({ area: FAULT_AREAS.routes, reason, subject, message });
	return REFUSED;
}

function problemWith(contribution: RouteContribution): string | null {
	if (typeof contribution.id !== "string" || contribution.id.trim() === "") return "an empty id";
	if (typeof contribution.path !== "string" || !contribution.path.startsWith("/")) {
		return `a path that is not absolute ("${String(contribution.path)}")`;
	}
	if (!isComponent(contribution.component)) return "a missing or malformed component";
	return null;
}

export function subscribeToRouteRegistry(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The route serving a path, or `null`. Exact match; a trailing separator is ignored. */
export function matchRegisteredRoute(path: string): RouteContribution | null {
	return byPath.get(normalizePath(path)) ?? null;
}

/** Register one route. Synchronous, like every registry in spec 040 §The host. */
export function registerRoute(contribution: RouteContribution): Disposable {
	const problem = problemWith(contribution);
	if (problem !== null) {
		return refuse(
			FAULT_REASONS.malformedEntry,
			String(contribution.id),
			`the route "${String(contribution.id)}" has ${problem}`,
		);
	}
	const path = normalizePath(contribution.path);
	if (byId.has(contribution.id)) {
		return refuse(
			FAULT_REASONS.duplicateId,
			contribution.id,
			`the route id "${contribution.id}" is already registered`,
		);
	}
	if (byPath.has(path)) {
		return refuse(
			FAULT_REASONS.duplicatePath,
			path,
			`the path "${path}" is already registered`,
		);
	}
	if (pathToRoute(path) !== null) {
		return refuse(
			FAULT_REASONS.duplicatePath,
			path,
			`the path "${path}" is a built-in route and cannot be replaced`,
		);
	}
	const route: RouteContribution = {
		id: contribution.id,
		path,
		component: contribution.component,
	};
	byId.set(route.id, route);
	byPath.set(route.path, route);
	notify();
	return {
		dispose(): void {
			if (byId.get(route.id) !== route) return;
			byId.delete(route.id);
			byPath.delete(route.path);
			notify();
		},
	};
}
