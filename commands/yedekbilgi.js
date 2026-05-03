const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getDarkSystemDatabaseStats } = require('../data/darksystemSqlite');
const { isStaff } = require('../core/darksystemPermissions');

const data = new SlashCommandBuilder()
  .setName('yedekbilgi')
  .setDescription('SQLite tablo sayaclarini ve yedek durumunu gosterir');

async function execute(interaction, client) {
  if (!isStaff(interaction.member, client.darkConfig)) {
    return interaction.reply({ content: 'Bu komutu sadece yetkililer kullanabilir.', ephemeral: true });
  }

  const stats = getDarkSystemDatabaseStats();
  const counts = stats.counts || {};
  const description = Object.entries(counts)
    .map(([table, count]) => `\`${table}\`: ${count}`)
    .join('\n') || 'Veritabani hazir degil.';

  const embed = new EmbedBuilder()
    .setTitle('Yedek Bilgisi')
    .setColor(0x5865F2)
    .setDescription(description)
    .addFields({ name: 'Dosya', value: stats.path || 'Yok', inline: false })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { data, execute };
