/* Calipers: measurement conversions in the context menu.
 * Copyright (c) 2026 Maxamilian X J Kidd-May. MIT licence.
 *
 * Everything normalises to a base unit per dimension (millimetres for
 * length). The menu is torn down and rebuilt inside menus.onShown, then
 * menus.refresh() paints it populated.
 */

"use strict";

const DEFAULT_UNIT = "mm";

/* ------------------------------------------------------------------ *
 * The unit table is the spine. Adding a unit is one row: dimension,
 * factor to the dimension's base unit, display label, area label for
 * lengths, and every plausible spelling. Nothing else needs touching.
 * ------------------------------------------------------------------ */

const DIMS = {
  length:      { name: "Length",      geometry: true },
  capacitance: { name: "Capacitance" },
  resistance:  { name: "Resistance" },
  inductance:  { name: "Inductance" },
  voltage:     { name: "Voltage" },
  current:     { name: "Current" },
  frequency:   { name: "Frequency" },
  power:       { name: "Power" },
};

const UNITS = {
  // length: factor is millimetres
  um:   { dim: "length", factor: 0.001,   label: "µm",   area: null,  aliases: ["µm", "μm", "um", "UM", "micron", "microns", "micrometre", "micrometres", "micrometer", "micrometers"] },
  mm:   { dim: "length", factor: 1,       label: "mm",   area: "mm²", aliases: ["mm", "MM", "millimetre", "millimetres", "millimeter", "millimeters"] },
  cm:   { dim: "length", factor: 10,      label: "cm",   area: "cm²", aliases: ["cm", "CM", "centimetre", "centimetres", "centimeter", "centimeters"] },
  m:    { dim: "length", factor: 1000,    label: "m",    area: "m²",  aliases: ["m", "metre", "metres", "meter", "meters"] },
  km:   { dim: "length", factor: 1e6,     label: "km",   area: null,  aliases: ["km", "KM", "kilometre", "kilometres", "kilometer", "kilometers"] },
  thou: { dim: "length", factor: 0.0254,  label: "thou", area: null,  aliases: ["thou", "thous", "mil", "mils"] },
  in:   { dim: "length", factor: 25.4,    label: "in",   area: "in²", aliases: ["in", "IN", "inch", "inches", "\"", "″", "”"] },
  ft:   { dim: "length", factor: 304.8,   label: "ft",   area: "ft²", aliases: ["ft", "FT", "foot", "feet", "'", "′", "’"] },
  yd:   { dim: "length", factor: 914.4,   label: "yd",   area: "yd²", aliases: ["yd", "YD", "yds", "yard", "yards"] },
  mi:   { dim: "length", factor: 1609344, label: "mi",   area: null,  aliases: ["mi", "MI", "mile", "miles"] },

  // capacitance: factor is farads
  pF:   { dim: "capacitance", factor: 1e-12, label: "pF", aliases: ["pF", "pf", "picofarad", "picofarads"] },
  nF:   { dim: "capacitance", factor: 1e-9,  label: "nF", aliases: ["nF", "nf", "nanofarad", "nanofarads"] },
  uF:   { dim: "capacitance", factor: 1e-6,  label: "µF", aliases: ["µF", "μF", "uF", "uf", "microfarad", "microfarads"] },
  mF:   { dim: "capacitance", factor: 1e-3,  label: "mF", aliases: ["mF", "mf", "millifarad", "millifarads"] },
  F:    { dim: "capacitance", factor: 1,     label: "F",  aliases: ["F", "farad", "farads"] },

  // resistance: factor is ohms
  mohm: { dim: "resistance", factor: 1e-3, label: "mΩ", aliases: ["mΩ", "milliohm", "milliohms"] },
  ohm:  { dim: "resistance", factor: 1,    label: "Ω",  aliases: ["Ω", "R", "r", "ohm", "ohms"] },
  kohm: { dim: "resistance", factor: 1e3,  label: "kΩ", aliases: ["kΩ", "KΩ", "kohm", "kohms", "kiloohm", "kilohm", "kilohms", "kiloohms"] },
  Mohm: { dim: "resistance", factor: 1e6,  label: "MΩ", aliases: ["MΩ", "Mohm", "MOhm", "megohm", "megohms", "megaohm", "megaohms", "meg", "megs"] },

  // inductance: factor is henries
  nH:   { dim: "inductance", factor: 1e-9, label: "nH", aliases: ["nH", "nh", "nanohenry", "nanohenries"] },
  uH:   { dim: "inductance", factor: 1e-6, label: "µH", aliases: ["µH", "μH", "uH", "uh", "microhenry", "microhenries"] },
  mH:   { dim: "inductance", factor: 1e-3, label: "mH", aliases: ["mH", "mh", "millihenry", "millihenries"] },
  H:    { dim: "inductance", factor: 1,    label: "H",  aliases: ["H", "henry", "henries", "henrys"] },

  // voltage: factor is volts
  uV:   { dim: "voltage", factor: 1e-6, label: "µV", aliases: ["µV", "μV", "uV", "uv", "microvolt", "microvolts"] },
  mV:   { dim: "voltage", factor: 1e-3, label: "mV", aliases: ["mV", "mv", "millivolt", "millivolts"] },
  V:    { dim: "voltage", factor: 1,    label: "V",  aliases: ["V", "v", "volt", "volts"] },
  kV:   { dim: "voltage", factor: 1e3,  label: "kV", aliases: ["kV", "kv", "kilovolt", "kilovolts"] },

  // current: factor is amps
  uA:   { dim: "current", factor: 1e-6, label: "µA", aliases: ["µA", "μA", "uA", "ua", "microamp", "microamps", "microampere", "microamperes"] },
  mA:   { dim: "current", factor: 1e-3, label: "mA", aliases: ["mA", "ma", "milliamp", "milliamps", "milliampere", "milliamperes"] },
  A:    { dim: "current", factor: 1,    label: "A",  aliases: ["A", "amp", "amps", "ampere", "amperes"] },
  kA:   { dim: "current", factor: 1e3,  label: "kA", aliases: ["kA", "kiloamp", "kiloamps"] },

  // frequency: factor is hertz
  Hz:   { dim: "frequency", factor: 1,   label: "Hz",  aliases: ["Hz", "hz", "hertz"] },
  kHz:  { dim: "frequency", factor: 1e3, label: "kHz", aliases: ["kHz", "khz", "kilohertz"] },
  MHz:  { dim: "frequency", factor: 1e6, label: "MHz", aliases: ["MHz", "mhz", "megahertz"] },
  GHz:  { dim: "frequency", factor: 1e9, label: "GHz", aliases: ["GHz", "ghz", "gigahertz"] },

  // power: factor is watts
  mW:   { dim: "power", factor: 1e-3, label: "mW", aliases: ["mW", "mw", "milliwatt", "milliwatts"] },
  W:    { dim: "power", factor: 1,    label: "W",  aliases: ["W", "w", "watt", "watts"] },
  kW:   { dim: "power", factor: 1e3,  label: "kW", aliases: ["kW", "kw", "kilowatt", "kilowatts"] },
  MW:   { dim: "power", factor: 1e6,  label: "MW", aliases: ["MW", "megawatt", "megawatts"] },
};

