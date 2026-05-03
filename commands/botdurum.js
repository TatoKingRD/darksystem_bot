const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDarkSystemDatabaseStats, getDarkSystemDatabasePath } = require('../data/darksystemSqlite');

const data = new SlashCommandBuilder()
  .setName('botdurum')
  .setDescription('Bot sagligini, veritabanini ve komut durumunu gosterir');

async function execute(interaction, client) {
  const config = client.darkConfig || {};
  const registry = client.darkCommandRegistry || {};
  const dbStats = getDarkSystemDatabaseStats();
  const uptimeSeconds = Math.floor(process.uptime());
  const memory = process.memoryUsage();
  const guildCount = client.guilds.cache.size;
  const memberCount = client.guilds.cache.reduce((total, guild) => total + (guild.memberCount || 0), 0);

  const embed = new EmbedBuilder()
    .setTitle('DarkSystem Bot Durumu')
    .setColor(0x57F287)
    .addFields(
      { name: 'Uptime', value: formatDuration(uptimeSeconds), inline: true },
      { name: 'Ping', value: `${client.ws.ping} ms`, inline: true },
      { name: 'Node', value: process.version, inline: true },
      { name: 'Sunucu / Uye', value: `${guildCount} / ${memberCount}`, inline: true },
      { name: 'Slash Komut', value: `${registry.commandData?.length || client.commands?.size || 0}`, inline: true },
      { name: 'RAM', value: `${Math.round(memory.rss / 1024 / 1024)} MB`, inline: true },
      { name: 'SQLite', value: dbStats.ready ? `Hazir\n${getDarkSystemDatabasePath()}` : 'Hazir degil', inline: false }
    )
    .setTimestamp();

  if (config.missingRecommended?.length) {
    embed.addFields({
      name: 'Eksik onerilen env',
      value: config.missingRecommended.slice(0, 12).join(', '),
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

function formatDuration(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}g ${hours}s ${minutes}dk`;
}

module.exports = { data, execute };
