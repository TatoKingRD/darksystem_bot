// commands/uyari.js
// !uyar @kullanıcı [sebep] — moderatöre özel
// !uyarilar @kullanıcı — moderatöre özel
// !uyarisil @kullanıcı [numara] — moderatöre özel

const { EmbedBuilder } = require('discord.js');

// Bellekte uyarı verisi: Map<userId, [{sebep, moderator, tarih}]>
const uyariVerisi = new Map();

async function uyarEkle(message, kayitVerisi) {
  const hedef = message.mentions.members.first();
  if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!uyar @kullanıcı sebep`');
  if (hedef.user.bot) return message.reply('❌ Botlara uyarı verilemez.');

  const sebep = message.content.split(' ').slice(2).join(' ') || 'Sebep belirtilmedi';

  const mevcutUyarilar = uyariVerisi.get(hedef.id) || [];
  mevcutUyarilar.push({
    sebep,
    moderator: message.author.id,
    tarih: Math.floor(Date.now() / 1000)
  });
  uyariVerisi.set(hedef.id, mevcutUyarilar);

  const toplamUyari = mevcutUyarilar.length;

  // Kullanıcıya DM
  await hedef.send({ embeds: [new EmbedBuilder()
    .setTitle('⚠️ Uyarı Aldın!')
    .setColor(0xFFA500)
    .setDescription(`**Mobile Legends 🇹🇷 #TURNUVA** sunucusunda uyarı aldın.`)
    .addFields(
      { name: '📋 Sebep', value: sebep, inline: false },
      { name: '🛡️ Yetkili', value: `<@${message.author.id}>`, inline: true },
      { name: '⚠️ Toplam Uyarın', value: `${toplamUyari}`, inline: true }
    )
    .setFooter({ text: 'Kurallara uymaya devam et!' })
    .setTimestamp()]
  }).catch(() => {});

  // Log kanalına gönder
  const logKanal = message.guild.channels.cache.get(process.env.LOG_KANAL_ID);
  if (logKanal) {
    const logEmbed = new EmbedBuilder()
      .setTitle('⚠️ Kullanıcı Uyarıldı')
      .setColor(toplamUyari >= 3 ? 0xFF0000 : 0xFFA500)
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
        { name: '📋 Sebep', value: sebep, inline: false },
        { name: '🛡️ Yetkili', value: `<@${message.author.id}>`, inline: true },
        { name: '⚠️ Toplam Uyarı', value: `${toplamUyari}`, inline: true },
        { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })
      .setTimestamp();

    if (toplamUyari >= 3) {
      logEmbed.setDescription('🚨 **Bu kullanıcı 3 veya daha fazla uyarıya ulaştı! İncelemeniz gerekebilir.**');
    }

    await logKanal.send({ embeds: [logEmbed] });
  }

  await message.reply({ embeds: [new EmbedBuilder()
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

async function uyarilariGoster(message) {
  const hedef = message.mentions.members.first();
  if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!uyarilar @kullanıcı`');

  const uyarilar = uyariVerisi.get(hedef.id);
  if (!uyarilar || uyarilar.length === 0) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('✅ Temiz Sicil')
      .setColor(0x57F287)
      .setDescription(`<@${hedef.id}> kullanıcısının hiç uyarısı yok.`)]
    });
  }

  const uyariListesi = uyarilar.map((u, i) =>
    `**${i + 1}.** ${u.sebep} — <t:${u.tarih}:d> — <@${u.moderator}>`
  ).join('\n');

  await message.reply({ embeds: [new EmbedBuilder()
    .setTitle(`⚠️ Uyarı Geçmişi — ${hedef.user.tag}`)
    .setColor(uyarilar.length >= 3 ? 0xFF0000 : 0xFFA500)
    .setDescription(uyariListesi)
    .addFields({ name: '📊 Toplam', value: `${uyarilar.length} uyarı`, inline: true })
    .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })
    .setTimestamp()]
  });
}

async function uyariSil(message) {
  const hedef = message.mentions.members.first();
  if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!uyarisil @kullanıcı 1`');

  const args = message.content.split(' ');
  const numara = parseInt(args[args.length - 1]);

  const uyarilar = uyariVerisi.get(hedef.id);
  if (!uyarilar || uyarilar.length === 0) {
    return message.reply('❌ Bu kullanıcının uyarısı yok.');
  }

  if (isNaN(numara) || numara < 1 || numara > uyarilar.length) {
    return message.reply(`❌ Geçerli bir numara gir. (1 - ${uyarilar.length})`);
  }

  const silinenUyari = uyarilar.splice(numara - 1, 1)[0];
  uyariVerisi.set(hedef.id, uyarilar);

  await message.reply({ embeds: [new EmbedBuilder()
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

module.exports = { uyarEkle, uyarilariGoster, uyariSil };
