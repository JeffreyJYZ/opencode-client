import type { AgentInfo } from "@opencode/client";

/**
 * Which agents a session may be switched to (row M2.12). `agent.list()` sends **every**
 * agent the server knows — its primary agents, its subagents, and the hidden machinery
 * agents (`compaction`, `title`, `summary`) — but `session.switchAgent` accepts only a
 * selectable one, so the picker must offer that set and no more.
 *
 * **Both fields are load-bearing**, measured on a live 2.0.30 `agent.list`: a subagent
 * (`general`, `explore`) carries `hidden: false`, and a hidden agent carries
 * `mode: "primary"`, so a filter on either field alone excludes nothing it should.
 */

/** `AgentInfo.mode`'s value for an agent a tool spawns, never one a session selects. */
const AGENT_MODE_SUBAGENT = "subagent";

/** Whether one server agent is a choice a session can make. `"all"` is both, so it stays. */
export function isSelectableAgent(agent: Pick<AgentInfo, "mode" | "hidden">): boolean {
	return agent.mode !== AGENT_MODE_SUBAGENT && agent.hidden !== true;
}
