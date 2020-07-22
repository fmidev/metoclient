#!/usr/bin/env node

// https://stackoverflow.com/questions/31773546/the-best-way-to-run-npm-install-for-nested-folders
const fs = require('fs');
const { resolve } = require('path');
const { join } = require('path');
const cp = require('child_process');
const os = require('os');

// get library path
const lib = resolve(__dirname, '../examples/');

fs.readdirSync(lib).forEach(function (mod) {
  const modPath = join(lib, mod);
  // ensure path has package.json
  if (!fs.existsSync(join(modPath, 'package.json'))) return;
  console.log(mod);

  // npm binary based on OS
  const npmCmd = os.platform().startsWith('win') ? 'npm.cmd' : 'npm';

  // install folder
  cp.spawnSync(npmCmd, ['i'], {
    env: process.env,
    cwd: modPath,
    stdio: 'inherit',
  });

  // build
  cp.spawnSync(npmCmd, ['run', 'build'], {
    env: process.env,
    cwd: modPath,
    stdio: 'inherit',
  });
});