// Menu order per dimension follows the table's insertion order.
function dimKeys(dim) {
  return Object.keys(UNITS).filter((k) => UNITS[k].dim === dim);
}

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

// Sloppy-case tolerance for word aliases (metres, Ohms, KILOHERTZ) without
// breaking case-sensitive symbols (mW vs MW, mΩ vs MΩ).
function caseVariants(aliases) {
  const out = new Set(aliases);
  for (const a of aliases) {
    if (/^[a-z]{3,}$/.test(a)) {
      out.add(a.toUpperCase());
      out.add(a[0].toUpperCase() + a.slice(1));
    }
  }
  return [...out];
}

const ALIAS_TO_KEY = new Map();
for (const [key, unit] of Object.entries(UNITS)) {
  for (const alias of caseVariants(unit.aliases)) {
    if (!ALIAS_TO_KEY.has(alias)) ALIAS_TO_KEY.set(alias, key);
  }
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Longest alias first, or "m" swallows "metres". Trailing letter guard so
// "8 minutes" is not 8 metres.
const UNIT_ALTS = [...ALIAS_TO_KEY.keys()]
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join("|");
const UNIT_RE = `(?:(${UNIT_ALTS})(?![A-Za-z]))?`;
const NUM_RE = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)(?:[eE][+-]?\\d+)?";

const FRACTION_RE = new RegExp(`^(?:(\\d+)\\s+)?(\\d+)\\s*/\\s*(\\d+)\\s*${UNIT_RE}$`);
const DECIMAL_RE = new RegExp(`^(${NUM_RE})\\s*${UNIT_RE}$`);

