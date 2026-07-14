/* Calipers — measurement conversions in the context menu.
 * Copyright (c) 2026 Maxamilian X J Kidd-May. MIT licence.
 *
 * Everything normalises to millimetres. The menu is torn down and rebuilt
 * inside menus.onShown, then menus.refresh() paints it populated.
 */

"use strict";

const DEFAULT_UNIT = "mm";

/* ------------------------------------------------------------------ *
 * The unit table is the spine. Adding a unit is one row here plus an
 * entry in the order arrays — nothing else may need touching.
 * ------------------------------------------------------------------ */

const UNITS = {
  um:   { mm: 0.001,     label: "µm",   area: null  },
  mm:   { mm: 1,         label: "mm",   area: "mm²" },
  cm:   { mm: 10,        label: "cm",   area: "cm²" },
  m:    { mm: 1000,      label: "m",    area: "m²"  },
  km:   { mm: 1e6,       label: "km",   area: null  },
  thou: { mm: 0.0254,    label: "thou", area: null  },
  in:   { mm: 25.4,      label: "in",   area: "in²" },
  ft:   { mm: 304.8,     label: "ft",   area: "ft²" },
  yd:   { mm: 914.4,     label: "yd",   area: "yd²" },
  mi:   { mm: 1609344,   label: "mi",   area: null  },
};

const LENGTH_ORDER = ["um", "mm", "cm", "m", "km", "thou", "in", "ft", "yd", "mi"];
const AREA_ORDER = ["mm", "cm", "m", "in", "ft", "yd"];

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

const ALIASES = {
  um:   ["µm", "μm", "um", "micron", "microns", "micrometre", "micrometres", "micrometer", "micrometers"],
  mm:   ["mm", "millimetre", "millimetres", "millimeter", "millimeters"],
  cm:   ["cm", "centimetre", "centimetres", "centimeter", "centimeters"],
  m:    ["m", "metre", "metres", "meter", "meters"],
  km:   ["km", "kilometre", "kilometres", "kilometer", "kilometers"],
  thou: ["thou", "thous", "mil", "mils"],
  in:   ["in", "inch", "inches", "\"", "″", "”"],
  ft:   ["ft", "foot", "feet", "'", "′", "’"],
  yd:   ["yd", "yds", "yard", "yards"],
  mi:   ["mi", "mile", "miles"],
};

