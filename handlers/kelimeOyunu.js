// handlers/kelimeOyunu.js
const https = require('https');

const oyunDurumu = {
  sonKelime: null,
  sonOyuncu: null,
  kullanilanKelimeler: new Set(),
  islemKuyrugu: Promise.resolve(),
};

function normalize(str) {
  return str
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .replace(/Ğ/g, 'ğ').replace(/Ü/g, 'ü')
    .replace(/Ş/g, 'ş').replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .toLowerCase()
    .trim();
}

function tdkKontrol(kelime) {
  return new Promise((resolve) => {
    const url = `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(kelime)}`;
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(Array.isArray(json) && json.length > 0 && !!json[0].madde);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function isleMesaj(message) {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.KELIME_KANAL_ID) return;

  const kelime = message.content.trim();

  // Boşluk içeren veya çok uzun mesajları sil
  if (kelime.includes(' ') || kelime.length > 30) {
    await message.delete().catch(() => {});
    return;
  }

  if (kelime.length < 2) {
    await message.delete().catch(() => {});
    return;
  }

  const kelimeNorm = normalize(kelime);

  // İlk kelime
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
    const m = await message.reply(`⛔ **"${kelime}"** daha önce kullanıldı!`);
    setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    return;
  }

  // Yanlış harf
  const beklenenHarf = oyunDurumu.sonKelime.slice(-1);
  if (kelimeNorm[0] !== beklenenHarf) {
    await message.react('❌');
    const m = await message.reply(`⛔ Kelime **"${beklenenHarf.toUpperCase()}"** harfiyle başlamalı! (Son kelime: **${oyunDurumu.sonKelime}**)`);
    setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    return;
  }

  // TDK kontrolü
  const gecerli = await tdkKontrol(kelimeNorm);
  if (!gecerli) {
    await message.react('❌');
    const m = await message.reply(`⛔ **"${kelime}"** TDK sözlüğünde bulunamadı!`);
    setTimeout(() => { m.delete().catch(() => {}); message.delete().catch(() => {}); }, 5000);
    return;
  }

  // Doğru ✅
  oyunDurumu.kullanilanKelimeler.add(kelimeNorm);
  oyunDurumu.sonKelime = kelimeNorm;
  oyunDurumu.sonOyuncu = message.author.id;
  await message.react('✅');
}

module.exports = function kelimeOyunu(message) {
  // Kuyruk sistemi — mesajları sırayla işle
  oyunDurumu.islemKuyrugu = oyunDurumu.islemKuyrugu
    .then(() => isleMesaj(message))
    .catch(err => console.error('Kelime oyunu hatası:', err));
};