//! The Content-Security-Policy the window is given.
//!
//! Tauri's own `app > security > csp` is a static string: it cannot see the
//! resolved target, and on desktop it is only ever applied to the app's own
//! `tauri://` asset responses (`tauri/src/manager/mod.rs::get_asset`; the
//! dev-server proxy is `cfg!(all(dev, mobile))`). A desktop dev build loads
//! `devUrl` — `http://localhost:1420` straight from Vite — so no Tauri-served
//! HTML exists to carry a config CSP there.
//!
//! So the policy is assembled from the resolved target and injected as the
//! first thing the window's initialization script does: a `<meta http-equiv>`
//! written into the parser's stream, which WebKit enforces from the moment it
//! enters `<head>`, ahead of every one of the page's own scripts (spec 010
//! §Window). [`meta_script`] carries the measurement that makes the placement
//! load-bearing.
//!
//! The policy covers what the app does today and nothing else. A directive for
//! a consumer that cannot run yet is deliberately absent — see [`connect_src`]
//! and the report for where the row that wires each one adds it.

use tauri::Url;

use crate::target::Target;

use script::meta_script;

mod script;

#[cfg(test)]
mod install_tests;

#[cfg(test)]
mod tests;

/// The bundled assets every other directive falls back to.
const DEFAULT_SRC: &str = "default-src 'self'";
/// Scripts come from the bundle, and from the `Blob` the plugin loader imports an
/// installed plugin's entry from (M4.5, spec 040 §Entry file). A `blob:` URL is not
/// covered by `'self'`, so the loader needs the scheme named here or the import is
/// refused. A dev build appends `'unsafe-inline'` for Vite's React-refresh preamble
/// (see [`script_src`]).
const SCRIPT_SRC: &str = "script-src 'self' blob:";
/// Vite injects the dev stylesheet as an inline `<style>` element and React sets
/// inline `style` attributes (`style={{…}}`, `style.setProperty`) in both
/// builds, so styles need `'unsafe-inline'` always. CSS cannot execute, and no
/// untrusted stylesheet reaches the app until M2.3 renders server markdown.
const STYLE_SRC: &str = "style-src 'self' 'unsafe-inline'";
/// The two classic markdown-adjacent escapes, closed before markdown arrives:
/// nothing in the app embeds a plugin or retargets the document today.
const OBJECT_SRC: &str = "object-src 'none'";
/// No `<base>` element exists, and one would retarget every relative asset.
const BASE_URI: &str = "base-uri 'none'";
/// Images in server-supplied markdown (`M2.3` renders it): the app's own assets,
/// an inline `data:` image embedded in the markdown, and the resolved server's
/// origin, which serves the markdown's images. This is the directive the `M2.3`
/// TODO promised and never added — `M1.17`, where the whole-policy test below
/// pinned its absence as correct instead of catching it.
const IMG_SRC: &str = "img-src 'self' data:";
/// The scheme Vite's HMR websocket speaks. Dev only.
const DEV_CONNECT_SCHEME: &str = "ws";

/// The policy for this launch: `dev` mirrors the compile-time build (`cfg!(dev)`).
pub fn policy(target: Option<&Target>, dev: bool) -> String {
    [
        DEFAULT_SRC.to_owned(),
        script_src(dev),
        STYLE_SRC.to_owned(),
        connect_src(target, dev),
        img_src(target),
        OBJECT_SRC.to_owned(),
        BASE_URI.to_owned(),
    ]
    .join("; ")
}

/// The whole initialization script: the policy first, then the target global, so
/// the policy is in the document before the scripts (and the global) it governs.
pub fn initialization_script(target: Option<&Target>, dev: bool) -> String {
    let mut script = meta_script(&policy(target, dev));
    if let Some(target) = target {
        script.push_str(&target.initialization_script());
    }
    script
}

/// Where a page script may send data: the app's own origin, plus the resolved
/// server. The server url is user-supplied and on any port (M1.7), so its
/// **origin** — never the bundled guess — is what is allowed, and nothing else.
///
/// The plugin loader's `blob:` script source is named in [`SCRIPT_SRC`] (M4.5);
/// this directive stays origin-only.
fn connect_src(target: Option<&Target>, dev: bool) -> String {
    let mut sources = vec!["'self'".to_owned()];
    if let Some(origin) = target.and_then(origin_of) {
        sources.push(origin);
    }
    if dev {
        sources.push(format!(
            "{}://{}:{}",
            DEV_CONNECT_SCHEME,
            crate::DEV_HOST,
            crate::DEV_PORT
        ));
    }
    format!("connect-src {}", sources.join(" "))
}

/// `img-src`, widened by the resolved server's origin for the same reason
/// `connect-src` is: the markdown's images are served by the server, not by the
/// bundle. No `dev` arm — Vite serves no image the bundle does not already hold.
fn img_src(target: Option<&Target>) -> String {
    match target.and_then(origin_of) {
        Some(origin) => format!("{IMG_SRC} {origin}"),
        None => IMG_SRC.to_owned(),
    }
}

/// `script-src`, with Vite's React-refresh preamble allowed in a dev build only.
/// That preamble is an inline module script, so dev needs `'unsafe-inline'`;
/// `cfg!(dev)` compiles the arm out of a production build, so it cannot leak.
fn script_src(dev: bool) -> String {
    if dev {
        format!("{SCRIPT_SRC} 'unsafe-inline'")
    } else {
        SCRIPT_SRC.to_owned()
    }
}

/// The target url's origin — scheme, host and port, no path — or `None` when it
/// does not parse or has an opaque origin. A malformed url simply widens nothing.
fn origin_of(target: &Target) -> Option<String> {
    let origin = Url::parse(&target.url).ok()?.origin().ascii_serialization();
    (origin != "null").then_some(origin)
}
