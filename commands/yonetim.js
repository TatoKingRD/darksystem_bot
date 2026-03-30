// commands/yonetim.js
// /panel, /kayitsil, /kayitbilgi, /kayitguncelle, /istatistik
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function isMod(member) {
  return process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
}
function isYetkili(member) {
  const mod = isMod(member);
  const asis = process.env.ASISTAN_ROL_ID ? member.roles.cache.has(process.env.ASISTAN_ROL_ID) : false;
  return mod || asis;
}

// ─── /panel ───
const panelData = new SlashCommandBuilder()
  .setName('panel')
  .setDescription('Kayıt panelini kanala gönderir [Moderatör]');

async function panelExecute(interaction) {
  if (!isMod(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const embed = new EmbedBuilder()
    .setTitle('📋 Kayıt Formu')
    .setDescription('**Sunucumuza Hoş Geldin!** 🌟\n\nKayıt olmak için aşağıdaki butona tıkla ve formu doldur.\nKayıt işlemi tamamlanınca **Kayıtlı Üye** rolü verilecektir.\n\n> ⚠️ Lütfen gerçek bilgilerini gir. Aksi takdirde sunucumuzda ödül kazanamazsın!')
    .setColor(0x5865F2)
    .setFooter({ text: 'Kayıt Sistemi' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('kayit_baslat').setLabel('📝 Kayıt Ol').setStyle(ButtonStyle.Primary)
  );

  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: '✅ Panel gönderildi.', ephemeral: true });
}

// ─── /kayitsil ───
const kayitsilData = new SlashCommandBuilder()
  .setName('kayitsil')
  .setDescription('Kullanıcının kaydını sıfırlar [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true));

async function kayitsilExecute(interaction, client) {
  if (!isYetkili(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const hedef = interaction.options.getMember('kullanici');
  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

  try {
    if (process.env.KAYITLI_ROL_ID) await hedef.roles.remove(process.env.KAYITLI_ROL_ID).catch(() => {});
    if (process.env.KAYITSIZ_ROL_ID) await hedef.roles.add(process.env.KAYITSIZ_ROL_ID).catch(() => {});
    await hedef.setNickname(null).catch(() => {});
    client.kayitVerisi.delete(hedef.id);

    const logKanal = interaction.guild.channels.cache.get(process.env.LOG_KANAL_ID);
    if (logKanal) {
      await logKanal.send({ embeds: [new EmbedBuilder()
        .setTitle('🗑️ Kayıt Silindi')
        .setColor(0xFF0000)
        .addFields(
          { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
          { name: '🛡️ İşlemi Yapan', value: `<@${interaction.user.id}>`, inline: false },
          { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })]
      });
    }

    await interaction.reply({ content: `✅ **${hedef.user.tag}** kullanıcısının kaydı sıfırlandı.`, ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: '❌ Bir hata oluştu.', ephemeral: true });
  }
}

// ─── /kayitbilgi ───
const kayitbilgiData = new SlashCommandBuilder()
  .setName('kayitbilgi')
  .setDescription('Kullanıcının kayıt bilgilerini gösterir [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true));

async function kayitbilgiExecute(interaction, client) {
  if (!isYetkili(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const hedef = interaction.options.getMember('kullanici');
  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

  const bilgi = client.kayitVerisi.get(hedef.id);
  if (bilgi) {
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
      .setTitle('🔍 Kayıt Bilgisi')
      .setColor(0x5865F2)
      .addFields(
        { name: '👤 İsim', value: bilgi.isim, inline: true },
        { name: '🎂 Yaş', value: `${bilgi.yas}`, inline: true },
        { name: '🎮 IGN', value: bilgi.ign || 'Belirtilmedi', inline: true },
        { name: '🎯 Oyun ID', value: bilgi.oyunId || 'Belirtilmedi', inline: true },
        { name: '📣 Nereden Duydun?', value: bilgi.neredenDuydun || 'Belirtilmedi', inline: true },
        { name: '🆔 Discord', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
        { name: '📅 Kayıt Tarihi', value: `<t:${bilgi.tarih}:F>`, inline: false }
      )
      .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })]
    });
  }

  // Arşivden ara
  await interaction.deferReply({ ephemeral: true });
  const arsivKanal = interaction.guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
  if (!arsivKanal) return interaction.editReply({ content: '❌ Arşiv kanalı bulunamadı.' });

  let bulunanMesaj = null;
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const mesajlar = await arsivKanal.messages.fetch(options);
    if (mesajlar.size === 0) break;
    for (const [, msg] of mesajlar) {
      if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `Kullanıcı ID: ${hedef.id}`) {
        bulunanMesaj = msg; break;
      }
    }
    if (bulunanMesaj) break;
    lastId = mesajlar.last().id;
    if (mesajlar.size < 100) break;
  }

  if (!bulunanMesaj) return interaction.editReply({ content: '❌ Bu kullanıcıya ait kayıt arşivde bulunamadı.' });
  const arsivEmbed = bulunanMesaj.embeds[0];
  return interaction.editReply({ embeds: [new EmbedBuilder()
    .setTitle('🔍 Kayıt Bilgisi (Arşivden)')
    .setColor(0x5865F2)
    .addFields(arsivEmbed.fields)
    .setFooter({ text: arsivEmbed.footer.text })
    .setTimestamp(arsivEmbed.timestamp ? new Date(arsivEmbed.timestamp) : null)]
  });
}

// ─── /kayitguncelle ───
const kayitgunncelleData = new SlashCommandBuilder()
  .setName('kayitguncelle')
  .setDescription('Kullanıcının kayıt bilgilerini günceller [Yetkili]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true));

async function kayitgunncelleExecute(interaction) {
  if (!isYetkili(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const hedef = interaction.options.getMember('kullanici');
  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`guncelle_baslat_${hedef.id}`)
      .setLabel('✏️ Güncelleme Formunu Aç')
      .setStyle(ButtonStyle.Secondary)
  );
  return interaction.reply({
    content: `**${hedef.user.tag}** kullanıcısının kaydını güncellemek için butona tıkla:`,
    components: [row],
    ephemeral: true
  });
}

// ─── /istatistik ───
const istatistikData = new SlashCommandBuilder()
  .setName('istatistik')
  .setDescription('Sunucu istatistiklerini gösterir [Yetkili]');

async function istatistikExecute(interaction, client) {
  if (!isYetkili(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  try {
    await interaction.guild.members.fetch();
    const kayitliUyeler = interaction.guild.members.cache.filter(m =>
      process.env.KAYITLI_ROL_ID && m.roles.cache.has(process.env.KAYITLI_ROL_ID)
    ).size;
    const birHaftaOnce = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
    const buHaftaKayit = [...client.kayitVerisi.values()].filter(v => v.tarih >= birHaftaOnce).length;

    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
      .setTitle('📊 Sunucu İstatistikleri')
      .setColor(0x5865F2)
      .addFields(
        { name: '✅ Toplam Kayıtlı Üye', value: `${kayitliUyeler}`, inline: true },
        { name: '📅 Bu Hafta Kayıt', value: `${buHaftaKayit}`, inline: true },
        { name: '💾 Bellekteki Kayıt', value: `${client.kayitVerisi.size}`, inline: true }
      )
      .setFooter({ text: 'Kayıt Sistemi' })
      .setTimestamp()]
    });
  } catch (err) {
    console.error(err);
    return interaction.reply({ content: '❌ İstatistikler alınırken hata oluştu.', ephemeral: true });
  }
}

const commands = [
  { data: panelData, execute: panelExecute },
  { data: kayitsilData, execute: kayitsilExecute },
  { data: kayitbilgiData, execute: kayitbilgiExecute },
  { data: kayitgunncelleData, execute: kayitgunncelleExecute },
  { data: istatistikData, execute: istatistikExecute },
];

module.exports = { commands };
