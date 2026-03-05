#!/usr/bin/env node
/**
 * Auto-increment iOS buildNumber in app.json.
 * Usage: node scripts/bump-build.js
 */
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const current = parseInt(appJson.expo.ios.buildNumber || '0', 10);
const next = current + 1;
appJson.expo.ios.buildNumber = String(next);

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
console.log(`Build number bumped: ${current} → ${next}`);
