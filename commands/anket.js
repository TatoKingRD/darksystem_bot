// commands/anket.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function isMod(member) {
  return process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
}

// ─── /anket ───
const data = new SlashCommandBuilder()
  .setName('anket')
  .setDescription('Evet/Hayır anketi oluşturur [Moderatör]')
  .addStringOption(opt => opt.setName('soru').setDescription('Anket sorusu').setRequired(true))
  .addStringOption(opt => opt.setName('aciklama').setDescription('Ek açıklama (opsiyonel)').setRequired(false));

async function execute(interaction) {
  if (!isMod(interaction.member)) {
    return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
  }

  const soru = interaction.options.getString('soru');
  const aciklama = interaction.options.getString('aciklama');

  const embed = new EmbedBuilder()
    .setTitle('📊 ' + soru)
    .setColor(0x5865F2)
    .addFields(
      { name: '✅ Evet', value: '0 oy', inline: true },
      { name: '❌ Hayır', value: '0 oy', inline: true },
    )
    .setFooter({ text: `Anketi oluşturan: ${interaction.user.tag}` })
    .setTimestamp();

  if (aciklama) embed.setDescription(aciklama);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('anket_evet').setLabel('✅ Evet').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('anket_hayir').setLabel('❌ Hayır').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('anket_kapat').setLabel('🔒 Anketi Kapat').setStyle(ButtonStyle.Secondary),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

module.exports = { data, execute };