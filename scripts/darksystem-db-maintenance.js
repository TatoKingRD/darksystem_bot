const fs = require('fs');
const path = require('path');

require('dotenv').config();

const {
  initDarkSystemDatabase,
  getDarkSystemDatabaseStats,
  backupDarkSystemDatabase,
  closeDarkSystemDatabase,
} = require('../data/darksystemSqlite');

const action = process.argv[2] || 'status';
const sqlitePath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'darksystem.sqlite');

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function run() {
  if (action === 'init') {
    initDarkSystemDatabase(sqlitePath, console);
    printStats();
    closeDarkSystemDatabase();
    return;
  }

  if (action === 'status') {
    if (!fs.existsSync(sqlitePath)) {
      console.log(`SQLite file does not exist yet: ${sqlitePath}`);
      console.log('Run npm run db:init or start the bot once to create it.');
      return;
    }
    initDarkSystemDatabase(sqlitePath, console);
    printStats();
    closeDarkSystemDatabase();
    return;
  }

  if (action === 'backup') {
    if (!fs.existsSync(sqlitePath)) {
      throw new Error(`SQLite file does not exist yet: ${sqlitePath}`);
    }
    initDarkSystemDatabase(sqlitePath, console);
    const destination = path.join(process.cwd(), 'backups', `darksystem-manual-${timestamp()}.sqlite`);
    await backupDarkSystemDatabase(destination);
    closeDarkSystemDatabase();
    console.log(`Backup created: ${destination}`);
    return;
  }

  throw new Error('Unknown action. Use init, status, or backup.');
}

function printStats() {
  const stats = getDarkSystemDatabaseStats();
  console.log(`SQLite ready: ${stats.ready}`);
  console.log(`SQLite path: ${stats.path}`);
  for (const [table, count] of Object.entries(stats.counts || {})) {
    console.log(`${table}: ${count}`);
  }
}

function timestamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    '-',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join('');
}
