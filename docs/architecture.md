# Architecture

## The central trick

Firefox exposes two menu APIs Chromium lacks: `menus.onShown` and
`menus.refresh()`. Between the right-click and the menu painting there is a
short window in which the menu can be rebuilt. Calipers uses it like this:

```
select "8mm"  ->  right-click  ->  onShown fires
                                     |
                                     +- read assumed unit from storage.local
                                     +- parse selectionText -> { value, unit, dim, assumed }
                                     +- normalise to the dimension's base unit
                                     +- menus.removeAll()
                                     +- create root and children, results in the titles
                                     +- menus.refresh()   <- menu paints, populated
                                               |
                                     click a leaf -> onClicked -> inject copy into the frame
```

There is no popup, no modal, no second step. The results live in the labels.

## Files

| File | Responsibility |
| --- | --- |
| `manifest.json` | MV3, gecko id, permissions, minimum versions |
| `background.js` | everything else: unit table, parser, formatter, menu builder, click handler |
| `test/run.js` | node harness for the pure parser and formatter logic |
| `test/page.html` | manual acceptance checklist for `web-ext run` |

One background script is deliberate. There is no build step and no bundler,
and a ~450 line tool does not need modules.

## The unit table

`UNITS` in `background.js` is the spine. Each key is a canonical unit carrying
its dimension, its factor to that dimension's base unit, a display label, an
area label for lengths, and every accepted spelling. `DIMS` names the
dimensions; length is the only one with `geometry: true`. Menu order follows
the table's insertion order.

Base units per dimension: mm, F, Ω, H, V, A, Hz, W.

## Parsing

`parseSelection(text, assumeKey)` tries three shapes in order:

1. Component shorthand: `4k7` is 4.7 kΩ, `4u7` is 4.7 µF, `100R` is 100 Ω.
2. Fractions: `3/8 in`, `1 1/2"`.
3. Decimals and scientific notation: `8mm`, `1.2e3 mm`, `.5 in`.

Before matching, non-breaking spaces are normalised and thousands separators
stripped. The unit is optional; when absent the stored assumed unit applies
and the result is flagged `assumed`.

The alias regex is built from the table with alternatives sorted longest
first, otherwise `m` swallows `metres`. A trailing `(?![A-Za-z])` guard stops
`8 minutes` reading as 8 metres. Matching is case sensitive because
electronics demands it (`2mW` and `2MW` differ by nine orders of magnitude),
but word aliases of three letters or more get automatic UPPER and Capitalised
variants so `2 Metres` and `8MM` still parse.

## Formatting

`fmt()`: six significant figures, exponential outside roughly [1e-4, 1e7),
trailing zeros trimmed. Titles must stay terse.

`sensible()` decides what deserves front-page space: values between 0.001 and
a million. Everything else (8 mm in miles, 100 nF in farads) goes under the
"More units" submenu. If nothing is sensible, everything is shown flat.

## Menu shape

```
Calipers: 8 mm
  8000 µm
  0.8 cm
  ... (readable conversions, source unit excluded)
  More units >        (the extreme ones, only if any)
  ---------           (lengths only from here)
  Ø circumference: 25.1327 mm >
  Ø radius: 4 mm >
  Ø area: 50.2655 mm² >
  ---------
  C diameter: 2.54648 mm >
  C radius: 1.27324 mm >
  C area: 5.09296 mm² >
  ---------           (assumed values only)
  Assume unit >  ->  Length > / Capacitance > / ... (current unit ticked)
```

Each geometry submenu title carries the headline figure in the source unit,
so the common case needs no hover. Its children restate the figure across the
readable units, source included, because the headline itself is not
clickable.

Unparseable selections get a single disabled item. All titles pass through
`esc()`, which doubles `&`, because a bare ampersand is an access-key marker
in menu titles.

## The assumed unit

Bare numbers default to mm. The "Assume unit" submenu (shown only when the
value was assumed) stores a different unit in `storage.local` under
`assumeUnit`. It persists until changed and a toast confirms each switch.
This exists for reading tables of unlabelled capacitor or resistor values.

## Clipboard

MV3 background scripts have no reliable clipboard, so `onClicked` injects
`copyInPage()` into the originating frame (`info.frameId`) via
`scripting.executeScript`. The injected function:

1. saves the current selection ranges,
2. copies via a hidden textarea and `execCommand("copy")`, falling back to
   `navigator.clipboard`,
3. restores the ranges, otherwise the user's selection vanishes,
4. shows a brief fixed-position toast with the copied text.

A `Map` from generated menu item id to payload string backs the click
handler; it is cleared on every rebuild. Injected functions must be fully
self-contained since they are serialised into the page, which is why
`copyInPage` and `toastInPage` share no code.

## Races and lifecycle

- Every rebuild stamps an incrementing `buildInstance`. The build checks the
  stamp after each await and abandons itself if a newer `onShown` superseded
  it. `onHidden` bumps the counter to cancel in-flight work for a closed menu.
- `menus.removeAll()` is awaited and all `create()` calls settle before
  `refresh()`, otherwise the menu can flash empty.
- Event page suspension can wipe menus, so a placeholder item is reseeded at
  top level and on `onInstalled` and `onStartup`. `onShown` rebuilds
  regardless, so drift does not matter.
- Privileged pages (`about:*`, AMO, `view-source:`) refuse script injection.
  The menu still computes; only the copy is lost, with a console warning.

## The host permission lesson

The original design assumed `activeTab` would suffice. It does not: Firefox
only passes `selectionText` to `onShown` when the extension holds host
permission for the page, and `activeTab` is granted on menu item click, which
is after the menu was built. Hence `host_permissions: ["<all_urls>"]`. MV3
treats host permissions as optional, so if the grant is missing the menu
offers a single "Calipers: grant page access" item whose click handler calls
`permissions.request` (allowed there because a menu click is a user action).