// Component shorthand: 4k7 is 4.7 kΩ, 4u7 is 4.7 µF, 4R7 is 4.7 Ω.
const SHORTHAND_RE = /^(\d+)\s*(p|n|u|µ|μ|r|R|k|K|M)\s*(\d+)$/;
const SHORTHAND_UNIT = {
  p: "pF", n: "nF", u: "uF", "µ": "uF", "μ": "uF",
  r: "ohm", R: "ohm", k: "kohm", K: "kohm", M: "Mohm",
};

function parseSelection(raw, assumeKey = DEFAULT_UNIT) {
  if (!raw) return null;
  let text = raw.replace(/ /g, " ").trim();
  text = text.replace(/(\d),(?=\d{3}(\D|$))/g, "$1"); // thousands separators

  let value;
  let alias;
  let unit;
  let m = SHORTHAND_RE.exec(text);
  if (m) {
    value = parseFloat(`${m[1]}.${m[3]}`);
    unit = SHORTHAND_UNIT[m[2]];
    alias = m[2];
  } else if ((m = FRACTION_RE.exec(text))) {
    const denominator = parseInt(m[3], 10);
    if (!denominator) return null;
    value = (m[1] ? parseInt(m[1], 10) : 0) + parseInt(m[2], 10) / denominator;
    alias = m[4];
  } else if ((m = DECIMAL_RE.exec(text))) {
    value = parseFloat(m[1]);
    alias = m[2];
  } else {
    return null;
  }

  if (!Number.isFinite(value)) return null;
  if (!unit) unit = alias ? ALIAS_TO_KEY.get(alias) : assumeKey;
  if (!UNITS[unit]) return null;
  return {
    value,
    unit,
    dim: UNITS[unit].dim,
    assumed: !alias,
    base: value * UNITS[unit].factor,
  };
}

/* ------------------------------------------------------------------ *
 * Formatting: six significant figures, exponential outside sane range,
 * trailing zeros trimmed. Titles must be terse.
 * ------------------------------------------------------------------ */

function fmt(n) {
  if (!Number.isFinite(n)) return String(n);
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e7 || abs < 1e-4) {
    return n.toExponential(5).replace(/\.?0+e/, "e");
  }
  let s = n.toPrecision(6);
  if (s.includes("e")) s = Number(s).toString();
  if (s.includes(".")) s = s.replace(/\.?0+$/, "");
  return s;
}

// A conversion is worth front-page space when the number stays readable.
// The rest (8 mm in miles, 100 nF in farads) goes under "More units".
function sensible(v) {
  const abs = Math.abs(v);
  return v === 0 || (abs >= 0.001 && abs < 1e6);
}

/* ------------------------------------------------------------------ *
 * Menu construction
 * ------------------------------------------------------------------ */

const GRANT_ID = "calipers-grant";
const ASSUME_PREFIX = "calipers-assume-";

const esc = (title) => title.replace(/&/g, "&&"); // "&" is an access-key marker

let buildInstance = 0;   // races: a fast second right-click supersedes the first
let idCounter = 0;
const payloads = new Map(); // menu item id → string to copy

function createItem(props) {
  return new Promise((resolve, reject) => {
    browser.menus.create(props, () => {
      const err = browser.runtime.lastError;
      if (err) reject(err);
      else resolve(props.id);
    });
  });
}

function unitTitle(base, key) {
  return `${fmt(base / UNITS[key].factor)} ${UNITS[key].label}`;
}

function areaTitleFor(baseArea, key) {
  const f = UNITS[key].factor;
  return `${fmt(baseArea / (f * f))} ${UNITS[key].area}`;
}

function addLeaf(pending, parentId, title) {
  const id = `calipers-${++idCounter}`;
  payloads.set(id, title);
  const props = { id, title: esc(title), contexts: ["selection"] };
  if (parentId !== undefined) props.parentId = parentId;
  pending.push(createItem(props));
  return id;
}

function addSubmenu(pending, parentId, title) {
  const id = `calipers-${++idCounter}`;
  const props = { id, title: esc(title), contexts: ["selection"] };
  if (parentId !== undefined) props.parentId = parentId;
  pending.push(createItem(props));
  return id;
}

function addSeparator(pending, parentId) {
  pending.push(createItem({
    id: `calipers-${++idCounter}`,
    parentId,
    type: "separator",
    contexts: ["selection"],
  }));
}

