import type { SettingsSection } from "@/app/settings/sections";
import { AppearanceSection } from "@/components/AppearanceSection";
import { ConnectSection } from "@/components/ConnectSection";
import { PluginsSection } from "@/components/PluginsSection";
import { TypographySection } from "@/components/TypographySection";
import { VersionSection } from "@/components/VersionSection";
import { APPEARANCE_TITLE } from "@/constants/appearance";
import { CONNECT_TITLE } from "@/constants/connect";
import { PLUGINS_TITLE } from "@/constants/plugins";
import { SETTINGS_SECTION_ID, SETTINGS_SECTION_ORDER } from "@/constants/settings";
import { TYPOGRAPHY_TITLE } from "@/constants/typography";
import { VERSION_SECTION_LABEL, VERSION_SECTION_ORDER } from "@/constants/version";

/**
 * The built-ins the registry ships (M1.6, M3.2, M3.5, M5.3). They register through
 * the same map a plugin writes to, in one table rather than a sequence of numbers
 * spread across the registrations.
 *
 * It lives in its own module because `sections.ts` — the registry itself — overran
 * the 150-line cap once a merge brought M4.3's ordering rule together with M5.3's
 * Version section. The import of `SettingsSection` is **type-only**, so there is no
 * runtime cycle between the two files.
 */
export const BUILTIN_SECTIONS: readonly SettingsSection[] = [
	{
		id: SETTINGS_SECTION_ID.appearance,
		label: APPEARANCE_TITLE,
		component: AppearanceSection,
		order: SETTINGS_SECTION_ORDER.appearance,
	},
	{
		id: SETTINGS_SECTION_ID.typography,
		label: TYPOGRAPHY_TITLE,
		component: TypographySection,
		order: SETTINGS_SECTION_ORDER.typography,
	},
	{
		id: SETTINGS_SECTION_ID.connect,
		label: CONNECT_TITLE,
		component: ConnectSection,
		order: SETTINGS_SECTION_ORDER.connect,
	},
	{
		id: SETTINGS_SECTION_ID.plugins,
		label: PLUGINS_TITLE,
		component: PluginsSection,
		order: SETTINGS_SECTION_ORDER.plugins,
	},
	{
		id: SETTINGS_SECTION_ID.version,
		label: VERSION_SECTION_LABEL,
		component: VersionSection,
		order: VERSION_SECTION_ORDER,
	},
];
