import { useSyncExternalStore } from "react";
import {
	NOTIFY_BANNER_DISMISS_LABEL,
	NOTIFY_BANNER_REGION_LABEL,
	NOTIFY_BANNER_ROLE,
} from "@/constants/notify";
import { type Banner, dismissBanner, getBanners, subscribeBanners } from "./bannerStore";
import { BANNER_DISMISS_STYLE, BANNER_STACK_STYLE, BANNER_STYLE } from "./bannerStyles";

/**
 * The banner host (M4.20): the one place a persistent notice is drawn, mounted by
 * the shell beside `ToastHost`. A plugin's `notify.banner` reaches it through
 * `bannerStore`, and none of them needs a context.
 *
 * Unlike a toast, a banner **never dismisses itself** — that is the difference the
 * sink exists for. It carries a named dismiss button and renders nothing at all
 * when there is nothing to say.
 */

/** One banner: announced as a status, and gone only when its dismiss is pressed. */
function BannerItem({ banner }: { readonly banner: Banner }) {
	return (
		<div role={NOTIFY_BANNER_ROLE} style={BANNER_STYLE}>
			<span>{banner.message}</span>
			<button
				type="button"
				aria-label={NOTIFY_BANNER_DISMISS_LABEL}
				style={BANNER_DISMISS_STYLE}
				onClick={() => dismissBanner(banner.id)}
			>
				×
			</button>
		</div>
	);
}

export function BannerHost() {
	const banners = useSyncExternalStore(subscribeBanners, getBanners);
	if (banners.length === 0) return null;
	return (
		<section aria-label={NOTIFY_BANNER_REGION_LABEL} style={BANNER_STACK_STYLE}>
			{banners.map((banner) => (
				<BannerItem key={banner.id} banner={banner} />
			))}
		</section>
	);
}
