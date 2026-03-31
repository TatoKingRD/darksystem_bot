// handlers/kelimeOyunu.js
// Kelime zinciri oyunu — sadece KELIME_KANAL_ID kanalında çalışır

const oyunDurumu = {
  sonKelime: null,       // son geçerli kelime
  sonOyuncu: null,       // son oynayan kullanıcı ID
  kullanilanKelimeler: new Set(), // daha önce kullanılan kelimeler
};

// Türkçe karakter normalizasyonu (büyük/küçük harf)
function normalize(str) {
  return str.toLowerCase()
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .replace(/Ğ/g, 'ğ').replace(/Ü/g, 'ü')
    .replace(/Ş/g, 'ş').replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç').replace(/i/g, 'i')
    .trim();
}

function sonHarf(kelime) {
  return normalize(kelime).slice(-1);
}

function ilkHarf(kelime) {
  return normalize(kelime)[0];
}

module.exports = async function kelimeOyunu(message) {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.KELIME_KANAL_ID) return;

  // Sadece tek kelime kabul et
  const kelime = message.content.trim();
  if (kelime.includes(' ') || kelime.length < 2) return;

  const kelimeNorm = normalize(kelime);

  // İlk kelime — oyun henüz başlamamış
  if (!oyunDurumu.sonKelime) {
    oyunDurumu.sonKelime = kelimeNorm;
    oyunDurumu.sonOyuncu = message.author.id;
    oyunDurumu.kullanilanKelimeler.clear();
    oyunDurumu.kullanilanKelimeler.add(kelimeNorm);
    await message.react('✅');
    return;
  }

  // Ardışık oynama engeli
  if (message.author.id === oyunDurumu.sonOyuncu) {
    await message.react('❌');
    await message.reply(`⛔ Ardışık oynayamazsın! Başka biri oynamalı.`);
    return;
  }

  // Aynı kelime tekrarı
  if (oyunDurumu.kullanilanKelimeler.has(kelimeNorm)) {
    await message.react('❌');
    await message.reply(`⛔ **"${kelime}"** daha önce kullanıldı! Başka bir kelime söyle.`);
    return;
  }

  // Yanlış harf kontrolü
  const beklenenHarf = sonHarf(oyunDurumu.sonKelime);
  if (ilkHarf(kelimeNorm) !== beklenenHarf) {
    await message.react('❌');
    await message.reply(`⛔ Kelime **"${beklenenHarf.toUpperCase()}"** harfiyle başlamalı! (Son kelime: **${oyunDurumu.sonKelime}**)`);
    return;
  }

  // Doğru kelime ✅
  oyunDurumu.kullanilanKelimeler.add(kelimeNorm);
  oyunDurumu.sonKelime = kelimeNorm;
  oyunDurumu.sonOyuncu = message.author.id;
  await message.react('✅');
};