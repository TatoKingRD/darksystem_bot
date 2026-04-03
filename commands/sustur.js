// commands/sustur.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

function isYetkili(member) {
  const isMod = process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
  const isAsis = process.env.ASISTAN_ROL_ID
    ? member.roles.cache.has(process.env.ASISTAN_ROL_ID)
    : false;
  return isMod || isAsis;
}

const sureMsMap = {
  '60s': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '10m': 10 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1g': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
};

const sureLabelMap = {
  '60s': '60 Saniye',
  '5m': '5 Dakika',
  '10m': '10 Dakika',
  '1h': '1 Saat',
  '1g': '1 Gün',
  '1w': '1 Hafta',
};

// ─── /sustur ───
const susturData = new SlashCommandBuilder()
  .setName('sustur')
  .setDescription('Kullanıcıları geçici olarak susturur [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici1').setDescription('1. kullanıcı').setRequired(true))
  .addStringOption(opt => opt
    .setName('sure')
    .setDescription('Susturma süresi')
    .setRequired(true)
    .addChoices(
      { name: '⏱️ 60 Saniye', value: '60s' },
      { name: '⏱️ 5 Dakika', value: '5m' },
      { name: '⏱️ 10 Dakika', value: '10m' },
      { name: '🕐 1 Saat', value: '1h' },
      { name: '📅 1 Gün', value: '1g' },
      { name: '📆 1 Hafta', value: '1w' },
    ))
  .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false))
  .addUserOption(opt => opt.setName('kullanici2').setDescription('2. kullanıcı (opsiyonel)').setRequired(false))
  .addUserOption(opt => opt.setName('kullanici3').setDescription('3. kullanıcı (opsiyonel)').setRequired(false))
  .addUserOption(opt => opt.setName('kullanici4').setDescription('4. kullanıcı (opsiyonel)').setRequired(false))
  .addUserOption(opt => opt.setName('kullanici5').setDescription('5. kullanıcı (opsiyonel)').setRequired(false));

async function susturExecute(interaction) {
  if (!isYetkili(interaction.member)) {
    return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const sureKey = interaction.options.getString('sure');
  const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
  const sureMs = sureMsMap[sureKey];
  const sureLabel = sureLabelMap[sureKey];
  const bitis = Math.floor((Date.now() + sureMs) / 1000);

  const hedefler = [
    interaction.options.getMember('kullanici1'),
    interaction.options.getMember('kullanici2'),
    interaction.options.getMember('kullanici3'),
    interaction.options.getMember('kullanici4'),
    interaction.options.getMember('kullanici5'),
  ].filter(Boolean);

  const basarili = [];
  const basarisiz = [];
  const logKanal = interaction.guild.channels.cache.get(process.env.LOG_KANAL_ID);

  for (const hedef of hedefler) {
    if (hedef.id === interaction.client.user.id) { basarisiz.push(`<@${hedef.id}> (ben botum)`); continue; }
    if (hedef.permissions.has(PermissionFlagsBits.Administrator)) { basarisiz.push(`<@${hedef.id}> (yönetici)`); continue; }

    try {
      await hedef.timeout(sureMs, sebep);

      await hedef.send({ embeds: [new EmbedBuilder()
        .setTitle('🔇 Susturuldunuz')
        .setColor(0xFF0000)
        .addFields(
          { name: '⏱️ Süre', value: sureLabel, inline: true },
          { name: '📅 Bitiş', value: `<t:${bitis}:R>`, inline: true },
          { name: '📝 Sebep', value: sebep, inline: false },
        )
        .setFooter({ text: interaction.guild.name })
        .setTimestamp()]
      }).catch(() => {});

      if (logKanal) {
        await logKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('🔇 Kullanıcı Susturuldu')
          .setColor(0xFF0000)
          .addFields(
            { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
            { name: '🛡️ Yetkili', value: `<@${interaction.user.id}>`, inline: false },
            { name: '⏱️ Süre', value: sureLabel, inline: true },
            { name: '📅 Bitiş', value: `<t:${bitis}:F>`, inline: true },
            { name: '📝 Sebep', value: sebep, inline: false },
          )
          .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })
          .setTimestamp()]
        });
      }

      basarili.push(`<@${hedef.id}>`);
    } catch {
      basarisiz.push(`<@${hedef.id}> (hata)`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('🔇 Susturma Sonucu')
    .setColor(basarili.length > 0 ? 0x57F287 : 0xFF0000)
    .addFields(
      { name: '⏱️ Süre', value: sureLabel, inline: true },
      { name: '📅 Bitiş', value: `<t:${bitis}:R>`, inline: true },
      { name: '📝 Sebep', value: sebep, inline: false },
    )
    .setTimestamp();

  if (basarili.length > 0) embed.addFields({ name: `✅ Susturulan (${basarili.length})`, value: basarili.join('\n'), inline: false });
  if (basarisiz.length > 0) embed.addFields({ name: `❌ Başarısız (${basarisiz.length})`, value: basarisiz.join('\n'), inline: false });

  await interaction.editReply({ embeds: [embed] });
}

// ─── /sustursil ───
const sustursilData = new SlashCommandBuilder()
  .setName('sustursil')
  .setDescription('Kullanıcıların susturmasını kaldırır [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici1').setDescription('1. kullanıcı').setRequired(true))
  .addStringOption(opt => opt.setName('sebep').setDescription('Susturma kaldırma sebebi').setRequired(false))
  .addUserOption(opt => opt.setName('kullanici2').setDescription('2. kullanıcı (opsiyonel)').setRequired(false))
  .addUserOption(opt => opt.setName('kullanici3').setDescription('3. kullanıcı (opsiyonel)').setRequired(false))
  .addUserOption(opt => opt.setName('kullanici4').setDescription('4. kullanıcı (opsiyonel)').setRequired(false))
  .addUserOption(opt => opt.setName('kullanici5').setDescription('5. kullanıcı (opsiyonel)').setRequired(false));

