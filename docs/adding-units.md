# Adding units and dimensions

The design contract: adding a unit is one row in the `UNITS` table in
`background.js`. If a new unit makes you touch the menu builder or the
parser, the abstraction has leaked and that is the bug to fix first.

## A new unit in an existing dimension

Add one row, positioned where it should appear in the menu (order follows the
table):

```js
fathom: { dim: "length", factor: 1828.8, label: "fathom", area: null,
          aliases: ["fathom", "fathoms"] },
```

Rules:

- The key must be unique across all dimensions, not just its own.
- `factor` converts to the dimension's base unit (mm, F, Ω, H, V, A, Hz, W).
- `area` is only meaningful for lengths; give it `null` where a squared unit
  is nonsense (µm, thou, km, mi have no area label for this reason).
- List every plausible spelling in `aliases`, exactly cased. Word aliases of
  three or more lowercase letters automatically gain UPPER and Capitalised
  variants, so list `"fathom"` once, not three times.
- Do not add a lowercase alias that collides with a case-sensitive symbol in
  another dimension. `"mw"` as a milliwatt alias is fine; auto-expansion
  skips two-letter forms precisely so it can never mint an `"MW"` that
  shadows megawatts. Check `ALIAS_TO_KEY` collisions mentally before adding
  single letters.

Then add a line or two to `test/run.js` and run `node test/run.js`.

## A new dimension

Two steps:

1. Name it in `DIMS`:

   ```js
   temperature: { name: "Temperature" },
   ```

   Only set `geometry: true` if circle maths makes sense for it (it will
   not).

2. Add its unit rows to `UNITS` with `dim: "temperature"`, factors relative
   to whichever base you pick. Pick the SI unit as base for sanity.

The menu builder, the sensible/esoteric split, and the "Assume unit" submenu
all pick the new dimension up from the tables. Nothing else changes.

Note the factor model only handles multiplicative conversions. Celsius to
Fahrenheit has an offset and would need a real change: an optional
`toBase`/`fromBase` function pair per unit row. Do that properly if the need
ever arrives; do not fake it with factors.

## Component shorthand

`SHORTHAND_RE` and `SHORTHAND_UNIT` map the `4k7` style: the letter picks the
unit (`p`/`n`/`u` are capacitance, `r`/`R`/`k`/`K`/`M` resistance) and splits
the digits around the decimal point. Extend the map if another convention
turns up.
