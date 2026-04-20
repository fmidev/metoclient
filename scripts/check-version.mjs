/**
 * Pre-commit hook script that verifies the package.json version
 * has not been decreased compared to the previous commit.
 *
 * Uses semver.lt() for comparison, which correctly handles
 * pre-release versions (e.g. 1.0.0-beta.1 < 1.0.0).
 */
import { execSync } from 'node:child_process';
import { lt } from 'semver';

/**
 * Execute a git command and return trimmed stdout.
 *
 * @param {string} cmd Git command to run.
 * @returns {string} Command output.
 */
function git(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

/**
 * Extract the "version" field from a JSON string.
 *
 * @param {string} json Raw JSON content.
 * @returns {string} The version string.
 */
function extractVersion(json) {
  const pkg = JSON.parse(json);
  return pkg.version;
}

// --- Main ---

// Get the version from the previous commit.
// If there is no previous commit (initial commit), skip the check.
let oldVersion;
try {
  const oldJson = git('git show HEAD:package.json');
  oldVersion = extractVersion(oldJson);
} catch {
  console.log('No previous commit found, skipping version check.');
  process.exit(0);
}

// Get the version that is about to be committed (staged).
// Falls back to HEAD version if package.json is not staged.
let newVersion;
try {
  const newJson = git('git show :package.json');
  newVersion = extractVersion(newJson);
} catch {
  console.log('Could not read staged package.json, skipping version check.');
  process.exit(0);
}

if (lt(newVersion, oldVersion)) {
  console.error(
    `Version check failed: ${newVersion} is lower than the previous version ${oldVersion}`
  );
  process.exit(1);
}

console.log(`Version check passed: ${oldVersion} -> ${newVersion}`);
