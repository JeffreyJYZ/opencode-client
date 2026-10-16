import type { AgentInfo } from "@opencode/client";

/**
 * The agent fixture the composer's tests read (M2.12). `agent.list` sends **every**
 * agent a server knows — primary, subagent, and hidden — so a fixture that models one
 * bare `{ id, name }` proves nothing about the picker's filter: it is a shape the app
 * cannot produce.
 */

/** One server agent in the shape `AgentInfo` really carries — never a bare `{ id, name }`. */
function agent(id: string, name: string, mode: AgentInfo["mode"], hidden: boolean): AgentInfo {
	return {
		id,
		name,
		request: { settings: {}, headers: {}, body: {} },
		mode,
		hidden,
		permissions: [],
	};
}

/**
 * What a live 2.0.30 server sends: two primary agents a session can be switched to,
 * two subagents, and one hidden machinery agent — with every `id` differing from its
 * `name` (`build` → "Build"), which is the shape M2.11's defect hid behind.
 */
export const PROBE_AGENTS: readonly AgentInfo[] = [
	agent("build", "Build", "primary", false),
	agent("plan", "Plan", "primary", false),
	agent("general", "General", "subagent", false),
	agent("explore", "Explore", "subagent", false),
	agent("compaction", "Compaction", "primary", true),
];

/** The agent id `session.get` reports — selectable, and different from its label. */
export const PROBE_SESSION_AGENT_ID = "build";

/** The ids of `PROBE_AGENTS` a session can be switched to — exactly what the picker offers. */
export const PROBE_SELECTABLE_AGENT_IDS: readonly string[] = [PROBE_SESSION_AGENT_ID, "plan"];
