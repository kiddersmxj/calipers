// Node harness for the pure parser/formatter logic in background.js.
// Run: node test/run.js
"use strict";

const { parseSelection, fmt, sensible, UNITS } = require("../background.js");

let failures = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ->  ${JSON.stringify(actual)}${ok ? "" : `  (expected ${JSON.stringify(expected)})`}`);
}

const convert = (parsed, unit) => fmt(parsed.base / UNITS[unit].factor);

// Lengths
let p = parseSelection("8mm");
check("8mm parses to mm", p.unit, "mm");
check("8mm not assumed", p.assumed, false);
check("8mm root value", `${fmt(p.value)} ${UNITS[p.unit].label}`, "8 mm");
check("8mm to in", convert(p, "in"), "0.314961");
check("8mm to thou", convert(p, "thou"), "314.961");

p = parseSelection("3 inch");
check("3 inch parses to in", p.unit, "in");
check("circumference of 3 in diameter", fmt((Math.PI * p.base) / UNITS.in.factor), "9.42478");

p = parseSelection('1 1/2"');
check('1 1/2" unit', p.unit, "in");
check('1 1/2" value', p.value, 1.5);

p = parseSelection("3/8 in");
check("3/8 in value", p.value, 0.375);

p = parseSelection("42");
check("42 assumed", p.assumed, true);
check("42 unit defaults to mm", p.unit, "mm");

p = parseSelection("42", "uF");
check("42 with uF assumption", p.unit, "uF");
check("42 uF dimension", p.dim, "capacitance");

check("hello rejected", parseSelection("hello"), null);
check("8 minutes rejected", parseSelection("8 minutes"), null);
check("1,000 mm value", parseSelection("1,000 mm").value, 1000);
check("2 metres unit", parseSelection("2 metres").unit, "m");
check("2 Metres sloppy case", parseSelection("2 Metres").unit, "m");
check("8MM uppercase symbol", parseSelection("8MM").unit, "mm");
check("5' is feet", parseSelection("5'").unit, "ft");
check("2 inch symbol", parseSelection("2″").unit, "in");
check("10 mils is thou", parseSelection("10 mils").unit, "thou");
check("1.2e3 mm value", parseSelection("1.2e3 mm").value, 1200);

// Electronics
p = parseSelection("100nF");
check("100nF unit", p.unit, "nF");
check("100nF to uF", convert(p, "uF"), "0.1");
check("100nF to pF", convert(p, "pF"), "100000");

p = parseSelection("4.7 µF");
check("4.7 µF unit", p.unit, "uF");

p = parseSelection("10 kΩ");
check("10 kΩ unit", p.unit, "kohm");
check("10 kΩ in ohms", p.base, 10000);

check("10 kohm word form", parseSelection("10 kohm").unit, "kohm");
check("470 ohms", parseSelection("470 ohms").unit, "ohm");
check("100R resistor style", parseSelection("100R").unit, "ohm");
check("2.2mH unit", parseSelection("2.2mH").unit, "mH");
check("16 MHz unit", parseSelection("16 MHz").unit, "MHz");
check("3.3v unit", parseSelection("3.3v").unit, "V");
check("20mA unit", parseSelection("20mA").unit, "mA");
check("250mW unit", parseSelection("250mW").unit, "mW");
check("case matters: 2MW is megawatts", parseSelection("2MW").unit, "MW");

// Component shorthand
p = parseSelection("4k7");
check("4k7 unit", p.unit, "kohm");
check("4k7 value", p.value, 4.7);
check("4k7 in ohms", p.base, 4700);
check("4u7 is 4.7 µF", parseSelection("4u7").unit, "uF");
check("4R7 is 4.7 Ω", parseSelection("4R7").value, 4.7);

// Sensible-unit filter
check("readable value kept", sensible(0.8), true);
check("tiny value hidden", sensible(8e-6), false);
check("huge value hidden", sensible(4.9e8), false);

// Formatter edges
check("fmt trims zeros", fmt(8000), "8000");
check("fmt tiny exponential", fmt(8e-6), "8e-6");
check("fmt huge exponential", fmt(12345678), "1.23457e+7");
check("fmt 6 sig figs", fmt(0.3149606299), "0.314961");

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nAll checks passed.");
