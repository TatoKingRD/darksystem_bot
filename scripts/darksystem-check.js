const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const roots = ['index.js', 'ai', 'commands', 'core', 'data', 'handlers', 'scripts'];
const files = [];

for (const root of roots) {
  const full = path.join(process.cwd(), root);
  if (!fs.existsSync(full)) continue;
  collectJsFiles(full, files);
}

let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}

if (failed) process.exit(1);
console.log(`Syntax check passed for ${files.length} JavaScript files.`);

function collectJsFiles(target, output) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    if (target.endsWith('.js')) output.push(target);
    return;
  }
  for (const entry of fs.readdirSync(target)) {
    if (entry === 'node_modules') continue;
    collectJsFiles(path.join(target, entry), output);
  }
}
