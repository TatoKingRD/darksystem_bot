// commands/sil.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('sil')
  .setDescription('Kanaldaki mesajları siler [Yetkili]')
  .addIntegerOption(opt => opt
    .setName('sayi')
    .setDescription('Kaç mesaj silinsin? (1-100)')
    .setRequired(true)
    .setMinValue(1)
    .setMaxValue(100)
  );

async function execute(interaction) {
  const yetkili = (process.env.MODERATOR_ROL_ID
    ? interaction.member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : interaction.member.permissions.has('Administrator')) ||
    (process.env.ASISTAN_ROL_ID ? interaction.member.roles.cache.has(process.env.ASISTAN_ROL_ID) : false);

  if (!yetkili) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const sayi = interaction.options.getInteger('sayi');

  await interaction.deferReply({ ephemeral: true });

  const silinen = await interaction.channel.bulkDelete(sayi, true).catch(() => null);

  if (!silinen) return interaction.editReply({ content: '❌ Mesajlar silinemedi. Botun yeterli yetkisi var mı?' });

  await interaction.editReply({ content: `✅ **${silinen.size}** mesaj silindi.` });
}

module.exports = { data, execute };