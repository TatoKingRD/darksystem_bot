// commands/yardim.js
// Herkese açık - moderatöre tam liste, normale kullanıcı listesi gösterir

const { EmbedBuilder } = require('discord.js');

module.exports = async function yardimKomutu(message, isMod) {
  if (isMod) {
    // Moderatör görünümü - tüm komutlar
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🛡️ Moderatör Komutları')
      .setColor(0xE74C3C)
      .setDescription('Aşağıdaki komutlar sadece moderatörler tarafından kullanılabilir.')
      .addFields(
        { name: '📋 `!panel`', value: 'Kayıt panelini (embed + buton) kanala gönderir.', inline: false },
        { name: '🗑️ `!kayitsil @kullanıcı`', value: 'Etiketlenen üyenin kaydını sıfırlar.', inline: false },
        { name: '🔍 `!kayitbilgi @kullanıcı`', value: 'Etiketlenen üyenin kayıt bilgilerini gösterir.', inline: false },
        { name: '✏️ `!kayitguncelle @kullanıcı`', value: 'Etiketlenen üyenin kayıt bilgilerini günceller.', inline: false },
        { name: '📊 `!istatistik`', value: 'Sunucu kayıt istatistiklerini gösterir.', inline: false },
        { name: '🎮 `!takim [rank] [rol]`', value: 'Takım arama ilanı oluşturur.', inline: false },
        { name: '❓ `!yardim`', value: 'Bu menüyü gösterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR • Moderatör Paneli' })
      .setTimestamp()]
    });
  } else {
    // Normal kullanıcı görünümü
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('📖 Kullanılabilir Komutlar')
      .setColor(0x5865F2)
      .setDescription('Merhaba! Sunucuda kullanabileceğin komutlar bunlar:')
      .addFields(
        { name: '🎮 `!takim [rank] [rol]`', value: 'Takım arkadaşı bulmak için ilan oluşturur.\nÖrnek: `!takim Mythic Nişancı`', inline: false },
        { name: '❓ `!yardim`', value: 'Bu menüyü gösterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR • Yardım Menüsü' })
      .setTimestamp()]
    });
  }
};
