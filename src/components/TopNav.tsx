import type { CSSProperties } from "react";
import { Slot } from "@/components/Slot";
import { TOPNAV_REGION } from "@/constants/tabs";

/**
 * The one-row top nav (spec 010 §Top nav): the app mark and the strip on the
 * left, the new-session affordance, picker and gear on the right.
 *
 * All three regions are slot hosts. The built-ins register into them through
 * the same `register` a plugin uses (`topnavBuiltins.tsx`), so an empty
 * region — no built-in, no contribution — renders nothing at all.
 */

const NAV_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-2)",
	background: "var(--oc-surface)",
	borderBottom: "1px solid var(--oc-border)",
	padding: "0 var(--oc-space-2)",
	fontFamily: "var(--oc-font-ui)",
	minWidth: 0,
};

const REGION_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-1)",
	minWidth: 0,
	flexShrink: 0,
};

const CENTER_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	minWidth: 0,
	flex: "1 1 auto",
};

export function TopNav() {
	return (
		<nav aria-label="Views" style={NAV_STYLE}>
			<div style={REGION_STYLE}>
				<Slot id={TOPNAV_REGION.left} />
			</div>
			<div style={CENTER_STYLE}>
				<Slot id={TOPNAV_REGION.center} />
			</div>
			<div style={REGION_STYLE}>
				<Slot id={TOPNAV_REGION.right} />
			</div>
		</nav>
	);
}
