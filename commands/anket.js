// commands/anket.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function isMod(member) {
  return process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
}

const data = new SlashCommandBuilder()
  .setName('anket')
  .setDescription('Anket oluşturur [Moderatör]')
  .addStringOption(opt => opt.setName('soru').setDescription('Anket sorusu').setRequired(true))
  .addStringOption(opt => opt.setName('aciklama').setDescription('Ek açıklama (opsiyonel)').setRequired(false))
  .addStringOption(opt => opt.setName('secenek1').setDescription('1. seçenek (boş bırakırsan: Evet)').setRequired(false))
  .addStringOption(opt => opt.setName('secenek2').setDescription('2. seçenek (boş bırakırsan: Hayır)').setRequired(false));

async function execute(interaction) {
  if (!isMod(interaction.member)) {
    return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
  }

  const soru = interaction.options.getString('soru');
  const aciklama = interaction.options.getString('aciklama');
  const sec1 = interaction.options.getString('secenek1') || 'Evet';
  const sec2 = interaction.options.getString('secenek2') || 'Hayır';

  const embed = new EmbedBuilder()
    .setTitle('📊 ' + soru)
    .setColor(0x5865F2)
    .addFields(
      { name: `🅰️ ${sec1}`, value: '0 oy', inline: true },
      { name: `🅱️ ${sec2}`, value: '0 oy', inline: true },
    )
    .setImage('https://oyverenler.placeholder/')
    .setFooter({ text: `Anketi oluşturan: ${interaction.user.tag}` })
    .setTimestamp();

  if (aciklama) embed.setDescription(aciklama);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('anket_a').setLabel(`🅰️ ${sec1}`).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('anket_b').setLabel(`🅱️ ${sec2}`).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('anket_kapat').setLabel('🔒 Anketi Kapat').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

module.exports = { data, execute };