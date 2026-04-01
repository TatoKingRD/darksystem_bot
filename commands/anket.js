// commands/anket.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function isMod(member) {
  return process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
}

// ─── /anket ───
const anketData = new SlashCommandBuilder()
  .setName('anket')
  .setDescription('Anket oluşturur [Moderatör]')
  .addStringOption(opt => opt.setName('soru').setDescription('Anket sorusu').setRequired(true))
  .addStringOption(opt => opt.setName('aciklama').setDescription('Ek açıklama (opsiyonel)').setRequired(false))
  .addStringOption(opt => opt.setName('secenek1').setDescription('1. seçenek (boş bırakırsan: Evet)').setRequired(false))
  .addStringOption(opt => opt.setName('secenek2').setDescription('2. seçenek (boş bırakırsan: Hayır)').setRequired(false))
  .addBooleanOption(opt => opt.setName('ping').setDescription('@everyone ping at (varsayılan: hayır)').setRequired(false));

async function anketExecute(interaction) {
  if (!isMod(interaction.member)) {
    return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
  }

  const soru = interaction.options.getString('soru');
  const aciklama = interaction.options.getString('aciklama');
  const sec1 = interaction.options.getString('secenek1') || 'Evet';
  const sec2 = interaction.options.getString('secenek2') || 'Hayır';
  const ping = interaction.options.getBoolean('ping') || false;

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

  await interaction.reply({
    content: ping ? '@everyone' : null,
    embeds: [embed],
    components: [row],
    allowedMentions: { parse: ping ? ['everyone'] : [] }
  });
}

// ─── /anketoylar ───
const anketOylarData = new SlashCommandBuilder()
  .setName('anketoylar')
  .setDescription('Ankete oy verenleri gösterir [Moderatör]')
  .addStringOption(opt => opt.setName('mesaj_id').setDescription('Anket mesajının ID\'si').setRequired(true));

async function anketOylarExecute(interaction) {
  if (!isMod(interaction.member)) {
    return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const mesajId = interaction.options.getString('mesaj_id');

  let bulunanMesaj = null;
  for (const [, kanal] of interaction.guild.channels.cache) {
    if (!kanal.isTextBased()) continue;
    try {
      bulunanMesaj = await kanal.messages.fetch(mesajId);
      if (bulunanMesaj) break;
    } catch {}
  }

  if (!bulunanMesaj) return interaction.editReply({ content: '❌ Mesaj bulunamadı.' });

  const embed = bulunanMesaj.embeds[0];
  if (!embed) return interaction.editReply({ content: '❌ Bu bir anket mesajı değil.' });

  const oyVerenler = embed.image?.url
    ?.replace('https://oyverenler.placeholder/', '')
    ?.split(',').filter(Boolean) || [];

  if (oyVerenler.length === 0) {
    return interaction.editReply({ content: '📊 Bu ankete henüz oy veren yok.' });
  }

  const liste = oyVerenler.map(id => `<@${id}>`).join('\n');

  await interaction.editReply({ embeds: [new EmbedBuilder()
    .setTitle('📊 Oy Verenler')
    .setColor(0x5865F2)
    .setDescription(liste)
    .addFields({ name: 'Toplam', value: `${oyVerenler.length} kişi`, inline: true })
    .setFooter({ text: 'Anket ID: ' + mesajId })
    .setTimestamp()]
  });
}

module.exports = [
  { data: anketData, execute: anketExecute },
  { data: anketOylarData, execute: anketOylarExecute },
];