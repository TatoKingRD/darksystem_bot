const path = require('path');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { backupDarkSystemDatabase } = require('../data/darksystemSqlite');
const { isStaff } = require('../core/darksystemPermissions');

const data = new SlashCommandBuilder()
  .setName('yedekal')
  .setDescription('SQLite veritabaninin guvenli yedegini alir');

async function execute(interaction, client) {
  if (!isStaff(interaction.member, client.darkConfig)) {
    return interaction.reply({ content: 'Bu komutu sadece yetkililer kullanabilir.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(process.cwd(), 'backups', `darksystem-${stamp}.sqlite`);
  await backupDarkSystemDatabase(backupPath);
  client.darkRepositories.audit.add('database_backup_created', {
    guildId: interaction.guildId,
    actorId: interaction.user.id,
    details: { backupPath },
  });

  const embed = new EmbedBuilder()
    .setTitle('Yedek Alindi')
    .setColor(0x57F287)
    .setDescription(backupPath)
    .setFooter({ text: 'Yedek dosyasini repo icine commit etme.' })
    .setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}

module.exports = { data, execute };
