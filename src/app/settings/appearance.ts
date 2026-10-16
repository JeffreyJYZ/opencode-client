import type { SettingsData } from "@/app/settings/model";
import { FOLLOW_SYSTEM_THEME_ID } from "@/constants/theme";
import { applyFonts, sameFontPreferences } from "@/theme/fonts";
import { applyFollowSystem, applyTheme, clearTheme, getTheme } from "@/theme/service";

/**
 * Apply what the user chose for the app's appearance (spec 030 §Theme service).
 *
 * The two halves are independent, and that is load-bearing: a **font** change
 * writes the font variables and leaves the theme alone, so a theme a plugin put
 * in force through `themes.apply` is not thrown away because the *stored* theme
 * id still says "the built-in". A **theme** change resolves the stored id and
 * applies it — then, when both moved at once, the fonts are written last, which
 * is the order that gives typography the last word.
 *
 * Without a `previous`, both halves apply unconditionally: that is the boot path,
 * where the root is bare and the marker unwritten.
 *
 * A stored theme id that nothing registered — a plugin theme whose plugin has not
 * loaded yet — is **not** a fault: the built-in default is applied and the id
 * stays in the blob, so the plugin's own load (`themes.register` + `apply`) can
 * put it back in force. The **follow-system** sentinel (M3.6) is read first and
 * resolved by the service, so its mode comes from `prefers-color-scheme` and the
 * watch it needs is attached here, on the boot path.
 */
export function applyAppearance(settings: SettingsData, previous?: SettingsData): void {
	const themeChanged = previous === undefined || settings.theme !== previous.theme;
	const fontsChanged =
		previous === undefined || !sameFontPreferences(settings.fonts, previous.fonts);
	if (!themeChanged && !fontsChanged) return;
	if (themeChanged) {
		const wanted = settings.theme;
		// The follow-system sentinel is read **before** the registry: it names no
		// theme, and it is the one choice whose mode the service resolves (M3.6).
		if (wanted === FOLLOW_SYSTEM_THEME_ID) applyFollowSystem();
		else if (wanted !== null && getTheme(wanted) !== null) applyTheme(wanted);
		else clearTheme();
	}
	if (fontsChanged) applyFonts(settings.fonts);
}