const ALIAS_TO_KEY = new Map();
for (const [key, list] of Object.entries(ALIASES)) {
  for (const alias of list) ALIAS_TO_KEY.set(alias, key);
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

function parseSelection(raw) {
  if (!raw) return null;
  let text = raw.replace(/ /g, " ").trim().toLowerCase();
  text = text.replace(/(\d),(?=\d{3}(\D|$))/g, "$1"); // thousands separators

  let value;
  let alias;
  let m = FRACTION_RE.exec(text);
  if (m) {
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
  const unit = alias ? ALIAS_TO_KEY.get(alias) : DEFAULT_UNIT;
  return { value, unit, assumed: !alias, mm: value * UNITS[unit].mm };
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

/* ------------------------------------------------------------------ *
 * Menu construction
 * ------------------------------------------------------------------ */

const esc = (title) => title.replace(/&/g, "&&"); // "&" is an access-key marker

const GRANT_ID = "calipers-grant";

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

function lengthTitle(mm, unitKey) {
  return `${fmt(mm / UNITS[unitKey].mm)} ${UNITS[unitKey].label}`;
}

function areaTitle(mm2, unitKey) {
  const factor = UNITS[unitKey].mm;
  return `${fmt(mm2 / (factor * factor))} ${UNITS[unitKey].area}`;
}

function addLeaf(pending, parentId, title) {
  const id = `calipers-${++idCounter}`;
  payloads.set(id, title);
  pending.push(createItem({
    id,
    parentId,
    title: esc(title),
    contexts: ["selection"],
  }));
  return id;
}

// A submenu whose own title carries the headline figure in the source unit;
// its children restate it across all units (source included — the headline
// itself is not clickable).
function addGeometrySubmenu(pending, rootId, caption, mmValue, sourceUnit, isArea) {
  const order = isArea ? AREA_ORDER : LENGTH_ORDER;
  const headlineUnit = isArea && !UNITS[sourceUnit].area ? "mm" : sourceUnit;
  const headline = isArea ? areaTitle(mmValue, headlineUnit) : lengthTitle(mmValue, headlineUnit);
  const subId = `calipers-${++idCounter}`;
  pending.push(createItem({
    id: subId,
    parentId: rootId,
    title: esc(`${caption} — ${headline}`),
    contexts: ["selection"],
  }));
  for (const unitKey of order) {
    addLeaf(pending, subId, isArea ? areaTitle(mmValue, unitKey) : lengthTitle(mmValue, unitKey));
  }
}

function addSeparator(pending, parentId) {
  pending.push(createItem({
    id: `calipers-${++idCounter}`,
    parentId,
    type: "separator",
    contexts: ["selection"],
  }));
}

async function rebuildMenu(info) {
  const instance = ++buildInstance;
  await browser.menus.removeAll();
  if (instance !== buildInstance) return;
  payloads.clear();

  const pending = [];
  const parsed = parseSelection(info.selectionText);

  if (info.selectionText === undefined) {
    // Firefox withholds selectionText from onShown without host permission
    // for the page. permissions.request needs a user action — offer one.
    pending.push(createItem({
      id: GRANT_ID,
      title: "Calipers — click to grant page access",
      contexts: ["selection"],
    }));
  } else if (!parsed) {
    const snippet = (info.selectionText || "").trim().slice(0, 30);
    pending.push(createItem({
      id: `calipers-${++idCounter}`,
      title: esc(`Calipers — “${snippet}” is not a measurement`),
      contexts: ["selection"],
      enabled: false,
    }));
  } else {
    const { value, unit, assumed, mm } = parsed;
    const rootId = `calipers-${++idCounter}`;
    pending.push(createItem({
      id: rootId,
      title: esc(`Calipers — ${fmt(value)} ${UNITS[unit].label}${assumed ? " (assumed)" : ""}`),
      contexts: ["selection"],
    }));

    // Flat children: every length unit bar the source unit.
    for (const unitKey of LENGTH_ORDER) {
      if (unitKey !== unit) addLeaf(pending, rootId, lengthTitle(mm, unitKey));
    }

    addSeparator(pending, rootId);

    // Value read as a diameter.
    addGeometrySubmenu(pending, rootId, "Ø circumference", Math.PI * mm, unit, false);
    addGeometrySubmenu(pending, rootId, "Ø radius", mm / 2, unit, false);
    addGeometrySubmenu(pending, rootId, "Ø area", (Math.PI * mm * mm) / 4, unit, true);

    addSeparator(pending, rootId);

    // Value read as a circumference.
    addGeometrySubmenu(pending, rootId, "C diameter", mm / Math.PI, unit, false);
    addGeometrySubmenu(pending, rootId, "C radius", mm / (2 * Math.PI), unit, false);
    addGeometrySubmenu(pending, rootId, "C area", (mm * mm) / (4 * Math.PI), unit, true);
  }

  await Promise.all(pending);
  if (instance !== buildInstance) return;
  await browser.menus.refresh();
}

/* ------------------------------------------------------------------ *
 * Clipboard: injected into the originating frame. Must save and restore
 * the selection, and toast the copied text.
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
          if (!granted) console.warn("Calipers: page access declined — selections stay invisible");
        })
        .catch((e) => console.warn("Calipers: permission request failed:", e.message));
      return;
    }
    const payload = payloads.get(info.menuItemId);
    if (!payload || !tab || tab.id === undefined) return;
    try {
      await browser.scripting.executeScript({
        target: { tabId: tab.id, frameIds: [info.frameId ?? 0] },
        func: copyInPage,
        args: [payload],
      });
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
  module.exports = { parseSelection, fmt, UNITS, LENGTH_ORDER, AREA_ORDER };
}
