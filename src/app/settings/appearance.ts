import type { SettingsData } from "@/app/settings/model";
import { applyFonts, sameFontPreferences } from "@/theme/fonts";
import { applyTheme, clearTheme, getTheme } from "@/theme/service";

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
 * put it back in force.
 */
export function applyAppearance(settings: SettingsData, previous?: SettingsData): void {
	const themeChanged = previous === undefined || settings.theme !== previous.theme;
	const fontsChanged =
		previous === undefined || !sameFontPreferences(settings.fonts, previous.fonts);
	if (!themeChanged && !fontsChanged) return;
	if (themeChanged) {
		const wanted = settings.theme;
		if (wanted !== null && getTheme(wanted) !== null) applyTheme(wanted);
		else clearTheme();
	}
	if (fontsChanged) applyFonts(settings.fonts);
}