// Flat conversions with the unreadable ones tucked into "More units".
function addConversions(pending, parentId, base, dim, sourceUnit) {
  const main = [];
  const esoteric = [];
  for (const key of dimKeys(dim)) {
    if (key === sourceUnit) continue;
    (sensible(base / UNITS[key].factor) ? main : esoteric).push(key);
  }
  if (main.length === 0) {
    main.push(...esoteric);
    esoteric.length = 0;
  }
  for (const key of main) addLeaf(pending, parentId, unitTitle(base, key));
  if (esoteric.length) {
    const moreId = addSubmenu(pending, parentId, "More units");
    for (const key of esoteric) addLeaf(pending, moreId, unitTitle(base, key));
  }
}

// A submenu whose own title carries the headline figure in the source unit;
// its children restate it across the readable units (source included, since
// the headline itself is not clickable).
function addGeometrySubmenu(pending, rootId, caption, baseValue, sourceUnit, isArea) {
  const headlineUnit = isArea && !UNITS[sourceUnit].area ? "mm" : sourceUnit;
  const headline = isArea
    ? areaTitleFor(baseValue, headlineUnit)
    : unitTitle(baseValue, headlineUnit);
  const subId = addSubmenu(pending, rootId, `${caption}: ${headline}`);
  for (const key of dimKeys("length")) {
    if (isArea && !UNITS[key].area) continue;
    const v = isArea
      ? baseValue / (UNITS[key].factor * UNITS[key].factor)
      : baseValue / UNITS[key].factor;
    if (key !== headlineUnit && !sensible(v)) continue;
    addLeaf(pending, subId, isArea ? areaTitleFor(baseValue, key) : unitTitle(baseValue, key));
  }
}

function addAssumeSubmenu(pending, rootId, currentKey) {
  const assumeId = addSubmenu(pending, rootId, "Assume unit");
  for (const [dim, meta] of Object.entries(DIMS)) {
    const dimId = addSubmenu(pending, assumeId, meta.name);
    for (const key of dimKeys(dim)) {
      pending.push(createItem({
        id: `${ASSUME_PREFIX}${key}`,
        parentId: dimId,
        title: esc(`${key === currentKey ? "✓ " : ""}${UNITS[key].label}`),
        contexts: ["selection"],
      }));
    }
  }
}

async function rebuildMenu(info) {
  const instance = ++buildInstance;

  let assumeUnit = DEFAULT_UNIT;
  try {
    const stored = await browser.storage.local.get("assumeUnit");
    if (stored.assumeUnit && UNITS[stored.assumeUnit]) assumeUnit = stored.assumeUnit;
  } catch (e) {
    console.warn("Calipers: storage read failed:", e.message);
  }
  if (instance !== buildInstance) return;

  await browser.menus.removeAll();
  if (instance !== buildInstance) return;
  payloads.clear();

  const pending = [];
  const parsed = parseSelection(info.selectionText, assumeUnit);

  if (info.selectionText === undefined) {
    // Firefox withholds selectionText from onShown without host permission
    // for the page. permissions.request needs a user action, so offer one.
    pending.push(createItem({
      id: GRANT_ID,
      title: "Calipers: grant page access",
      contexts: ["selection"],
    }));
  } else if (!parsed) {
    const snippet = (info.selectionText || "").trim().slice(0, 30);
    pending.push(createItem({
      id: `calipers-${++idCounter}`,
      title: esc(`Calipers: "${snippet}" is not a measurement`),
      contexts: ["selection"],
      enabled: false,
    }));
  } else {
    const { value, unit, dim, assumed, base } = parsed;
    const rootId = addSubmenu(
      pending,
      undefined,
      `Calipers: ${fmt(value)} ${UNITS[unit].label}${assumed ? " (assumed)" : ""}`
    );

    addConversions(pending, rootId, base, dim, unit);

    if (DIMS[dim].geometry) {
      addSeparator(pending, rootId);

      // Value read as a diameter.
      addGeometrySubmenu(pending, rootId, "Ø circumference", Math.PI * base, unit, false);
      addGeometrySubmenu(pending, rootId, "Ø radius", base / 2, unit, false);
      addGeometrySubmenu(pending, rootId, "Ø area", (Math.PI * base * base) / 4, unit, true);

      addSeparator(pending, rootId);

      // Value read as a circumference.
      addGeometrySubmenu(pending, rootId, "C diameter", base / Math.PI, unit, false);
      addGeometrySubmenu(pending, rootId, "C radius", base / (2 * Math.PI), unit, false);
      addGeometrySubmenu(pending, rootId, "C area", (base * base) / (4 * Math.PI), unit, true);
    }

    if (assumed) {
      addSeparator(pending, rootId);
      addAssumeSubmenu(pending, rootId, assumeUnit);
    }
  }

  await Promise.all(pending);
  if (instance !== buildInstance) return;
  await browser.menus.refresh();
}

