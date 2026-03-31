// handlers/kelimeOyunu.js
// Kelime zinciri oyunu — sadece KELIME_KANAL_ID kanalında çalışır

const https = require('https');

const oyunDurumu = {
  sonKelime: null,
  sonOyuncu: null,
  kullanilanKelimeler: new Set(),
};

function normalize(str) {
  return str.toLowerCase()
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .replace(/Ğ/g, 'ğ').replace(/Ü/g, 'ü')
    .replace(/Ş/g, 'ş').replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .trim();
}

function sonHarf(kelime) {
  return normalize(kelime).slice(-1);
}

function ilkHarf(kelime) {
  return normalize(kelime)[0];
}

// TDK API'den kelimeyi kontrol et
function tdkKontrol(kelime) {
  return new Promise((resolve) => {
    const url = `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(kelime)}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // TDK hata döndürüyorsa veya boş array ise kelime yok
          if (Array.isArray(json) && json.length > 0 && json[0].madde) {
            resolve(true);
          } else {
            resolve(false);
          }
        } catch {
          resolve(false);
        }
      });
    }).on('error', () => resolve(false));
  });
}

module.exports = async function kelimeOyunu(message) {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.KELIME_KANAL_ID) return;

  const kelime = message.content.trim();
  if (kelime.includes(' ') || kelime.length < 2) return;

  const kelimeNorm = normalize(kelime);

  // İlk kelime — oyun henüz başlamamış
  if (!oyunDurumu.sonKelime) {
    const gecerli = await tdkKontrol(kelimeNorm);
    if (!gecerli) {
      await message.react('❌');
      const m = await message.reply(`⛔ **"${kelime}"** TDK sözlüğünde bulunamadı!`);
      setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
      return;
    }
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
    const m = await message.reply(`⛔ Ardışık oynayamazsın! Başka biri oynamalı.`);
    setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    return;
  }

  // Aynı kelime tekrarı
  if (oyunDurumu.kullanilanKelimeler.has(kelimeNorm)) {
    await message.react('❌');
    const m = await message.reply(`⛔ **"${kelime}"** daha önce kullanıldı! Başka bir kelime söyle.`);
    setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    return;
  }

  // Yanlış harf kontrolü
  const beklenenHarf = sonHarf(oyunDurumu.sonKelime);
  if (ilkHarf(kelimeNorm) !== beklenenHarf) {
    await message.react('❌');
    const m = await message.reply(`⛔ Kelime **"${beklenenHarf.toUpperCase()}"** harfiyle başlamalı! (Son kelime: **${oyunDurumu.sonKelime}**)`);
    setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    return;
  }

  // TDK kelime doğrulama
  const gecerli = await tdkKontrol(kelimeNorm);
  if (!gecerli) {
    await message.react('❌');
    const m = await message.reply(`⛔ **"${kelime}"** TDK sözlüğünde bulunamadı!`);
    setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    return;
  }

  // Doğru kelime ✅
  oyunDurumu.kullanilanKelimeler.add(kelimeNorm);
  oyunDurumu.sonKelime = kelimeNorm;
  oyunDurumu.sonOyuncu = message.author.id;
  await message.react('✅');
};