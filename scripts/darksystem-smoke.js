const fs = require('fs');
const path = require('path');

process.env.BOT_TOKEN = process.env.BOT_TOKEN || 'smoke-token';
process.env.GUILD_ID = process.env.GUILD_ID || '123456789012345678';
process.env.SQLITE_PATH = path.join(process.cwd(), '.tmp', 'darksystem-smoke.sqlite');
process.env.LOG_LEVEL = 'error';

const { loadDarkSystemConfig } = require('../core/darksystemConfig');
const { createDarkSystemLogger } = require('../core/darksystemLogger');
const { initDarkSystemDatabase, getDarkSystemDatabaseStats, closeDarkSystemDatabase } = require('../data/darksystemSqlite');
const { createDarkSystemRepositories } = require('../data/darksystemRepositories');
const { loadDarkSystemCommandRegistry } = require('../core/darksystemCommandRegistry');
const { createDarkSystemRegistrationCache } = require('../core/darksystemRegistrationCache');

fs.mkdirSync(path.dirname(process.env.SQLITE_PATH), { recursive: true });
if (fs.existsSync(process.env.SQLITE_PATH)) fs.unlinkSync(process.env.SQLITE_PATH);

const config = loadDarkSystemConfig();
const logger = createDarkSystemLogger({ level: 'error' });
initDarkSystemDatabase(config.sqlitePath, logger);

const repos = createDarkSystemRepositories();
repos.settings.set(config.guildId, 'smoke', 'ok');
if (repos.settings.get(config.guildId, 'smoke') !== 'ok') {
  throw new Error('Settings repository smoke check failed.');
}

const kayit = createDarkSystemRegistrationCache(config.guildId, logger);
kayit.set('111111111111111111', { isim: 'Smoke', yas: 18, tarih: 1 });
if (!kayit.get('111111111111111111')) {
  throw new Error('Registration cache smoke check failed.');
}

const registry = loadDarkSystemCommandRegistry(path.join(process.cwd(), 'commands'), logger);
for (const expected of ['botdurum', 'kurulum', 'ayar', 'yedekal', 'yedekbilgi']) {
  if (!registry.commands.has(expected)) throw new Error(`Missing command in registry: ${expected}`);
}

const stats = getDarkSystemDatabaseStats();
if (!stats.ready || stats.counts.settings < 1 || stats.counts.registrations < 1) {
  throw new Error('Database stats smoke check failed.');
}

closeDarkSystemDatabase();
console.log('DarkSystem smoke check passed.');