/* ------------------------------------------------------------------ *
 * Page injections. Each function must be self-contained: it is
 * serialised into the originating frame.
 * ------------------------------------------------------------------ */

function copyInPage(text) {
  const selection = window.getSelection();
  const ranges = [];
  for (let i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i).cloneRange());
  }

  let copied = false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:-100px;left:-100px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    copied = document.execCommand("copy");
    ta.remove();
  } catch (e) {
    copied = false;
  }

  selection.removeAllRanges();
  for (const range of ranges) selection.addRange(range);

  if (!copied) navigator.clipboard.writeText(text).catch(() => {});

  const toast = document.createElement("div");
  toast.textContent = `Copied: ${text}`;
  toast.style.cssText =
    "position:fixed;bottom:16px;right:16px;z-index:2147483647;" +
    "background:#222;color:#fff;padding:6px 12px;border-radius:6px;" +
    "font:13px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4);" +
    "pointer-events:none;opacity:0;transition:opacity .15s";
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = "1"; });
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 1400);
}

function toastInPage(text) {
  const toast = document.createElement("div");
  toast.textContent = text;
  toast.style.cssText =
    "position:fixed;bottom:16px;right:16px;z-index:2147483647;" +
    "background:#222;color:#fff;padding:6px 12px;border-radius:6px;" +
    "font:13px system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.4);" +
    "pointer-events:none;opacity:0;transition:opacity .15s";
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = "1"; });
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 1400);
}

function inject(tab, info, func, arg) {
  return browser.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [info.frameId ?? 0] },
    func,
    args: [arg],
  });
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

async function seedPlaceholder() {
  try {
    await browser.menus.removeAll();
    await createItem({
      id: "calipers-placeholder",
      title: "Calipers",
      contexts: ["selection"],
    });
  } catch (e) {
    console.warn("Calipers: seeding placeholder failed:", e.message);
  }
}

if (typeof browser !== "undefined") {
  browser.menus.onShown.addListener((info) => {
    if (!info.contexts.includes("selection")) return;
    rebuildMenu(info).catch((e) => console.warn("Calipers: rebuild failed:", e.message));
  });

  browser.menus.onHidden.addListener(() => {
    buildInstance++; // abandon any in-flight rebuild for the closed menu
  });

  browser.menus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === GRANT_ID) {
      // Must run directly in the user-action handler.
      browser.permissions.request({ origins: ["<all_urls>"] })
        .then((granted) => {
          if (!granted) console.warn("Calipers: page access declined, selections stay invisible");
        })
        .catch((e) => console.warn("Calipers: permission request failed:", e.message));
      return;
    }

    if (typeof info.menuItemId === "string" && info.menuItemId.startsWith(ASSUME_PREFIX)) {
      const key = info.menuItemId.slice(ASSUME_PREFIX.length);
      if (!UNITS[key]) return;
      try {
        await browser.storage.local.set({ assumeUnit: key });
        if (tab && tab.id !== undefined) {
          await inject(tab, info, toastInPage, `Calipers: bare numbers now read as ${UNITS[key].label}`);
        }
      } catch (e) {
        console.warn("Calipers: could not set assumed unit:", e.message);
      }
      return;
    }

    const payload = payloads.get(info.menuItemId);
    if (!payload || !tab || tab.id === undefined) return;
    try {
      await inject(tab, info, copyInPage, payload);
    } catch (e) {
      // Privileged pages (about:*, AMO, view-source:) refuse injection.
      console.warn(`Calipers: cannot copy on this page: ${e.message}`);
    }
  });

  browser.runtime.onInstalled.addListener(seedPlaceholder);
  browser.runtime.onStartup.addListener(seedPlaceholder);
  seedPlaceholder();
}

// Test hook: lets the parser and formatter run under node.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseSelection, fmt, sensible, UNITS, DIMS, dimKeys };
}
