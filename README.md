# Calipers

A personal Firefox (MV3) add-on. Select a measurement on any page — `8mm`,
`3 inch`, `1 1/2"`, even a bare `42` — and right-click: the context menu itself
shows the conversions, computed live. Every length unit, plus circle geometry
(the value read as a diameter Ø or a circumference C). Click any entry to copy
it to the clipboard.

Firefox-only by design: it leans on `menus.onShown` + `menus.refresh()`, which
Chromium lacks, to rebuild the menu in the instant between the right-click and
the menu painting.

## Develop

```bash
npm i -g web-ext
web-ext lint     # must be clean
web-ext run      # scratch profile with live reload
```

## Test the parser/formatter

```bash
node test/run.js
```

## Install permanently (release Firefox)

Release Firefox only installs signed add-ons. Sign unlisted (free, no review,
no public listing) with credentials from
<https://addons.mozilla.org/developers/addon/api/key/>:

```bash
web-ext sign --channel=unlisted --api-key="user:…" --api-secret="…"
```

The signed `.xpi` lands in `web-ext-artifacts/`; drag it onto Firefox. Bump
`version` in `manifest.json` before every re-sign — duplicates are rejected.

## Licence

MIT © Maxamilian X J Kidd-May
