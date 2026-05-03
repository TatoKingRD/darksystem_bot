const fs = require('fs');
const os = require('os');
const path = require('path');

require('dotenv').config();

const MIN_NODE = [22, 5, 0];
const REQUIRED_ENV = ['BOT_TOKEN', 'GUILD_ID'];
const RECOMMENDED_ENV = ['OWNER_IDS', 'SQLITE_PATH', 'LOG_LEVEL'];
const checks = [];

record(
  'node_version',
  compareVersions(parseNodeVersion(process.versions.node), MIN_NODE) >= 0,
  `Node ${process.versions.node}`,
  'Install Node.js 22.5.0 or newer before starting the bot.'
);

record(
  'platform',
  true,
  `${os.type()} ${os.release()} ${os.arch()}`,
  ''
);

record(
  'package_lock',
  fs.existsSync(path.join(process.cwd(), 'package-lock.json')),
  'package-lock.json present',
  'Run npm install once and commit package-lock.json.'
);

record(
  'env_file',
  fs.existsSync(path.join(process.cwd(), '.env')),
  fs.existsSync(path.join(process.cwd(), '.env')) ? '.env present' : '.env missing',
  'Copy .env.example to .env on the server and fill real values locally.'
);

for (const key of REQUIRED_ENV) {
  const value = process.env[key];
  record(
    `env_${key.toLowerCase()}`,
    hasRealValue(value),
    `${key} ${hasRealValue(value) ? 'set' : 'missing or placeholder'}`,
    `Set ${key} in the server .env file.`
  );
}

for (const key of RECOMMENDED_ENV) {
  const value = process.env[key];
  record(
    `recommended_${key.toLowerCase()}`,
    hasRealValue(value),
    `${key} ${hasRealValue(value) ? 'set' : 'not set'}`,
    `Set ${key} when preparing production.`
  );
}

const sqlitePath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'darksystem.sqlite');
const sqliteDir = path.resolve(process.cwd(), path.dirname(sqlitePath));
let sqliteWritable = false;
try {
  fs.mkdirSync(sqliteDir, { recursive: true });
  fs.accessSync(sqliteDir, fs.constants.W_OK);
  sqliteWritable = true;
} catch (error) {
  sqliteWritable = false;
}

record(
  'sqlite_directory',
  sqliteWritable,
  `${sqliteDir} writable`,
  'Create the SQLite directory and make sure the bot user can write to it.'
);

const hardFailures = checks.filter((check) => !check.ok && isHardFailure(check.name));
for (const check of checks) {
  const status = check.ok ? 'OK' : isHardFailure(check.name) ? 'FAIL' : 'WARN';
  console.log(`[${status}] ${check.name}: ${check.message}`);
  if (!check.ok) console.log(`      ${check.fix}`);
}

if (hardFailures.length > 0) {
  console.error(`Preflight failed with ${hardFailures.length} blocking issue(s).`);
  process.exit(1);
}

console.log('Preflight passed. Recommended warnings can be resolved before production start.');

function record(name, ok, message, fix) {
  checks.push({ name, ok, message, fix });
}

function isHardFailure(name) {
  return name === 'node_version' ||
    name === 'package_lock' ||
    name === 'env_bot_token' ||
    name === 'env_guild_id' ||
    name === 'sqlite_directory';
}

function hasRealValue(value) {
  if (!value || !String(value).trim()) return false;
  const normalized = String(value).trim().toLowerCase();
  return !normalized.startsWith('replace-with') &&
    !normalized.startsWith('gercek-') &&
    !normalized.includes('placeholder');
}

function parseNodeVersion(version) {
  return String(version)
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => Number.isFinite(part) ? part : 0);
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    const delta = (left[index] || 0) - (right[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}
