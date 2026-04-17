// commands/uyari.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Bellekte uyarı verisi
const uyariVerisi = new Map();

// ─── /uyar ───
const uyarData = new SlashCommandBuilder()
  .setName('uyar')
  .setDescription('Kullanıcıya uyarı verir [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarılacak kullanıcı').setRequired(true))
  .addStringOption(opt => opt.setName('sebep').setDescription('Uyarı sebebi').setRequired(false));

async function uyarExecute(interaction) {
  const isMod = process.env.MODERATOR_ROL_ID
    ? interaction.member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : interaction.member.permissions.has('Administrator');
  const isAsis = process.env.ASISTAN_ROL_ID
    ? interaction.member.roles.cache.has(process.env.ASISTAN_ROL_ID)
    : false;

  if (!isMod && !isAsis) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const hedef = interaction.options.getMember('kullanici');
  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });
  if (hedef.user.bot) return interaction.reply({ content: '❌ Botlara uyarı verilemez.', ephemeral: true });

  const sebep = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
  const mevcutUyarilar = uyariVerisi.get(hedef.id) || [];
  mevcutUyarilar.push({ sebep, moderator: interaction.user.id, tarih: Math.floor(Date.now() / 1000) });
  uyariVerisi.set(hedef.id, mevcutUyarilar);
  const toplamUyari = mevcutUyarilar.length;

  await hedef.send({ embeds: [new EmbedBuilder()
    .setTitle('⚠️ Uyarı Aldın!')
    .setColor(0xFFA500)
    .setDescription('**AniZen TR** sunucusunda uyarı aldın.')
    .addFields(
      { name: '📋 Sebep', value: sebep, inline: false },
      { name: '🛡️ Yetkili', value: `<@${interaction.user.id}>`, inline: true },
      { name: '⚠️ Toplam Uyarın', value: `${toplamUyari}`, inline: true }
    )
    .setFooter({ text: 'Kurallara uymaya devam et!' })
    .setTimestamp()]
  }).catch(() => {});

  const logKanal = interaction.guild.channels.cache.get(process.env.LOG_KANAL_ID);
  if (logKanal) {
    const logEmbed = new EmbedBuilder()
      .setTitle('⚠️ Kullanıcı Uyarıldı')
      .setColor(toplamUyari >= 3 ? 0xFF0000 : 0xFFA500)
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
        { name: '📋 Sebep', value: sebep, inline: false },
        { name: '🛡️ Yetkili', value: `<@${interaction.user.id}>`, inline: true },
        { name: '⚠️ Toplam Uyarı', value: `${toplamUyari}`, inline: true },
        { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })
      .setTimestamp();
    if (toplamUyari >= 3) logEmbed.setDescription('🚨 **Bu kullanıcı 3 veya daha fazla uyarıya ulaştı!**');
    await logKanal.send({ embeds: [logEmbed] });
  }

  await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
    .setTitle('✅ Uyarı Verildi')
    .setColor(0xFFA500)
    .addFields(
      { name: '👤 Kullanıcı', value: `<@${hedef.id}>`, inline: true },
      { name: '📋 Sebep', value: sebep, inline: true },
      { name: '⚠️ Toplam Uyarı', value: `${toplamUyari}`, inline: true }
    )
    .setTimestamp()]
  });
}

// ─── /uyarilar ───
const uyarilarData = new SlashCommandBuilder()
  .setName('uyarilar')
  .setDescription('Kullanıcının uyarı geçmişini gösterir [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true));

async function uyarilarExecute(interaction) {
  const isMod = process.env.MODERATOR_ROL_ID
    ? interaction.member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : interaction.member.permissions.has('Administrator');
  const isAsis = process.env.ASISTAN_ROL_ID
    ? interaction.member.roles.cache.has(process.env.ASISTAN_ROL_ID)
    : false;

  if (!isMod && !isAsis) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const hedef = interaction.options.getMember('kullanici');
  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

  const uyarilar = uyariVerisi.get(hedef.id);
  if (!uyarilar || uyarilar.length === 0) {
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
      .setTitle('✅ Temiz Sicil')
      .setColor(0x57F287)
      .setDescription(`<@${hedef.id}> kullanıcısının hiç uyarısı yok.`)]
    });
  }

  const uyariListesi = uyarilar.map((u, i) =>
    `**${i + 1}.** ${u.sebep} — <t:${u.tarih}:d> — <@${u.moderator}>`
  ).join('\n');

  await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
    .setTitle(`⚠️ Uyarı Geçmişi — ${hedef.user.tag}`)
    .setColor(uyarilar.length >= 3 ? 0xFF0000 : 0xFFA500)
    .setDescription(uyariListesi)
    .addFields({ name: '📊 Toplam', value: `${uyarilar.length} uyarı`, inline: true })
    .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })
    .setTimestamp()]
  });
}

// ─── /uyarisil ───
const uyarisilData = new SlashCommandBuilder()
  .setName('uyarisil')
  .setDescription('Kullanıcının belirtilen uyarısını siler [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
  .addIntegerOption(opt => opt.setName('numara').setDescription('Uyarı numarası').setRequired(true).setMinValue(1));

async function uyarisilExecute(interaction) {
  const isMod = process.env.MODERATOR_ROL_ID
    ? interaction.member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : interaction.member.permissions.has('Administrator');
  const isAsis = process.env.ASISTAN_ROL_ID
    ? interaction.member.roles.cache.has(process.env.ASISTAN_ROL_ID)
    : false;

  if (!isMod && !isAsis) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const hedef = interaction.options.getMember('kullanici');
  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

  const numara = interaction.options.getInteger('numara');
  const uyarilar = uyariVerisi.get(hedef.id);

  if (!uyarilar || uyarilar.length === 0) return interaction.reply({ content: '❌ Bu kullanıcının uyarısı yok.', ephemeral: true });
  if (numara > uyarilar.length) return interaction.reply({ content: `❌ Geçerli bir numara gir. (1 - ${uyarilar.length})`, ephemeral: true });

  const silinenUyari = uyarilar.splice(numara - 1, 1)[0];
  uyariVerisi.set(hedef.id, uyarilar);

  await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
    .setTitle('🗑️ Uyarı Silindi')
    .setColor(0x57F287)
    .addFields(
      { name: '👤 Kullanıcı', value: `<@${hedef.id}>`, inline: true },
      { name: '📋 Silinen Sebep', value: silinenUyari.sebep, inline: true },
      { name: '⚠️ Kalan Uyarı', value: `${uyarilar.length}`, inline: true }
    )
    .setTimestamp()]
  });
}

const commands = [
  { data: uyarData, execute: uyarExecute },
  { data: uyarilarData, execute: uyarilarExecute },
  { data: uyarisilData, execute: uyarisilExecute },
];

module.exports = { commands };
