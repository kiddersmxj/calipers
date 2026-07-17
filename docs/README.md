# Calipers documentation

- [architecture.md](architecture.md): how the extension works, module by module, and the Firefox quirks it has to dance around.
- [adding-units.md](adding-units.md): the one-row recipe for new units and dimensions.
- [release.md](release.md): building, testing, signing and installing a new version.

Quick orientation: the whole extension is `manifest.json` plus a single
`background.js`. Select a measurement, right-click, and the context menu is
torn down and rebuilt with the conversions in the item labels before the menu
paints. Clicking an item copies its text. That is all it does, on purpose.
