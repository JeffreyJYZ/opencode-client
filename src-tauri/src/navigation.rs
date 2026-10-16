//! The navigation guard: which document the webview may load.
//!
//! Split out of `lib.rs` (M2.24) when the preview's read command pushed the crate
//! root over the 150-line cap — the guard is one cohesive decision and its own
//! file, and `tests.rs` still reaches it through `crate::is_allowed_navigation`.

use tauri::Url;

use crate::{APP_SCHEME, DEV_HOST, DEV_PORT, DEV_SCHEME};

/// Whether the webview may navigate to `url`.
///
/// The injected target is registered at document start on the main frame, so it
/// is re-injected on **every** top-level load. Only the app's own document may
/// therefore be navigated to: the production origin always, the dev server's
/// origin only in a dev build, where the app is served by Vite rather than from
/// the bundle. Everything else — an external link in rendered markdown, a
/// redirect, `window.location = …` — is refused, so no foreign origin can
/// receive `window.__OC_TARGET__`. External links opening in the OS browser is
/// a separate task; a refusal here must simply leave the app where it is.
///
/// Dev-only residual risk: in a dev build whatever owns `localhost:1420` is
/// trusted (`--strictPort` makes Vite fail on a busy port instead of
/// substituting, and this arm is compiled out of a production build), so this
/// cannot reach a released build.
pub(crate) fn is_allowed_navigation(url: &Url, dev: bool) -> bool {
    match url.scheme() {
        // The production arm checks the host deliberately. A foreign `tauri://`
        // authority such as `tauri://evil/index.html` is still served by this
        // app's own asset handler, so the document it would receive is our own
        // bundle, which already holds the credential: there is no live leak
        // here. The pin exists because the guard's contract is "this app's own
        // origin", and requiring `localhost` is the one condition that makes it
        // exact.
        APP_SCHEME => url.host_str() == Some("localhost"),
        DEV_SCHEME => dev && url.host_str() == Some(DEV_HOST) && url.port() == Some(DEV_PORT),
        _ => false,
    }
}
