const path = require('path');

const REQUIRED_ENV = ['BOT_TOKEN', 'GUILD_ID'];
const RECOMMENDED_ENV = [
  'OWNER_IDS',
  'AI_SAHIP_ID',
  'LOG_KANAL_ID',
  'MODERATOR_ROL_ID',
  'KAYITLI_ROL_ID',
  'KAYITSIZ_ROL_ID',
  'ARSIV_KANAL_ID',
  'GOREV_KANAL_ID',
  'DAVET_LOG_KANAL_ID',
  'AI_ARSIV_KANAL_ID',
  'GROQ_API_KEY',
];

function loadDarkSystemConfig(options = {}) {
  const missingRequired = REQUIRED_ENV.filter((key) => !hasValue(process.env[key]));
  const missingRecommended = RECOMMENDED_ENV.filter((key) => !hasValue(process.env[key]));
  const allowMissing = options.allowMissing === true;

  if (missingRequired.length > 0 && !allowMissing) {
    throw new Error(
      'Missing required environment variables: ' + missingRequired.join(', ') +
      '. Check .env.example before starting the bot.'
    );
  }

  const ownerIds = parseIdList(process.env.OWNER_IDS || process.env.AI_SAHIP_ID || '');
  const sqlitePath = process.env.SQLITE_PATH || path.join(process.cwd(), 'data', 'darksystem.sqlite');

  return {
    botToken: process.env.BOT_TOKEN || '',
    guildId: process.env.GUILD_ID || '',
    ownerIds,
    sqlitePath,
    logLevel: process.env.LOG_LEVEL || 'info',
    commandCooldownMs: parsePositiveInt(process.env.COMMAND_COOLDOWN_MS, 3000),
    statusRotationMs: parsePositiveInt(process.env.STATUS_ROTATION_MS, 30000),
    requiredEnv: REQUIRED_ENV,
    recommendedEnv: RECOMMENDED_ENV,
    missingRequired,
    missingRecommended,
  };
}

function parseIdList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

module.exports = {
  REQUIRED_ENV,
  RECOMMENDED_ENV,
  loadDarkSystemConfig,
};
