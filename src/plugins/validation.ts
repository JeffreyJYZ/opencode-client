/** Whether a value is a React component: a function or an object carrying React's `$$typeof` marker (`React.memo`, `forwardRef`, `lazy`, …). */
export function isComponent(value: unknown): boolean {
	if (typeof value === "function") return true;
	if (typeof value !== "object" || value === null) return false;
	const marker = (value as { readonly $$typeof?: unknown }).$$typeof;
	return typeof marker === "symbol";
}
