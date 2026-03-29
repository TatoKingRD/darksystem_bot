// commands/yardim.js
const { EmbedBuilder } = require('discord.js');

module.exports = async function yardimKomutu(message, isMod) {
  if (isMod) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('Moderator Komutlari')
      .setColor(0xE74C3C)
      .setDescription('Asagidaki komutlar sadece moderatorler tarafindan kullanilabilir.')
      .addFields(
        { name: '!panel', value: 'Kayit panelini kanala gonderir.', inline: false },
        { name: '!kayitsil @kullanici', value: 'Uyenin kaydini sifirlar.', inline: false },
        { name: '!kayitbilgi @kullanici', value: 'Kayit bilgilerini gosterir.', inline: false },
        { name: '!kayitguncelle @kullanici', value: 'Kayit bilgilerini gunceller.', inline: false },
        { name: '!istatistik', value: 'Sunucu istatistiklerini gosterir.', inline: false },
        { name: '!uyar @kullanici sebep', value: 'Uyari verir, log kanalina kaydeder.', inline: false },
        { name: '!uyarilar @kullanici', value: 'Uyari gecmisini gosterir.', inline: false },
        { name: '!uyarisil @kullanici numara', value: 'Belirtilen uyariyi siler.', inline: false },
        { name: '!rolver @kullanici @rol', value: 'Kullaniciya rol verir.', inline: false },
        { name: '!rolal @kullanici @rol', value: 'Kullanicidan rol alir.', inline: false },
        { name: '!takim rank rol', value: 'Takim ilani olusturur.', inline: false },
        { name: '!yardim', value: 'Bu menuyu gosterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR - Moderator Paneli' })
      .setTimestamp()]
    });
  } else {
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('Kullanilabilir Komutlar')
      .setColor(0x5865F2)
      .setDescription('Merhaba! Sunucuda kullanabilecegin komutlar bunlar:')
      .addFields(
        { name: '!takim rank rol', value: 'Takim arkadasi bulmak icin ilan olusturur.\nOrnek: !takim Mythic Nisanci', inline: false },
        { name: '!yardim', value: 'Bu menuyu gosterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR - Yardim Menusu' })
      .setTimestamp()]
    });
  }
};
