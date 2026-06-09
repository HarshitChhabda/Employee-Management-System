/**
 * Version Bump Script
 * 
 * Usage:
 *   node scripts/bump-version.js patch    # 1.0.0 -> 1.0.1
 *   node scripts/bump-version.js minor    # 1.0.0 -> 1.1.0
 *   node scripts/bump-version.js major    # 1.0.0 -> 2.0.0
 *   node scripts/bump-version.js 1.2.3    # explicit version
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const bumpType = args[0] || 'patch';

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const currentVersion = packageJson.version;
let newVersion;

function isValidVersion(v) {
  return /^\d+\.\d+\.\d+$/.test(v);
}

function bumpSemver(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: throw new Error(`Invalid bump type: ${type}`);
  }
}

if (isValidVersion(bumpType)) {
  newVersion = bumpType;
} else {
  newVersion = bumpSemver(currentVersion, bumpType);
}

console.log(`Version: ${currentVersion} -> ${newVersion}`);

packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`Updated package.json`);

try {
  execSync('npm install --package-lock-only', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('Updated package-lock.json');
} catch(e) {
  console.log('Could not update package-lock.json (may not exist)');
}

try {
  execSync('git add package.json package-lock.json', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  execSync(`git tag v${newVersion}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log(`Created git tag: v${newVersion}`);
  console.log(`\nNext steps:`);
  console.log(`  git push && git push --tags`);
  console.log(`  (This will trigger the CI/CD release pipeline)`);
} catch(e) {
  console.log('\nGit commands failed (not a git repo or no changes):');
  console.log(`  Manually tag: git tag v${newVersion}`);
  console.log(`  Then push: git push && git push --tags`);
}
