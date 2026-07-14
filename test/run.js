// Node harness for the pure parser/formatter logic in background.js.
// Run: node test/run.js
"use strict";

const { parseSelection, fmt, UNITS } = require("../background.js");

let failures = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  →  ${JSON.stringify(actual)}${ok ? "" : `  (expected ${JSON.stringify(expected)})`}`);
}

const convert = (parsed, unit) => fmt(parsed.mm / UNITS[unit].mm);

// Acceptance: 8mm → children include 0.314961 in, 314.961 thou
let p = parseSelection("8mm");
check("8mm parses to mm", p.unit, "mm");
check("8mm not assumed", p.assumed, false);
check("8mm root value", `${fmt(p.value)} ${UNITS[p.unit].label}`, "8 mm");
check("8mm → in", convert(p, "in"), "0.314961");
check("8mm → thou", convert(p, "thou"), "314.961");

// Acceptance: 3 inch → Ø circumference headline 9.42478 in
p = parseSelection("3 inch");
check("3 inch parses to in", p.unit, "in");
check("Ø circumference of 3 in", fmt((Math.PI * p.mm) / UNITS.in.mm), "9.42478");

// Acceptance: 1 1/2" → 1.5 in
p = parseSelection('1 1/2"');
check('1 1/2" unit', p.unit, "in");
check('1 1/2" value', p.value, 1.5);

// Bare fraction
p = parseSelection("3/8 in");
check("3/8 in value", p.value, 0.375);

// Acceptance: 42 (no unit) → assumed mm
p = parseSelection("42");
check("42 assumed", p.assumed, true);
check("42 unit", p.unit, "mm");

// Acceptance: hello → unparseable
check("hello rejected", parseSelection("hello"), null);

// Thousands separators
p = parseSelection("1,000 mm");
check("1,000 mm value", p.value, 1000);

// Pitfall: 8 minutes must NOT be 8 metres
check("8 minutes rejected", parseSelection("8 minutes"), null);

// m does not swallow metres; words work
p = parseSelection("2 metres");
check("2 metres unit", p.unit, "m");

// Symbols
check("5′ is feet", parseSelection("5′").unit, "ft");
check("5' is feet", parseSelection("5'").unit, "ft");
check("2″ is inches", parseSelection("2″").unit, "in");

// mil/thou aliases
check("10 mils is thou", parseSelection("10 mils").unit, "thou");

// Scientific notation
check("1.2e3 mm value", parseSelection("1.2e3 mm").value, 1200);

// Formatter edges
check("fmt trims zeros", fmt(8000), "8000");
check("fmt tiny → exponential", fmt(8e-6), "8e-6");
check("fmt huge → exponential", fmt(12345678), "1.23457e+7");
check("fmt 6 sig figs", fmt(0.3149606299), "0.314961");

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll checks passed.");
