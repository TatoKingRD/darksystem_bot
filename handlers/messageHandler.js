// handlers/messageHandler.js
// Gelen mesajları okur, doğru komut dosyasına yönlendirir

const yardimKomutu = require('../commands/yardim');
const takimKomutu = require('../commands/takim');
const { uyarEkle, uyarilariGoster, uyariSil } = require('../commands/uyari');
const { rolVer, rolAl } = require('../commands/rol');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Railway env'den moderasyon rolü ID'si
// MODERATOR_ROL_ID yoksa Administrator permission kullanılır
function isModerator(member) {
  if (process.env.MODERATOR_ROL_ID) {
    return member.roles.cache.has(process.env.MODERATOR_ROL_ID);
  }
  return member.permissions.has('Administrator');
}

function isAsistan(member) {
  if (process.env.ASISTAN_ROL_ID) {
    return member.roles.cache.has(process.env.ASISTAN_ROL_ID);
  }
  return false;
}

module.exports = async function messageHandler(client, message) {
  if (message.author.bot) return;
  const kayitVerisi = client.kayitVerisi;
  const isMod = isModerator(message.member);
  const isAsis = isAsistan(message.member);
  const yetkili = isMod || isAsis; // moderatör veya asistan

  // ─── !yardim (herkese açık, içerik role göre değişir) ───
  if (message.content === '!yardim') {
    return yardimKomutu(message, isMod, isAsis);
  }

  // ─── !takim (herkese açık) ───
  if (message.content.startsWith('!takim')) {
    return takimKomutu(client, message);
  }

  // ─── Asistan ve moderatör komutları ───
  if (message.content.startsWith('!uyarilar')) {
    if (!yetkili) return;
    return uyarilariGoster(message);
  }

  if (message.content.startsWith('!uyar ')) {
    if (!yetkili) return;
    return uyarEkle(message, kayitVerisi);
  }

  if (message.content.startsWith('!uyarisil')) {
    if (!yetkili) return;
    return uyariSil(message);
  }

  if (message.content.startsWith('!kayitsil')) {
    if (!yetkili) return;
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!kayitsil @kullanıcı`');
    try {
      if (process.env.KAYITLI_ROL_ID) await hedef.roles.remove(process.env.KAYITLI_ROL_ID).catch(() => {});
      if (process.env.KAYITSIZ_ROL_ID) await hedef.roles.add(process.env.KAYITSIZ_ROL_ID).catch(() => {});
      await hedef.setNickname(null).catch(() => {});
      kayitVerisi.delete(hedef.id);
      await message.reply(`✅ **${hedef.user.tag}** kullanıcısının kaydı sıfırlandı.`);
      const logKanal = message.guild.channels.cache.get(process.env.LOG_KANAL_ID);
      if (logKanal) {
        await logKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('🗑️ Kayıt Silindi')
          .setColor(0xFF0000)
          .addFields(
            { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
            { name: '🛡️ İşlemi Yapan', value: `<@${message.author.id}>`, inline: false },
            { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })]
        });
      }
    } catch (err) {
      console.error(err);
      await message.reply('❌ Bir hata oluştu.');
    }
    return;
  }

  if (message.content.startsWith('!kayitbilgi')) {
    if (!yetkili) return;
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!kayitbilgi @kullanıcı`');

    const bilgi = kayitVerisi.get(hedef.id);
    if (bilgi) {
      return message.reply({ embeds: [new EmbedBuilder()
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

    const arsivKanal = message.guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
    if (!arsivKanal) return message.reply('❌ Arşiv kanalı bulunamadı.');

    await message.reply('🔍 Arşiv taranıyor, lütfen bekle...');
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

    if (!bulunanMesaj) return message.reply('❌ Bu kullanıcıya ait kayıt arşivde bulunamadı.');
    const arsivEmbed = bulunanMesaj.embeds[0];
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🔍 Kayıt Bilgisi (Arşivden)')
      .setColor(0x5865F2)
      .addFields(arsivEmbed.fields)
      .setFooter({ text: arsivEmbed.footer.text })
      .setTimestamp(arsivEmbed.timestamp ? new Date(arsivEmbed.timestamp) : null)]
    });
  }

  if (message.content.startsWith('!kayitguncelle')) {
    if (!yetkili) return;
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!kayitguncelle @kullanıcı`');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`guncelle_baslat_${hedef.id}`)
        .setLabel('✏️ Güncelleme Formunu Aç')
        .setStyle(ButtonStyle.Secondary)
    );
    return message.reply({
      content: `**${hedef.user.tag}** kullanıcısının kaydını güncellemek için butona tıkla:`,
      components: [row]
    });
  }

  if (message.content === '!istatistik') {
    if (!yetkili) return;
    try {
      await message.guild.members.fetch();
      const kayitliUyeler = message.guild.members.cache.filter(m =>
        process.env.KAYITLI_ROL_ID && m.roles.cache.has(process.env.KAYITLI_ROL_ID)
      ).size;
      const birHaftaOnce = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      const buHaftaKayit = [...kayitVerisi.values()].filter(v => v.tarih >= birHaftaOnce).length;

      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('📊 Sunucu İstatistikleri')
        .setColor(0x5865F2)
        .addFields(
          { name: '✅ Toplam Kayıtlı Üye', value: `${kayitliUyeler}`, inline: true },
          { name: '📅 Bu Hafta Kayıt', value: `${buHaftaKayit}`, inline: true },
          { name: '💾 Bellekteki Kayıt', value: `${kayitVerisi.size}`, inline: true }
        )
        .setFooter({ text: 'Kayıt Sistemi' })
        .setTimestamp()]
      });
    } catch (err) {
      console.error(err);
      return message.reply('❌ İstatistikler alınırken hata oluştu.');
    }
  }

  // ─── Sadece moderatör komutları ───
  if (!isMod) return;

  if (message.content.startsWith('!rolver')) {
    return rolVer(message);
  }

  if (message.content.startsWith('!rolal')) {
    return rolAl(message);
  }

  if (message.content === '!panel') {
    const embed = new EmbedBuilder()
      .setTitle('📋 Kayıt Formu')
      .setDescription('**Sunucumuza Hoş Geldin!** 🌟\n\nKayıt olmak için aşağıdaki butona tıkla ve formu doldur.\nKayıt işlemi tamamlanınca **Kayıtlı Üye** rolü verilecektir.\n\n> ⚠️ Lütfen gerçek bilgilerini gir. Aksi takdirde sunucumuzda ödül kazanamazsın!')
      .setColor(0x5865F2)
      .setFooter({ text: 'Kayıt Sistemi' })
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('kayit_baslat').setLabel('📝 Kayıt Ol').setStyle(ButtonStyle.Primary)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete().catch(() => {});
  }
};
