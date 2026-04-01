// commands/yardim.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('yardim')
  .setDescription('Kullanılabilir komutları gösterir');

async function execute(interaction) {
  const isMod = process.env.MODERATOR_ROL_ID
    ? interaction.member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : interaction.member.permissions.has('Administrator');

  const isAsis = process.env.ASISTAN_ROL_ID
    ? interaction.member.roles.cache.has(process.env.ASISTAN_ROL_ID)
    : false;

  if (isMod) {
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
      .setTitle('🛡️ Moderatör Komutları')
      .setColor(0xE74C3C)
      .setDescription('Aşağıdaki komutlar sadece moderatörler tarafından kullanılabilir.')
      .addFields(
        { name: '📋 /panel', value: 'Kayıt panelini kanala gönderir.', inline: false },
        { name: '📊 /anket soru', value: 'Evet/Hayır anketi oluşturur.', inline: false },
        { name: '🗑️ /kayitsil @kullanıcı', value: 'Üyenin kaydını sıfırlar.', inline: false },
        { name: '🔍 /kayitbilgi @kullanıcı', value: 'Kayıt bilgilerini gösterir.', inline: false },
        { name: '✏️ /kayitguncelle @kullanıcı', value: 'Kayıt bilgilerini günceller.', inline: false },
        { name: '📊 /istatistik', value: 'Sunucu istatistiklerini gösterir.', inline: false },
        { name: '⚠️ /uyar @kullanıcı sebep', value: 'Uyarı verir, log kanalına kaydeder.', inline: false },
        { name: '🔇 /sustur @kullanıcı süre sebep', value: 'Kullanıcıyı geçici olarak susturur.', inline: false },
        { name: '🔊 /sustursil @kullanıcı', value: 'Kullanıcının susturmasını kaldırır.', inline: false },
        { name: '📋 /uyarilar @kullanıcı', value: 'Uyarı geçmişini gösterir.', inline: false },
        { name: '🗑️ /uyarisil @kullanıcı numara', value: 'Belirtilen uyarıyı siler.', inline: false },
        { name: '✅ /rolver @kullanıcı @rol', value: 'Kullanıcıya rol verir.', inline: false },
        { name: '❌ /rolal @kullanıcı @rol', value: 'Kullanıcıdan rol alır.', inline: false },
        { name: '🔁 /tekrarla komut dakika', value: 'Hatırlatma başlatır, bot kapansa bile devam eder.', inline: false },
        { name: '⏹️ /durdur komut', value: 'Hatırlatmayı durdurur.', inline: false },
        { name: '📋 /gorevler', value: 'Aktif hatırlatmaları listeler.', inline: false },
        { name: '🎮 /takim', value: 'Takım ilanı oluşturur. Rank: Epik → Yüce Mistik. Rol: Mid, Gold Koridor, EXP Koridor, Jungler, Roam. Max 4 aranan rol seçilebilir.', inline: false },
        { name: '👤 /profil', value: 'Kendi kayıt bilgilerini gösterir.', inline: false },
        { name: '🏅 /rankguncelle', value: 'Kendi rankını günceller.', inline: false },
        { name: '🎲 /hero', value: 'Rastgele MLBB hero önerir.', inline: false },
        { name: '⚔️ /duello @kullanıcı', value: 'Düello meydan oku.', inline: false },
        { name: '❓ /yardim', value: 'Bu menüyü gösterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR • Moderatör Paneli' })
      .setTimestamp()]
    });
  } else if (isAsis) {
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
      .setTitle('🤝 Asistan Komutları')
      .setColor(0xF39C12)
      .setDescription('Aşağıdaki komutlar asistanlar tarafından kullanılabilir.')
      .addFields(
        { name: '🗑️ /kayitsil @kullanıcı', value: 'Üyenin kaydını sıfırlar.', inline: false },
        { name: '🔍 /kayitbilgi @kullanıcı', value: 'Kayıt bilgilerini gösterir.', inline: false },
        { name: '✏️ /kayitguncelle @kullanıcı', value: 'Kayıt bilgilerini günceller.', inline: false },
        { name: '📊 /istatistik', value: 'Sunucu istatistiklerini gösterir.', inline: false },
        { name: '⚠️ /uyar @kullanıcı sebep', value: 'Uyarı verir.', inline: false },
        { name: '🔇 /sustur @kullanıcı süre sebep', value: 'Kullanıcıyı geçici olarak susturur.', inline: false },
        { name: '🔊 /sustursil @kullanıcı', value: 'Kullanıcının susturmasını kaldırır.', inline: false },
        { name: '📋 /uyarilar @kullanıcı', value: 'Uyarı geçmişini gösterir.', inline: false },
        { name: '🗑️ /uyarisil @kullanıcı numara', value: 'Belirtilen uyarıyı siler.', inline: false },
        { name: '🎮 /takim', value: 'Takım ilanı oluşturur. Rank: Epik → Yüce Mistik. Rol: Mid, Gold Koridor, EXP Koridor, Jungler, Roam. Max 4 aranan rol seçilebilir.', inline: false },
        { name: '👤 /profil', value: 'Kendi kayıt bilgilerini gösterir.', inline: false },
        { name: '🏅 /rankguncelle', value: 'Kendi rankını günceller.', inline: false },
        { name: '❓ /yardim', value: 'Bu menüyü gösterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR • Asistan Paneli' })
      .setTimestamp()]
    });
  } else {
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
      .setTitle('📖 Kullanılabilir Komutlar')
      .setColor(0x5865F2)
      .setDescription('Merhaba! Sunucuda kullanabileceğin komutlar:')
      .addFields(
        { name: '🎲 /hero', value: 'Rastgele MLBB hero önerir. Rol seçebilirsin.', inline: false },
        { name: '⚔️ /duello @kullanıcı', value: 'Birine düello meydan oku, rastgele kazanan belirlenir.', inline: false },
        { name: '🎮 /takim', value: 'Takım arkadaşı bulmak için ilan oluşturur.\nRank: Epik → Yüce Mistik\nRol: Mid, Gold Koridor, EXP Koridor, Jungler, Roam\nMax 4 aranan rol seçilebilir.', inline: false },
        { name: '👤 /profil', value: 'Kendi kayıt bilgilerini gösterir.', inline: false },
        { name: '🏅 /rankguncelle', value: 'Kendi rankını günceller.', inline: false },
        { name: '❓ /yardim', value: 'Bu menüyü gösterir.', inline: false }
      )
      .setFooter({ text: 'MLBB TR • Yardım Menüsü' })
      .setTimestamp()]
    });
  }
}

module.exports = { data, execute };