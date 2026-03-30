// commands/yardim.js
const { EmbedBuilder } = require('discord.js');

module.exports = async function yardimKomutu(message, isMod, isAsis) {
  if (isMod) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🛡️ Moderatör Komutları')
      .setColor(0xE74C3C)
      .setDescription('Aşağıdaki komutlar sadece moderatörler tarafından kullanılabilir.')
      .addFields(
        { name: '📋 !panel', value: 'Kayıt panelini kanala gönderir.', inline: false },
        { name: '🗑️ !kayitsil @kullanıcı', value: 'Üyenin kaydını sıfırlar.', inline: false },
        { name: '🔍 !kayitbilgi @kullanıcı', value: 'Kayıt bilgilerini gösterir.', inline: false },
        { name: '✏️ !kayitguncelle @kullanıcı', value: 'Kayıt bilgilerini günceller.', inline: false },
        { name: '📊 !istatistik', value: 'Sunucu istatistiklerini gösterir.', inline: false },
        { name: '⚠️ !uyar @kullanıcı sebep', value: 'Uyarı verir, log kanalına kaydeder.', inline: false },
        { name: '📋 !uyarilar @kullanıcı', value: 'Uyarı geçmişini gösterir.', inline: false },
        { name: '🗑️ !uyarisil @kullanıcı numara', value: 'Belirtilen uyarıyı siler.', inline: false },
        { name: '✅ !rolver @kullanıcı @rol', value: 'Kullanıcıya rol verir.', inline: false },
        { name: '❌ !rolal @kullanıcı @rol', value: 'Kullanıcıdan rol alır.', inline: false },
        { name: '🔁 !tekrarla komut dakika', value: 'Hatırlatma başlatır. Örnek: !tekrarla bump 125', inline: false },
        { name: '⏹️ !durdur komut', value: 'Hatırlatmayı durdurur. Örnek: !durdur bump', inline: false },
        { name: '📋 !gorevler', value: 'Aktif hatırlatmaları listeler.', inline: false },
        { name: '🎮 !takim rank rolüm aranan_rol [koridor]', value: 'Takım ilanı oluşturur, genel\'e bildirim gider.\nÖrnek: `!takim Mythic ADC Mid`', inline: false },
        { name: '❓ !yardim', value: 'Bu menüyü gösterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR • Moderatör Paneli' })
      .setTimestamp()]
    });
  } else if (isAsis) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🤝 Asistan Komutları')
      .setColor(0xF39C12)
      .setDescription('Aşağıdaki komutlar asistanlar tarafından kullanılabilir.')
      .addFields(
        { name: '🗑️ !kayitsil @kullanıcı', value: 'Üyenin kaydını sıfırlar.', inline: false },
        { name: '🔍 !kayitbilgi @kullanıcı', value: 'Kayıt bilgilerini gösterir.', inline: false },
        { name: '✏️ !kayitguncelle @kullanıcı', value: 'Kayıt bilgilerini günceller.', inline: false },
        { name: '📊 !istatistik', value: 'Sunucu istatistiklerini gösterir.', inline: false },
        { name: '⚠️ !uyar @kullanıcı sebep', value: 'Uyarı verir, log kanalına kaydeder.', inline: false },
        { name: '📋 !uyarilar @kullanıcı', value: 'Uyarı geçmişini gösterir.', inline: false },
        { name: '🗑️ !uyarisil @kullanıcı numara', value: 'Belirtilen uyarıyı siler.', inline: false },
        { name: '🎮 !takim rank rolüm aranan_rol [koridor]', value: 'Takım ilanı oluşturur, genel\'e bildirim gider.\nÖrnek: `!takim Epic Support Tank`', inline: false },
        { name: '❓ !yardim', value: 'Bu menüyü gösterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR • Asistan Paneli' })
      .setTimestamp()]
    });
  } else {
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('📖 Kullanılabilir Komutlar')
      .setColor(0x5865F2)
      .setDescription('Merhaba! Sunucuda kullanabileceğin komutlar bunlar:')
      .addFields(
        { name: '🎮 !takim rank rolüm aranan_rol [koridor]', value: 'Takım arkadaşı bulmak için ilan oluşturur.\nÖrnek: `!takim Mythic ADC Mid`', inline: false },
        { name: '❓ !yardim', value: 'Bu menüyü gösterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR • Yardım Menüsü' })
      .setTimestamp()]
    });
  }
};
