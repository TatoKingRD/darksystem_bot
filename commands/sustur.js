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
  .setDescription('Kullanıcıyı geçici olarak susturur [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kullanıcı').setRequired(true))
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
  .addStringOption(opt => opt
    .setName('sebep')
    .setDescription('Susturma sebebi')
    .setRequired(false));

async function susturExecute(interaction) {
  if (!isYetkili(interaction.member)) {
    return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
  }

  const hedef = interaction.options.getMember('kullanici');
  const sureKey = interaction.options.getString('sure');
  const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });
  if (hedef.id === interaction.client.user.id) return interaction.reply({ content: '❌ Beni susturamazsın!', ephemeral: true });
  if (hedef.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Yöneticileri susturamazsın.', ephemeral: true });

  const sureMs = sureMsMap[sureKey];
  const sureLabel = sureLabelMap[sureKey];
  const bitis = Math.floor((Date.now() + sureMs) / 1000);

  try {
    await hedef.timeout(sureMs, sebep);

    // Kullanıcıya DM
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

    // Log kanalı
    const logKanal = interaction.guild.channels.cache.get(process.env.LOG_KANAL_ID);
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

    await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
      .setTitle('✅ Kullanıcı Susturuldu')
      .setColor(0x57F287)
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${hedef.id}>`, inline: true },
        { name: '⏱️ Süre', value: sureLabel, inline: true },
        { name: '📅 Bitiş', value: `<t:${bitis}:R>`, inline: true },
        { name: '📝 Sebep', value: sebep, inline: false },
      )
      .setTimestamp()]
    });

  } catch (err) {
    console.error('Susturma hatası:', err);
    await interaction.reply({ content: '❌ Kullanıcı susturulamadı. Botun yeterli yetkisi var mı?', ephemeral: true });
  }
}

// ─── /sustursil ───
const sustursilData = new SlashCommandBuilder()
  .setName('sustursil')
  .setDescription('Kullanıcının susturmasını kaldırır [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Susturması kaldırılacak kullanıcı').setRequired(true))
  .addStringOption(opt => opt.setName('sebep').setDescription('Susturma kaldırma sebebi').setRequired(false));

async function sustursilExecute(interaction) {
  if (!isYetkili(interaction.member)) {
    return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });
  }

  const hedef = interaction.options.getMember('kullanici');
  const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

  if (!hedef.isCommunicationDisabled()) {
    return interaction.reply({ content: '❌ Bu kullanıcı zaten susturulmamış.', ephemeral: true });
  }

  try {
    await hedef.timeout(null, sebep);

    // Kullanıcıya DM
    await hedef.send({ embeds: [new EmbedBuilder()
      .setTitle('🔊 Susturmanız Kaldırıldı')
      .setColor(0x57F287)
      .addFields(
        { name: '📝 Sebep', value: sebep, inline: false },
      )
      .setFooter({ text: interaction.guild.name })
      .setTimestamp()]
    }).catch(() => {});

    // Log kanalı
    const logKanal = interaction.guild.channels.cache.get(process.env.LOG_KANAL_ID);
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

    await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
      .setTitle('✅ Susturma Kaldırıldı')
      .setColor(0x57F287)
      .setDescription(`<@${hedef.id}> kullanıcısının susturması kaldırıldı.`)
      .setTimestamp()]
    });

  } catch (err) {
    console.error('Susturma kaldırma hatası:', err);
    await interaction.reply({ content: '❌ Susturma kaldırılamadı.', ephemeral: true });
  }
}

const commands = [
  { data: susturData, execute: susturExecute },
  { data: sustursilData, execute: sustursilExecute },
];

module.exports = { commands };