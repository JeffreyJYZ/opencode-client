import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { BUTTON_STYLE } from "@/constants/settingsUi";

/**
 * The app's button (M4.21, spec 040 §The host `ui.kit`): the shared
 * input/button style six surfaces already render (`settingsUi.BUTTON_STYLE`)
 * as a component, so a plugin's button matches a built-in's without copying
 * the style object.
 *
 * `style` adds to the shared style, never replaces it; `data-*` attributes
 * pass through to the element, so a test hook rides the same node.
 */

export type ButtonProps = {
	readonly children: ReactNode;
	readonly style?: CSSProperties;
	readonly [attr: `data-${string}`]: string | boolean | undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style" | "children">;

export function Button({ children, type = "button", style, ...rest }: ButtonProps) {
	return (
		<button
			type={type}
			{...rest}
			style={style === undefined ? BUTTON_STYLE : { ...BUTTON_STYLE, ...style }}
		>
			{children}
		</button>
	);
}
