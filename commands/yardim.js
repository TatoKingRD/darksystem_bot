// commands/yardim.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('yardim')
  .setDescription('Kullanılabilir komutları gösterir');

function isMod(member) {
  return process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
}

function isAsis(member) {
  return process.env.ASISTAN_ROL_ID
    ? member.roles.cache.has(process.env.ASISTAN_ROL_ID)
    : false;
}

function getEmbed(kategori, yetkili) {
  switch (kategori) {
    case 'genel':
      return new EmbedBuilder()
        .setTitle('📖 Genel Komutlar')
        .setColor(0x5865F2)
        .setDescription('Tüm üyelerin kullanabileceği komutlar:')
        .addFields(
          { name: '🎮 /takim', value: 'Takım arkadaşı arama ilanı. Rank: Epik → Yüce Mistik, Rol: Mid/Gold/EXP/Jungler/Roam, max 4 aranan rol.', inline: false },
          { name: '👤 /profil', value: 'Kendi kayıt bilgilerini gösterir.', inline: false },
          { name: '🏅 /rankguncelle', value: 'Kendi rankını günceller.', inline: false },
          { name: '📅 /kacgun', value: 'Sunucuya katılalı kaç gün olduğunu gösterir.', inline: false },
          { name: '🏆 /topkacgun', value: 'En uzun süreli üyelerin sıralaması.', inline: false },
          { name: '❓ /yardim', value: 'Bu menüyü gösterir.', inline: false },
        )
        .setFooter({ text: 'MLBB TR • Genel Komutlar' });

    case 'eglence':
      return new EmbedBuilder()
        .setTitle('🎉 Eğlence Komutlar')
        .setColor(0xE67E22)
        .setDescription('Eğlence amaçlı komutlar:')
        .addFields(
          { name: '🎲 /hero', value: 'Rastgele MLBB hero önerir. Rol seçebilirsin.', inline: false },
          { name: '⚔️ /duello @kullanıcı', value: 'Birine düello meydan oku, rastgele kazanan belirlenir.', inline: false },
        )
        .setFooter({ text: 'MLBB TR • Eğlence' });

    case 'kelime':
      return new EmbedBuilder()
        .setTitle('📝 Kelime Oyunu')
        .setColor(0x57F287)
        .setDescription('Kelime zinciri oyunu kuralları:')
        .addFields(
          { name: '📌 Kanal', value: 'Sadece kelime-oyunu kanalında çalışır.', inline: false },
          { name: '🔤 Kural', value: 'Son harften devam et. Örnek: elma → araba → armut', inline: false },
          { name: '⛔ Yasak', value: 'Ardışık oynama yok, aynı kelime tekrarı yok, TDK\'da olmayan kelime yok.', inline: false },
          { name: '✅ Doğru', value: 'Bot ✅ ile onaylar.', inline: false },
          { name: '❌ Yanlış', value: 'Bot ❌ ile reddeder, mesaj 5 saniyede silinir.', inline: false },
        )
        .setFooter({ text: 'MLBB TR • Kelime Oyunu' });

    case 'kayit':
      return new EmbedBuilder()
        .setTitle('📋 Kayıt Yönetimi')
        .setColor(0x9B59B6)
        .setDescription('Kayıt sistemi komutları:')
        .addFields(
          { name: '📋 /panel', value: 'Kayıt panelini kanala gönderir.', inline: false },
          { name: '🗑️ /kayitsil @kullanıcı', value: 'Üyenin kaydını sıfırlar.', inline: false },
          { name: '🔍 /kayitbilgi @kullanıcı', value: 'Kayıt bilgilerini gösterir.', inline: false },
          { name: '✏️ /kayitguncelle @kullanıcı', value: 'Kayıt bilgilerini günceller.', inline: false },
          { name: '📊 /istatistik', value: 'Sunucu istatistiklerini gösterir.', inline: false },
        )
        .setFooter({ text: yetkili ? 'MLBB TR • Kayıt Yönetimi' : 'MLBB TR • Kayıt Yönetimi (Sadece Yetkililer)' });

    case 'moderasyon':
      return new EmbedBuilder()
        .setTitle('🛡️ Moderasyon')
        .setColor(0xE74C3C)
        .setDescription('Moderasyon komutları:')
        .addFields(
          { name: '⚠️ /uyar @kullanıcı sebep', value: 'Uyarı verir, log kanalına kaydeder.', inline: false },
          { name: '📋 /uyarilar @kullanıcı', value: 'Uyarı geçmişini gösterir.', inline: false },
          { name: '🗑️ /uyarisil @kullanıcı numara', value: 'Belirtilen uyarıyı siler.', inline: false },
          { name: '🔇 /sustur @kullanıcı süre sebep', value: 'Kullanıcıyı geçici susturur.', inline: false },
          { name: '🔊 /sustursil @kullanıcı', value: 'Susturmayı kaldırır.', inline: false },
          { name: '✅ /rolver @kullanıcı @rol', value: 'Kullanıcıya rol verir.', inline: false },
          { name: '❌ /rolal @kullanıcı @rol', value: 'Kullanıcıdan rol alır.', inline: false },
          { name: '🔁 /tekrarla komut dakika', value: 'Hatırlatma başlatır, bot kapansa bile devam eder.', inline: false },
          { name: '⏹️ /durdur komut', value: 'Hatırlatmayı durdurur.', inline: false },
          { name: '📋 /gorevler', value: 'Aktif hatırlatmaları listeler.', inline: false },
          { name: '📊 /anket soru', value: 'Anket oluşturur.', inline: false },
          { name: '🗳️ /anketoylar mesaj_id', value: 'Ankete oy verenleri gösterir.', inline: false },
        )
        .setFooter({ text: 'MLBB TR • Moderasyon (Sadece Yetkililer)' });

    default:
      return null;
  }
}

function getRow(aktifKategori, yetkili) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('yardim_genel')
      .setLabel('📖 Genel')
      .setStyle(aktifKategori === 'genel' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('yardim_eglence')
      .setLabel('🎉 Eğlence')
      .setStyle(aktifKategori === 'eglence' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('yardim_kelime')
      .setLabel('📝 Kelime')
      .setStyle(aktifKategori === 'kelime' ? ButtonStyle.Primary : ButtonStyle.Secondary),
  );

  if (yetkili) {
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('yardim_kayit')
        .setLabel('📋 Kayıt')
        .setStyle(aktifKategori === 'kayit' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('yardim_moderasyon')
        .setLabel('🛡️ Moderasyon')
        .setStyle(aktifKategori === 'moderasyon' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );
    return [row, row2];
  }

  return [row];
}

async function execute(interaction) {
  const yetkili = isMod(interaction.member) || isAsis(interaction.member);
  const embed = getEmbed('genel', yetkili);
  const rows = getRow('genel', yetkili);
  await interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
}

module.exports = { data, execute, getEmbed, getRow };