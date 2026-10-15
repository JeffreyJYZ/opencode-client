import { useSyncExternalStore } from "react";
import {
	getSettingsSnapshot,
	type SettingsSnapshot,
	subscribeSettings,
} from "@/app/settings/store";

/**
 * The only places a component subscribes to the settings blob. The store's
 * snapshot is identity-stable, so neither hook re-renders forever.
 */

export function useSettings(): SettingsSnapshot {
	return useSyncExternalStore(subscribeSettings, getSettingsSnapshot);
}
