const fs = require('fs');
const path = require('path');
const { DatabaseSync, backup } = require('node:sqlite');

let activeDatabase = null;
let activePath = null;

function initDarkSystemDatabase(sqlitePath, logger = console) {
  if (activeDatabase) return activeDatabase;
  activePath = sqlitePath;
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  activeDatabase = new DatabaseSync(sqlitePath);
  activeDatabase.exec('PRAGMA foreign_keys = ON;');
  activeDatabase.exec('PRAGMA journal_mode = DELETE;');
  activeDatabase.exec('PRAGMA busy_timeout = 5000;');
  runMigrations(activeDatabase);
  logger.info?.('sqlite_ready', { path: sqlitePath });
  return activeDatabase;
}

function getDarkSystemDatabase() {
  return activeDatabase;
}

function getDarkSystemDatabasePath() {
  return activePath;
}

function closeDarkSystemDatabase() {
  if (!activeDatabase) return;
  activeDatabase.close();
  activeDatabase = null;
}

async function backupDarkSystemDatabase(destinationPath) {
  if (!activeDatabase) throw new Error('Database is not initialized.');
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  await backup(activeDatabase, destinationPath);
  return destinationPath;
}

function getDarkSystemDatabaseStats() {
  if (!activeDatabase) return { ready: false };
  const tables = [
    'registrations',
    'warnings',
    'invite_users',
    'fun_counters',
    'ai_history',
    'reminders',
    'poll_votes',
    'giveaways',
    'giveaway_entries',
    'settings',
    'audit_log',
  ];
  const counts = {};
  for (const table of tables) {
    counts[table] = activeDatabase.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
  }
  return { ready: true, path: activePath, counts };
}

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS registrations (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      isim TEXT,
      yas INTEGER,
      ign TEXT,
      oyun_id TEXT,
      nereden_duydun TEXT,
      rank TEXT,
      kayit_tarihi INTEGER,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT,
      sebep TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invite_users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      real_count INTEGER NOT NULL DEFAULT 0,
      fake_count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS invite_members (
      guild_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      inviter_id TEXT,
      invite_code TEXT,
      joined_at INTEGER,
      left_at INTEGER,
      is_fake INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS fun_counters (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      target_user_id TEXT NOT NULL DEFAULT '',
      count INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id, command_name, target_user_id)
    );

    CREATE TABLE IF NOT EXISTS ai_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      guild_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      minutes INTEGER NOT NULL,
      started_by TEXT,
      started_at INTEGER NOT NULL,
      message_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, command_name)
    );

    CREATE TABLE IF NOT EXISTS poll_votes (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      choice TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (message_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS giveaways (
      giveaway_id TEXT PRIMARY KEY,
      message_id TEXT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      ends_at INTEGER NOT NULL,
      created_by TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      winner_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS giveaway_entries (
      giveaway_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (giveaway_id, user_id),
      FOREIGN KEY (giveaway_id) REFERENCES giveaways(giveaway_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      guild_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (guild_id, key)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      guild_id TEXT,
      actor_id TEXT,
      target_id TEXT,
      payload TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(guild_id, user_id, active);
    CREATE INDEX IF NOT EXISTS idx_ai_history_user ON ai_history(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event_type, created_at);
  `);

  db.prepare(`
    INSERT INTO schema_meta (key, value, updated_at)
    VALUES ('schema_version', '1', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(nowSeconds());
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

module.exports = {
  initDarkSystemDatabase,
  getDarkSystemDatabase,
  getDarkSystemDatabasePath,
  closeDarkSystemDatabase,
  backupDarkSystemDatabase,
  getDarkSystemDatabaseStats,
};
