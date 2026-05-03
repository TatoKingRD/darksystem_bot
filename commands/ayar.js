const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../core/darksystemPermissions');

const data = new SlashCommandBuilder()
  .setName('ayar')
  .setDescription('Sunucu ayarlarini SQLite uzerinden yonetir')
  .addSubcommand((subcommand) => subcommand
    .setName('liste')
    .setDescription('Kayitli ayarlari listeler'))
  .addSubcommand((subcommand) => subcommand
    .setName('goster')
    .setDescription('Bir ayarin degerini gosterir')
    .addStringOption((option) => option.setName('anahtar').setDescription('Ayar anahtari').setRequired(true)))
  .addSubcommand((subcommand) => subcommand
    .setName('ayarla')
    .setDescription('Bir ayari kaydeder')
    .addStringOption((option) => option.setName('anahtar').setDescription('Ayar anahtari').setRequired(true))
    .addStringOption((option) => option.setName('deger').setDescription('Ayar degeri').setRequired(true)));

async function execute(interaction, client) {
  if (!isStaff(interaction.member, client.darkConfig)) {
    return interaction.reply({ content: 'Bu komutu sadece yetkililer kullanabilir.', ephemeral: true });
  }

  const repo = client.darkRepositories.settings;
  const guildId = interaction.guildId || client.darkConfig.guildId;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'liste') {
    const rows = repo.list(guildId);
    const description = rows.length
      ? rows.map((row) => `\`${row.key}\`: ${row.value}`).join('\n').slice(0, 3900)
      : 'Kayitli ayar yok.';
    return interaction.reply({ embeds: [baseEmbed('Ayar Listesi').setDescription(description)], ephemeral: true });
  }

  const key = interaction.options.getString('anahtar');
  if (subcommand === 'goster') {
    const value = repo.get(guildId, key);
    return interaction.reply({
      embeds: [baseEmbed('Ayar Degeri').addFields({ name: key, value: value ?? 'Bulunamadi', inline: false })],
      ephemeral: true,
    });
  }

  const value = interaction.options.getString('deger');
  repo.set(guildId, key, value);
  client.darkRepositories.audit.add('setting_updated', {
    guildId,
    actorId: interaction.user.id,
    targetId: key,
    details: { value },
  });
  return interaction.reply({ content: `\`${key}\` kaydedildi.`, ephemeral: true });
}

function baseEmbed(title) {
  return new EmbedBuilder().setTitle(title).setColor(0x5865F2).setTimestamp();
}

module.exports = { data, execute };
