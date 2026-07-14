# Calipers

A personal Firefox (MV3) add-on. Select a measurement on any page (`8mm`,
`3 inch`, `1 1/2"`, `100nF`, `4k7`, even a bare `42`) and right-click: the
context menu itself shows the conversions, computed live. Click any entry to
copy it to the clipboard.

What it understands:

- Lengths: µm, mm, cm, m, km, thou/mil, in, ft, yd, mi, in symbols
  (`"`, `′`) or words ("2 metres"), fractions (`3/8`, `1 1/2`), scientific
  notation, thousands separators.
- Electronics: capacitance (pF to F), resistance (mΩ to MΩ, including `100R`
  and `4k7` shorthand), inductance, voltage, current, frequency, power.
- Lengths also get circle geometry: the value read as a diameter (Ø) or a
  circumference (C).

Only readable conversions appear up front; the extreme ones (8 mm in miles)
sit under "More units". A bare number is assumed to be mm by default; the
"Assume unit" submenu switches that to any unit, which is handy when reading
tables of capacitors or resistors.

Firefox-only by design: it leans on `menus.onShown` plus `menus.refresh()`,
which Chromium lacks, to rebuild the menu in the instant between the
right-click and the menu painting.

## Develop

```bash
npm i -g web-ext
web-ext lint     # must be clean
web-ext run      # scratch profile with live reload
```

Note: Firefox only hands the selection text to `menus.onShown` when the
extension has host permission for the page. If the menu offers
"Calipers: grant page access", click it once and accept.

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
`version` in `manifest.json` before every re-sign, duplicates are rejected.

## Licence

MIT, Maxamilian X J Kidd-May
