#!/usr/bin/env node
/**
 * Sync buildNumber from app.json into pbxproj CURRENT_PROJECT_VERSION.
 * Run after expo prebuild to ensure Xcode uses the correct build number.
 */
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const buildNumber = appJson.expo.ios.buildNumber || '1';

const pbxprojPath = path.join(__dirname, '..', 'ios', 'Aria.xcodeproj', 'project.pbxproj');
if (!fs.existsSync(pbxprojPath)) {
  console.log('No pbxproj found, skipping sync.');
  process.exit(0);
}

let pbx = fs.readFileSync(pbxprojPath, 'utf8');
pbx = pbx.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);
fs.writeFileSync(pbxprojPath, pbx);
console.log(`pbxproj CURRENT_PROJECT_VERSION synced to ${buildNumber}`);
