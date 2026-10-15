//! How the policy reaches the document — the one place with webview specifics.

/// A script that puts `policy` into the document as a `<meta http-equiv>`.
///
/// The element has to be a child of **`<head>`**. At document start the parser
/// has not created `head` yet, and an element appended to the document element
/// lands as a *sibling* of `head` — which WebKit never enforces (measured: the
/// meta was a child of `HTML`, and `eval` still ran, while a fetch to a foreign
/// origin reached its listener). `document.write` is not an alternative: called
/// from a user script before the parser starts it empties the document and the
/// page never loads (also measured).
///
/// So the policy is applied as soon as `head` exists — immediately when it
/// already does, otherwise from the first mutation that creates it. `policy` is
/// JSON-serialised, never string-interpolated: no policy (nor a target url it
/// carries) can break out of the literal.
pub(super) fn meta_script(policy: &str) -> String {
    let literal = serde_json::to_string(policy)
        .expect("a policy is a string")
        // `serde_json` does not escape U+2028/U+2029; escape them so correctness
        // never depends on the engine's JS version (as `target.rs` does).
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029");
    format!(
        "(function(){{var p={literal};\
function put(){{var m=document.createElement('meta');\
m.setAttribute('http-equiv','Content-Security-Policy');\
m.setAttribute('content',p);document.head.appendChild(m);}}\
if(document.head){{put();return;}}\
new MutationObserver(function(_,o){{if(document.head){{o.disconnect();put();}}}})\
.observe(document,{{childList:true,subtree:true}});}})();"
    )
}

#[cfg(test)]
mod tests;
