const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { REQUIRED_ENV, RECOMMENDED_ENV } = require('../core/darksystemConfig');
const { isStaff } = require('../core/darksystemPermissions');

const data = new SlashCommandBuilder()
  .setName('kurulum')
  .setDescription('Bot kurulum kontrol listesini gosterir');

async function execute(interaction, client) {
  if (!isStaff(interaction.member, client.darkConfig)) {
    return interaction.reply({ content: 'Bu komutu sadece yetkililer kullanabilir.', ephemeral: true });
  }

  const requiredLines = REQUIRED_ENV.map((key) => lineForEnv(key));
  const recommendedLines = RECOMMENDED_ENV.map((key) => lineForEnv(key));

  const embed = new EmbedBuilder()
    .setTitle('DarkSystem Kurulum Kontrolu')
    .setColor(0x5865F2)
    .addFields(
      { name: 'Zorunlu', value: requiredLines.join('\n') || 'Tamam', inline: false },
      { name: 'Onerilen', value: recommendedLines.slice(0, 20).join('\n') || 'Tamam', inline: false },
      { name: 'Veri', value: `SQLite: ${process.env.SQLITE_PATH || 'data/darksystem.sqlite'}`, inline: false }
    )
    .setFooter({ text: 'Gercek secret degerlerini Discord mesajina yazma.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

function lineForEnv(key) {
  return `${process.env[key] ? '[ok]' : '[eksik]'} ${key}`;
}

module.exports = { data, execute };
