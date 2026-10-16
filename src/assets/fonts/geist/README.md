# `Geist-VariableFont_wght.ttf`

Bundled interface face (spec 030 §Two font roles): the default for `--oc-font-ui`,
so a build resolves the UI offline.

- Source: `~/dev/fonts/geist/Geist-VariableFont_wght.ttf`, family `Geist`, one `wght` axis (100–900).
- Copied byte-identical; sha256 `39fb61a385b9bbac6ff86c03a948d32f6d5626cd993e4a7e1a62d73d3a54bc79`.
- Licence: `OFL.txt` beside it (SIL Open Font License 1.1, Copyright 2024 The Geist Project Authors).
- Declared in `src/theme/base.css` under the family the webview resolves, `Geist`. A CSS
  `@font-face` also shadows a machine-installed `Geist`, so the shipped build never
  depends on the host.
- The italic and static cuts are not bundled: nothing in the app asks for an italic or a
  non-variable weight, and the variable axis covers 400/500/600.
