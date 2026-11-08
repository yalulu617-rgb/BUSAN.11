#!/usr/bin/env node
/**
 * BUSAN V42 Syntax Checker
 * Validates all 21 JavaScript modules for syntax errors.
 */

import { readFileSync } from 'fs';

const files = [
  'ute/ute_storage.js', 'ute/ute_network.js', 'ute/ute_knowledge.js',
  'ute/ute_place.js', 'ute/ute_city.js', 'ute/ute_weather.js',
  'ute/ute_navigation.js', 'ute/ute_budget.js', 'ute/ute_ai.js',
  'ute/ute_context.js', 'ute/ute_main.js',
  'services/nearby.js', 'services/utils.js',
  'data/recommended.js',
  'js/firebase.js', 'js/ui.js', 'js/wallet.js',
  'js/memory.js', 'js/itinerary.js', 'js/app.js',
  'components/renderers.js'
];

let pass = 0;
let fail = 0;
const failures = [];

for (const file of files) {
  try {
    new Function(readFileSync(file, 'utf8'));
    console.log(`✅ OK: ${file}`);
    pass++;
  } catch (e) {
    console.error(`❌ ERR: ${file} — ${e.message}`);
    failures.push({ file, error: e.message });
    fail++;
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Syntax Check: PASS=${pass}/${files.length}  FAIL=${fail}`);
console.log(`${'─'.repeat(60)}`);

if (fail > 0) {
  console.error('\nFailed files:');
  failures.forEach(f => console.error(`  ${f.file}: ${f.error}`));
  process.exit(1);
}

console.log('\n✅ All syntax checks passed.');
