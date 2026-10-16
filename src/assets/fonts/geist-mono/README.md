# `GeistMono-VariableFont_wght.ttf`

Bundled **code** face (spec 030 §Two font roles): the **fallback** behind the
machine's `GeistMono Nerd Font`, so a machine without the cask still renders code
in a mono face rather than a proportional or serif one.

- Source: `~/dev/fonts/geist-mono/GeistMono-VariableFont_wght.ttf`, family `Geist Mono`, one `wght` axis (100–900).
- Copied byte-identical; sha256 `e8acfc9d5331733427582e4c906174dde5fe57af8f82cdaf906e80d729ff2b18`.
- Licence: `OFL.txt` beside it (SIL Open Font License 1.1, Copyright 2024 The Geist Project Authors).
- Declared in `src/theme/base.css` as `Geist Mono`, the second entry of the
  `--oc-font-code` stack (`foundations.css`). The plain variable cut lacks most
  box-drawing and icon glyphs, which is why the Nerd Font cut is preferred where
  it is installed.
- The italic and static cuts are not bundled, for the same reason as the interface face.
