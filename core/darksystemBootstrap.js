const path = require('path');
const { Client, GatewayIntentBits, Partials, ActivityType, REST, Routes } = require('discord.js');
require('dotenv').config();

const { loadDarkSystemConfig } = require('./darksystemConfig');
const { createDarkSystemLogger } = require('./darksystemLogger');
const { initDarkSystemDatabase, closeDarkSystemDatabase } = require('../data/darksystemSqlite');
const { createDarkSystemRepositories } = require('../data/darksystemRepositories');
const { createDarkSystemRegistrationCache } = require('./darksystemRegistrationCache');
const { loadDarkSystemCommandRegistry } = require('./darksystemCommandRegistry');
const { createDarkSystemCooldowns } = require('./darksystemCooldowns');

async function startDarkSystemBot() {
  const config = loadDarkSystemConfig();
  const logger = createDarkSystemLogger({ level: config.logLevel });
  initDarkSystemDatabase(config.sqlitePath, logger);
  const repositories = createDarkSystemRepositories();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildInvites,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.darkConfig = config;
  client.darkLogger = logger;
  client.darkRepositories = repositories;
  client.kayitVerisi = createDarkSystemRegistrationCache(config.guildId, logger);

  const registry = loadDarkSystemCommandRegistry(path.join(process.cwd(), 'commands'), logger);
  client.commands = registry.commands;
  client.darkCommandRegistry = registry;

  wireProcessGuards(logger);
  wireDiscordEvents(client, config, logger, registry);

  await client.login(config.botToken);
  return client;
}

function wireDiscordEvents(client, config, logger, registry) {
  const cooldowns = createDarkSystemCooldowns(config.commandCooldownMs);
  const interactionHandler = require('../handlers/interactionHandler');

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const result = cooldowns.check(interaction.user.id);
        if (!result.allowed) {
          const seconds = (result.remainingMs / 1000).toFixed(1);
          return interaction.reply({ content: `Cok hizli! ${seconds} saniye bekle.`, ephemeral: true });
        }
      }
      return interactionHandler(client, interaction);
    } catch (error) {
      logger.error('interaction_unhandled_error', {
        command: interaction.commandName,
        customId: interaction.customId,
        error,
      });
      return safeInteractionError(interaction);
    }
  });

  const kelimeOyunu = require('../handlers/kelimeOyunu');
  const aiAsistan = require('../handlers/aiAsistan');
  client.on('messageCreate', (message) => {
    kelimeOyunu(message);
    aiAsistan(message, client).catch((error) => logger.error('ai_asistan_error', { error }));
  });

  const hosgeldinGonder = require('../commands/hosgeldin');
  const dmHatirlatmaBaslat = require('../commands/dmHatirlatma');
  const davetHandler = require('../handlers/davethandler');
  client.on('guildMemberAdd', async (member) => {
    if (process.env.KAYITSIZ_ROL_ID) await member.roles.add(process.env.KAYITSIZ_ROL_ID).catch((error) => logger.warn('kayitsiz_role_add_failed', { error }));
    await hosgeldinGonder(member).catch((error) => logger.warn('welcome_send_failed', { error }));
    dmHatirlatmaBaslat(member);
    await davetHandler.uyeKatildi(member).catch((error) => logger.error('invite_member_join_failed', { error }));
  });

  const gorusuruzGonder = require('../handlers/gorusuruz');
  client.on('guildMemberRemove', async (member) => {
    await davetHandler.uyeAyrildi(member).catch((error) => logger.error('invite_member_leave_failed', { error }));
    await gorusuruzGonder(member).catch((error) => logger.warn('goodbye_send_failed', { error }));
  });

  client.on('inviteCreate', async (invite) => {
    if (invite.guild) await davetHandler.davetleriCachele(invite.guild).catch((error) => logger.warn('invite_cache_failed', { error }));
  });
  client.on('inviteDelete', async (invite) => {
    if (invite.guild) await davetHandler.davetleriCachele(invite.guild).catch((error) => logger.warn('invite_cache_failed', { error }));
  });

  client.once('ready', async () => {
    logger.info('bot_ready', { tag: client.user.tag, commandCount: registry.commandData.length });
    await deployGuildCommands(client, config, registry.commandData, logger);
    startPresenceRotation(client, config, logger);
    await loadRuntimeData(client, logger);
  });
}

async function deployGuildCommands(client, config, commandData, logger) {
  const rest = new REST().setToken(config.botToken);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, config.guildId),
      { body: commandData }
    );
    logger.info('slash_commands_registered', { count: commandData.length, guildId: config.guildId });
  } catch (error) {
    logger.error('slash_commands_register_failed', { error });
  }
}

function startPresenceRotation(client, config, logger) {
  const ownerId = config.ownerIds[0];
  let ownerName = 'Bilinmiyor';

  const refreshOwner = async () => {
    if (!ownerId) return;
    const owner = await client.users.fetch(ownerId).catch(() => null);
    if (owner) ownerName = owner.username;
  };

  refreshOwner().catch((error) => logger.warn('owner_name_fetch_failed', { error }));

  const statuses = [
    { name: 'AniZen TR', type: ActivityType.Watching },
    { name: '/yardim', type: ActivityType.Playing },
    { name: () => `Sahibi: ${ownerName}`, type: ActivityType.Listening },
    {
      name: () => {
        const memberCount = client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0);
        return `${client.guilds.cache.size} sunucu - ${memberCount} uye`;
      },
      type: ActivityType.Watching,
    },
  ];

  let index = 0;
  const update = () => {
    const status = statuses[index % statuses.length];
    const name = typeof status.name === 'function' ? status.name() : status.name;
    client.user.setPresence({ activities: [{ name, type: status.type }], status: 'online' });
    index++;
  };

  update();
  setInterval(update, config.statusRotationMs);
}

async function loadRuntimeData(client, logger) {
  const { arsivdenYukle } = require('../handlers/arsiv');
  const { gorevleriYukle } = require('../commands/tekrarla');
  const davetHandler = require('../handlers/davethandler');

  for (const [, guild] of client.guilds.cache) {
    await arsivdenYukle(guild, client.kayitVerisi).catch((error) => logger.warn('archive_load_failed', { guildId: guild.id, error }));
  }
  await gorevleriYukle(client).catch((error) => logger.error('reminder_load_failed', { error }));
  await davetHandler.baslat(client).catch((error) => logger.error('invite_start_failed', { error }));
}

async function safeInteractionError(interaction) {
  const message = { content: 'Beklenmeyen bir hata olustu. Loglara bakilmali.', ephemeral: true };
  if (interaction.replied || interaction.deferred) return interaction.followUp(message).catch(() => {});
  return interaction.reply(message).catch(() => {});
}

function wireProcessGuards(logger) {
  process.on('unhandledRejection', (error) => logger.error('unhandled_rejection', { error }));
  process.on('uncaughtException', (error) => logger.error('uncaught_exception', { error }));
  process.once('SIGINT', () => shutdown(logger, 0));
  process.once('SIGTERM', () => shutdown(logger, 0));
}

function shutdown(logger, code) {
  logger.info('shutdown_started');
  closeDarkSystemDatabase();
  process.exit(code);
}

module.exports = { startDarkSystemBot };