async function sustursilExecute(interaction) {
  if (!isYetkili(interaction.member)) {
    return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
  const logKanal = interaction.guild.channels.cache.get(process.env.LOG_KANAL_ID);

  const hedefler = [
    interaction.options.getMember('kullanici1'),
    interaction.options.getMember('kullanici2'),
    interaction.options.getMember('kullanici3'),
    interaction.options.getMember('kullanici4'),
    interaction.options.getMember('kullanici5'),
  ].filter(Boolean);

  const basarili = [];
  const basarisiz = [];

  for (const hedef of hedefler) {
    if (!hedef.isCommunicationDisabled()) { basarisiz.push(`<@${hedef.id}> (susturulmamış)`); continue; }

    try {
      await hedef.timeout(null, sebep);

      await hedef.send({ embeds: [new EmbedBuilder()
        .setTitle('🔊 Susturmanız Kaldırıldı')
        .setColor(0x57F287)
        .addFields({ name: '📝 Sebep', value: sebep, inline: false })
        .setFooter({ text: interaction.guild.name })
        .setTimestamp()]
      }).catch(() => {});

      if (logKanal) {
        await logKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('🔊 Susturma Kaldırıldı')
          .setColor(0x57F287)
          .addFields(
            { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
            { name: '🛡️ Yetkili', value: `<@${interaction.user.id}>`, inline: false },
            { name: '📝 Sebep', value: sebep, inline: false },
          )
          .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })
          .setTimestamp()]
        });
      }

      basarili.push(`<@${hedef.id}>`);
    } catch {
      basarisiz.push(`<@${hedef.id}> (hata)`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('🔊 Susturma Kaldırma Sonucu')
    .setColor(basarili.length > 0 ? 0x57F287 : 0xFF0000)
    .setTimestamp();

  if (basarili.length > 0) embed.addFields({ name: `✅ Kaldırılan (${basarili.length})`, value: basarili.join('\n'), inline: false });
  if (basarisiz.length > 0) embed.addFields({ name: `❌ Başarısız (${basarisiz.length})`, value: basarisiz.join('\n'), inline: false });

  await interaction.editReply({ embeds: [embed] });
}

const commands = [
  { data: susturData, execute: susturExecute },
  { data: sustursilData, execute: sustursilExecute },
];

module.exports = { commands };