# Building, testing and releasing

## Development loop

```bash
web-ext lint      # must stay at 0 errors, 0 warnings
node test/run.js  # parser and formatter checks, must all pass
web-ext run --start-url "file://$PWD/test/page.html"
```

`web-ext run` opens a scratch Firefox profile with live reload and the manual
acceptance page from `test/page.html`. Walk the page's checklist after any
change to the menu builder or parser. Temporary installs die at restart;
that is what signing is for.

`web-ext-config.mjs` keeps `test/`, the docs and the licence out of lint and
out of the packaged xpi.

## Signing

Release Firefox refuses unsigned add-ons, no exceptions worth having (do not
bother with userChrome.js, autoconfig, or the signature pref; the first two
are fragile and the third needs Developer Edition). Unlisted signing is free,
automated, and keeps the add-on off the public site.

Credentials are AMO API keys from
<https://addons.mozilla.org/developers/addon/api/key/>, stored in the shell
environment as:

- `MOZILLAISSUER`: the JWT issuer, looks like `user:12345678:123`
- `MOZILLAJWT`: the JWT secret

Then:

```bash
# 1. bump "version" in manifest.json first; AMO rejects duplicate versions
source ~/.bashrc
web-ext sign --channel=unlisted \
  --api-key="$MOZILLAISSUER" --api-secret="$MOZILLAJWT"
```

The command uploads, waits through "Waiting for validation..." and "Waiting
for approval..." (a few minutes, all automated on the unlisted channel), and
downloads the signed file to `web-ext-artifacts/<hash>-<version>.xpi`.

The gecko id `calipers@kiddersmxj.github.io` in the manifest is what ties
every upload to the same add-on on AMO. Never change it.

## Installing

```bash
firefox web-ext-artifacts/<the new>.xpi
```

Firefox prompts to install. Two things matter on first install:

1. Accept the install.
2. Grant the optional "Access your data for all websites" permission, either
   in the install prompt or later under about:addons, Calipers, Permissions.
   Without it Firefox hides the selected text from the extension and the
   menu can only offer "Calipers: grant page access" (clicking that once
   also fixes it).

Upgrades keep the grant, so this is a first-install concern only.

## Version history

- 0.1.0 (2026-07-14): first signed release. Lengths with circle geometry,
  electronics dimensions, readable-first menus with "More units", switchable
  assumed unit, copy with selection preserved.

## Manifest notes, learned the hard way

- `data_collection_permissions` (declared `"none"`) is required by AMO for
  new extensions. The key only exists from Firefox 140, which is why
  `strict_min_version` is 140.0 rather than the 115.0 originally planned,
  and why `gecko_android` pins 142.0. Desktop-only tool, so neither hurts.
- `host_permissions: ["<all_urls>"]` is load-bearing; see
  [architecture.md](architecture.md) for why activeTab is not enough.
