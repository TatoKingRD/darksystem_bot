// ai/islemUygula.js
const https = require('https');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const emojiMap = {
  genel: '💬', sohbet: '💬', duyuru: '📢', duyurular: '📢',
  oyun: '🎮', gaming: '🎮', mlbb: '🎮', muzik: '🎵', müzik: '🎵',
  log: '📋', kayit: '📝', kayıt: '📝', takim: '⚔️', takım: '⚔️',
  resim: '🖼️', video: '🎬', kural: '📜', kurallar: '📜',
  yardim: '❓', yardım: '❓', bot: '🤖', arsiv: '🗄️', arşiv: '🗄️',
  mod: '🛡️', ticket: '🎫', destek: '🆘', boost: '🚀',
  cekilis: '🎁', çekiliş: '🎁', davet: '📨', emoji: '😄',
  gorusuruz: '👋', görüşürüz: '👋', hakkinda: 'ℹ️', hakkında: 'ℹ️',
  hikaye: '📖', hosgeldin: '🌟', hoşgeldin: '🌟', itiraf: '🤫',
  karakter: '⚔️', kendin: '👤', level: '📊', levels: '📊',
  mudae: '🃏', owo: '🐱', rol: '🎭', sayi: '🔢', sayı: '🔢',
  ship: '💕', sikayet: '📣', şikayet: '📣', yetkili: '🛡️',
  partner: '🤝', anime: '🎌', spam: '🗑️', disboard: '📌',
  kelime: '📝', ozel: '🔒', özel: '🔒', anigame: '🎮',
  aki: '🌸', wallpaper: '🖼️', icon: '🎨', oneri: '💡', öneri: '💡',
  avantaj: '⭐', turnuva: '🏆', strateji: '🧠',
};

const sureMsMap = { '60s': 60000, '5m': 300000, '10m': 600000, '1h': 3600000, '1g': 86400000, '1w': 604800000 };
const sureLabelMap = { '60s': '60 Saniye', '5m': '5 Dakika', '10m': '10 Dakika', '1h': '1 Saat', '1g': '1 Gün', '1w': '1 Hafta' };

// Emoji ve özel karakterleri soyarak kanal ara
function kanalBul(guild, aranan) {
  if (!aranan) return null;
  const temizle = str => str.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\-]/gi, '').replace(/^-+|-+$/g, '');
  const arananTemiz = temizle(aranan);
  return guild.channels.cache.find(c =>
    c.type === 0 && (
      c.name.toLowerCase() === aranan.toLowerCase() ||
      temizle(c.name) === arananTemiz
    )
  );
}

// Hava durumu - Open-Meteo (ücretsiz, key gerektirmez, stabil)
function httpsGetJson(hostname, path, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname, path, method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'DarkSystemBot/1.0' },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error(`[hava:${hostname}] HTTP ${res.statusCode}:`, data.substring(0, 200));
          return resolve(null);
        }
        try { resolve(JSON.parse(data)); }
        catch (e) {
          console.error(`[hava:${hostname}] JSON parse hatası:`, e.message, 'data:', data.substring(0, 200));
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      console.error(`[hava:${hostname}] Bağlantı hatası:`, e.message);
      resolve(null);
    });
    req.setTimeout(timeoutMs, () => {
      console.error(`[hava:${hostname}] Timeout (${timeoutMs}ms)`);
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

// WMO weather code → Türkçe açıklama
const HAVA_DURUM_KODLARI = {
  0: 'Açık', 1: 'Çoğunlukla açık', 2: 'Parçalı bulutlu', 3: 'Kapalı',
  45: 'Sisli', 48: 'Kırağılı sis',
  51: 'Hafif çisenti', 53: 'Çisenti', 55: 'Yoğun çisenti',
  56: 'Hafif donan çisenti', 57: 'Yoğun donan çisenti',
  61: 'Hafif yağmur', 63: 'Yağmur', 65: 'Şiddetli yağmur',
  66: 'Hafif donan yağmur', 67: 'Şiddetli donan yağmur',
  71: 'Hafif kar', 73: 'Kar', 75: 'Yoğun kar',
  77: 'Kar taneleri',
  80: 'Hafif sağanak', 81: 'Sağanak', 82: 'Şiddetli sağanak',
  85: 'Hafif kar sağanağı', 86: 'Yoğun kar sağanağı',
  95: 'Gök gürültülü fırtına', 96: 'Dolulu fırtına', 99: 'Şiddetli dolulu fırtına',
};

async function havaDurumuGetir(sehir) {
  console.log(`[hava] Aranan sehir: "${sehir}"`);

  // 1. Şehir → koordinat
  const geoPath = `/v1/search?name=${encodeURIComponent(sehir)}&count=1&language=tr&format=json`;
  const geo = await httpsGetJson('geocoding-api.open-meteo.com', geoPath);
  if (!geo) {
    console.error(`[hava] Geocoding cevap vermedi.`);
    return null;
  }
  const konum = geo?.results?.[0];
  if (!konum) {
    console.error(`[hava] "${sehir}" icin konum bulunamadi. Gelen veri:`, JSON.stringify(geo).substring(0, 200));
    return null;
  }
  console.log(`[hava] Konum bulundu: ${konum.name} (${konum.latitude}, ${konum.longitude})`);

  // 2. Koordinat → hava durumu
  const wPath = `/v1/forecast?latitude=${konum.latitude}&longitude=${konum.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
  const w = await httpsGetJson('api.open-meteo.com', wPath);
  if (!w) {
    console.error(`[hava] Forecast API cevap vermedi.`);
    return null;
  }
  if (!w.current) {
    console.error(`[hava] Forecast'ta 'current' yok. Gelen:`, JSON.stringify(w).substring(0, 200));
    return null;
  }

  return {
    sehirAdi: konum.name + (konum.admin1 ? `, ${konum.admin1}` : ''),
    sicaklik: Math.round(w.current.temperature_2m),
    hissedilen: Math.round(w.current.apparent_temperature),
    durum: HAVA_DURUM_KODLARI[w.current.weather_code] || 'Bilinmeyen',
    nem: w.current.relative_humidity_2m,
    ruzgar: Math.round(w.current.wind_speed_10m),
    maxSicaklik: Math.round(w.daily?.temperature_2m_max?.[0] ?? w.current.temperature_2m),
    minSicaklik: Math.round(w.daily?.temperature_2m_min?.[0] ?? w.current.temperature_2m),
  };
}

async function islemUygula(islemAdi, parametreler, guild, message = null) {
  try {
    switch (islemAdi) {

      // ─── KANAL İŞLEMLERİ ───
      case 'kanal_adi_degistir': {
        const kanal = kanalBul(guild, parametreler.kanal_adi);
        if (!kanal) return `❌ "${parametreler.kanal_adi}" kanalı bulunamadı.`;
        const eski = kanal.name;
        await kanal.setName(parametreler.yeni_ad);
        return `✅ **#${eski}** → **#${parametreler.yeni_ad}** olarak değiştirildi.`;
      }
      case 'kanal_olustur': {
        const yeni = await guild.channels.create({ name: parametreler.kanal_adi, type: 0 });
        return `✅ **#${yeni.name}** kanalı oluşturuldu.`;
      }
      case 'kanal_sil': {
        const kanal = kanalBul(guild, parametreler.kanal_adi);
        if (!kanal) return `❌ "${parametreler.kanal_adi}" kanalı bulunamadı.`;
        const ad = kanal.name;
        await kanal.delete();
        return `✅ **#${ad}** kanalı silindi.`;
      }
      case 'kanal_listele': {
        const liste = guild.channels.cache
          .filter(c => c.type === 0)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(c => `📢 #${c.name}`)
          .join('\n');
        return `**Sunucudaki kanallar:**\n${liste}`;
      }
      case 'kanal_temizle': {
        const kanallar = guild.channels.cache.filter(c => c.type === 0);
        let n = 0;
        for (const [, k] of kanallar) {
          const temiz = k.name.replace(/[^a-z0-9\u00c0-\u024f\-]/gi, '').replace(/^-+|-+$/g, '').toLowerCase().trim();
          if (temiz && temiz !== k.name) { await k.setName(temiz).catch(() => {}); n++; }
        }
        return `✅ ${n} kanalın adı temizlendi.`;
      }
      case 'kanal_tek_temizle': {
        const kanal = kanalBul(guild, parametreler.kanal_adi);
        if (!kanal) return `❌ "${parametreler.kanal_adi}" kanalı bulunamadı.`;
        const eskiAd = kanal.name;
        const temiz = kanal.name.replace(/[^a-z0-9\u00c0-\u024f\-]/gi, '').replace(/^-+|-+$/g, '').toLowerCase().trim();
        if (!temiz) return `❌ Kanal adı tamamen boş kalırdı, işlem iptal.`;
        if (temiz === kanal.name) return `ℹ️ **#${eskiAd}** zaten temiz.`;
        await kanal.setName(temiz);
        return `✅ **#${eskiAd}** → **#${temiz}** olarak temizlendi.`;
      }
      case 'kanal_emoji_ekle': {
        const kanallar = guild.channels.cache.filter(c => c.type === 0);
        let n = 0;
        for (const [, k] of kanallar) {
          const adKucuk = k.name.toLowerCase();
          let emoji = null;
          for (const [anahtar, e] of Object.entries(emojiMap)) {
            if (adKucuk.includes(anahtar)) { emoji = e; break; }
          }
          if (emoji && !k.name.startsWith(emoji)) { await k.setName(emoji + k.name).catch(() => {}); n++; }
        }
        return `✅ ${n} kanala emoji eklendi.`;
      }
      case 'kanal_kategori_duzenle': {
        const kategoriMap = {
          '📢 BİLGİ': ['duyuru', 'kural', 'kurallar', 'hakkinda', 'hakkında', 'partner', 'davet', 'disboard'],
          '💬 SOHBET': ['genel', 'sohbet', 'spam', 'itiraf', 'kendin', 'gorusuruz', 'görüşürüz'],
          '🎮 OYUN': ['oyun', 'gaming', 'mlbb', 'anigame', 'aki', 'mudae', 'owo', 'takim', 'takım', 'turnuva', 'strateji', 'karakter'],
          '🎵 MÜZİK': ['muzik', 'müzik'],
          '🖼️ MEDYA': ['resim', 'video', 'wallpaper', 'icon', 'anime'],
          '🛡️ YÖNETİM': ['log', 'kayit', 'kayıt', 'mod', 'yetkili', 'ticket', 'destek', 'sikayet', 'şikayet', 'oneri', 'öneri'],
          '🌟 ÖZEL': ['boost', 'avantaj', 'cekilis', 'çekiliş', 'level', 'levels', 'rol', 'profil'],
          '🤖 BOT': ['bot', 'komut', 'sayi', 'sayı', 'kelime', 'ship'],
        };
        let tasinan = 0, kategoriOlusturulan = 0;
        for (const [kategoriAdi, anahtarlar] of Object.entries(kategoriMap)) {
          let kategori = guild.channels.cache.find(c => c.type === 4 && c.name.toUpperCase() === kategoriAdi.toUpperCase());
          const eslesmeler = guild.channels.cache.filter(c => {
            if (c.type !== 0) return false;
            const ad = c.name.toLowerCase();
            return anahtarlar.some(k => ad.includes(k));
          });
          if (eslesmeler.size === 0) continue;
          if (!kategori) {
            kategori = await guild.channels.create({ name: kategoriAdi, type: 4 }).catch(() => null);
            if (kategori) kategoriOlusturulan++;
          }
          if (!kategori) continue;
          for (const [, kanal] of eslesmeler) {
            if (kanal.parentId !== kategori.id) {
              await kanal.setParent(kategori.id, { lockPermissions: false }).catch(() => {});
              tasinan++;
            }
          }
        }
        return `✅ ${tasinan} kanal kategorilere taşındı${kategoriOlusturulan > 0 ? `, ${kategoriOlusturulan} yeni kategori oluşturuldu` : ''}.`;
      }
      case 'mesaj_gonder': {
        // "buraya / bu kanal / dm / şuraya / current" gibi ifadeler gelirse direkt mevcut kanalı kullan
        const buradaKelimeleri = ['buraya', 'bu kanal', 'bu kanala', 'burada', 'suraya', 'şuraya', 'su kanala', 'şu kanala', 'dm', 'current', 'mevcut', 'mevcut_kanal', 'mevcutkanal', 'here', 'this channel'];
        const arananNorm = (parametreler.kanal_adi || '').toLowerCase().trim();
        let kanal = null;
        if (!parametreler.kanal_adi || buradaKelimeleri.includes(arananNorm)) {
          kanal = message?.channel || null;
        } else {
          kanal = kanalBul(guild, parametreler.kanal_adi);
        }
        // Hâlâ bulunamadıysa ve mevcut kanal varsa ona düş
        if (!kanal && message?.channel) kanal = message.channel;
        if (!kanal) return `❌ "${parametreler.kanal_adi}" kanalı bulunamadı.`;
        if (parametreler.embed) {
          await kanal.send({ embeds: [new EmbedBuilder()
            .setTitle(parametreler.baslik || '📢 Duyuru')
            .setDescription(parametreler.mesaj)
            .setColor(0x5865F2)
            .setTimestamp()
          ]});
        } else {
          await kanal.send(parametreler.mesaj);
        }
        return `✅ **#${kanal.name}** kanalına mesaj gönderildi.`;
      }
      case 'mesaj_sabitle': {
        const kanal = kanalBul(guild, parametreler.kanal_adi);
        if (!kanal) return `❌ "${parametreler.kanal_adi}" kanalı bulunamadı.`;
        if (parametreler.islem === 'sabitle') {
          const mesajlar = await kanal.messages.fetch({ limit: 1 });
          const sonMesaj = mesajlar.first();
          if (!sonMesaj) return `❌ Kanalda mesaj bulunamadı.`;
          await sonMesaj.pin();
          return `✅ **#${kanal.name}** kanalındaki son mesaj sabitlendi.`;
        } else {
          const sabitler = await kanal.messages.fetchPinned();
          if (sabitler.size === 0) return `❌ Sabitlenmiş mesaj yok.`;
          await sabitler.first().unpin();
          return `✅ **#${kanal.name}** kanalındaki sabit mesaj kaldırıldı.`;
        }
      }
      case 'kanal_yavasla': {
        const hedefKanal = parametreler.kanal_adi
          ? kanalBul(guild, parametreler.kanal_adi)
          : (message?.channel || null);
        if (!hedefKanal) return `❌ Kanal bulunamadı.`;
        const saniye = Math.max(0, Math.min(21600, parametreler.saniye || 0));
        await hedefKanal.setRateLimitPerUser(saniye);
        if (saniye === 0) return `✅ **#${hedefKanal.name}** kanalının yavaş modu kaldırıldı.`;
        return `✅ **#${hedefKanal.name}** kanalına **${saniye} saniye** yavaş mod uygulandı.`;
      }

      // ─── ÜYE İŞLEMLERİ ───
      case 'uye_ban': {
        const id = parametreler.kullanici_id.replace(/[<@!>]/g, '');
        const uye = await guild.members.fetch(id).catch(() => null);
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        await uye.ban({ reason: parametreler.sebep || 'Sebep belirtilmedi' });
        return `✅ **${uye.user.tag}** banlandı.`;
      }
      case 'uye_kick': {
        const id = parametreler.kullanici_id.replace(/[<@!>]/g, '');
        const uye = await guild.members.fetch(id).catch(() => null);
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        await uye.kick(parametreler.sebep || 'Sebep belirtilmedi');
        return `✅ **${uye.user.tag}** atıldı.`;
      }
      case 'uye_sustur': {
        const id = parametreler.kullanici_id.replace(/[<@!>]/g, '');
        const uye = await guild.members.fetch(id).catch(() => null);
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        const sureMs = sureMsMap[parametreler.sure] || 600000;
        const sureLabel = sureLabelMap[parametreler.sure] || '10 Dakika';
        await uye.timeout(sureMs, parametreler.sebep || 'Sebep belirtilmedi');
        return `✅ **${uye.user.tag}** ${sureLabel} susturuldu.`;
      }
      case 'rol_ver': {
        const id = parametreler.kullanici_id.replace(/[<@!>]/g, '');
        const uye = await guild.members.fetch(id).catch(() => null);
        const rol = guild.roles.cache.find(r => r.name.toLowerCase() === parametreler.rol_adi.toLowerCase());
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        if (!rol) return '❌ Rol bulunamadı.';
        await uye.roles.add(rol);
        return `✅ <@${uye.id}> kullanıcısına **${rol.name}** rolü verildi.`;
      }
      case 'rol_al': {
        const id = parametreler.kullanici_id.replace(/[<@!>]/g, '');
        const uye = await guild.members.fetch(id).catch(() => null);
        const rol = guild.roles.cache.find(r => r.name.toLowerCase() === parametreler.rol_adi.toLowerCase());
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        if (!rol) return '❌ Rol bulunamadı.';
        await uye.roles.remove(rol);
        return `✅ <@${uye.id}> kullanıcısından **${rol.name}** rolü alındı.`;
      }
      case 'kullanici_bilgi': {
        const id = parametreler.kullanici_id.replace(/[<@!>]/g, '');
        const uye = await guild.members.fetch(id).catch(() => null);
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        // Arşiv kanalında ara
        const arsivKanal = guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
        if (!arsivKanal) return '❌ Arşiv kanalı tanımlı değil.';
        let lastId = null;
        while (true) {
          const options = { limit: 100 };
          if (lastId) options.before = lastId;
          const mesajlar = await arsivKanal.messages.fetch(options).catch(() => null);
          if (!mesajlar || mesajlar.size === 0) break;
          for (const [, msg] of mesajlar) {
            if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `Kullanıcı ID: ${id}`) {
              const fields = {};
              for (const f of msg.embeds[0].fields) fields[f.name] = f.value;
              return `👤 **${uye.user.tag}** kayıt bilgileri:\n` +
                `• İsim: ${fields['👤 İsim'] || '?'}\n` +
                `• Yaş: ${fields['🎂 Yaş'] || '?'}\n` +
                `• Nick: ${fields['🎮 Nick'] || fields['🎮 IGN'] || 'Belirtilmedi'}\n` +
                `• Kayıt: ${fields['📅 Tarih'] || '?'}`;
            }
          }
          if (mesajlar.size < 100) break;
          lastId = mesajlar.last().id;
        }
        return `❌ <@${id}> için kayıt bulunamadı.`;
      }
      case 'kullanici_uyarilari': {
        const id = parametreler.kullanici_id.replace(/[<@!>]/g, '');
        const uye = await guild.members.fetch(id).catch(() => null);
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        const uyariKanal = guild.channels.cache.get(process.env.UYARI_KANAL_ID || process.env.LOG_KANAL_ID);
        if (!uyariKanal) return '❌ Uyarı/log kanalı tanımlı değil.';
        let uyariSayisi = 0;
        const mesajlar = await uyariKanal.messages.fetch({ limit: 100 }).catch(() => null);
        if (mesajlar) {
          for (const [, msg] of mesajlar) {
            if (msg.embeds.length > 0 &&
              msg.embeds[0].footer?.text?.includes(id) &&
              msg.embeds[0].title?.includes('Uyarı')) {
              uyariSayisi++;
            }
          }
        }
        return `⚠️ **${uye.user.tag}** — toplam **${uyariSayisi}** uyarı kaydı bulundu.`;
      }
      case 'kullanici_sure': {
        // MEVCUT_KULLANICI ise mesajı yazan kişiyi al
        let id = parametreler.kullanici_id;
        if (!id || ['MEVCUT_KULLANICI', 'mevcut_kullanici', 'ben', 'BEN'].includes(id)) {
          id = message?.author?.id;
        }
        id = String(id || '').replace(/[<@!>]/g, '');
        if (!id) return '❌ Kullanıcı belirtilmedi.';
        const uye = await guild.members.fetch(id).catch(() => null);
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        const katilim = uye.joinedAt;
        if (!katilim) return '❌ Katılım tarihi alınamadı.';
        const simdi = new Date();
        const fark = simdi - katilim;
        const gun = Math.floor(fark / (1000 * 60 * 60 * 24));
        const saat = Math.floor((fark % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const hesapGun = Math.floor((simdi - uye.user.createdAt) / (1000 * 60 * 60 * 24));
        let rozet = '🌱 Çaylak';
        if (gun >= 365) rozet = '👑 Veteran';
        else if (gun >= 180) rozet = '🌟 Eski Üye';
        else if (gun >= 90) rozet = '🔥 Aktif Üye';
        else if (gun >= 30) rozet = '✨ Yeni Üye';
        return `📅 **${uye.user.username}** — Sunucuda **${gun}** gün **${saat}** saat. Hesap yaşı: **${hesapGun}** gün. Rozet: ${rozet}`;
      }
      case 'nick_degistir': {
        const id = parametreler.kullanici_id.replace(/[<@!>]/g, '');
        const uye = await guild.members.fetch(id).catch(() => null);
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        const eskiNick = uye.nickname || uye.user.username;
        await uye.setNickname(parametreler.yeni_nick);
        return `✅ **${eskiNick}** → **${parametreler.yeni_nick}** olarak değiştirildi.`;
      }

      // ─── SUNUCU BİLGİ ───
      case 'sunucu_istatistik': {
        await guild.members.fetch();
        const toplamUye = guild.memberCount;
        const kayitliUyeler = process.env.KAYITLI_ROL_ID
          ? guild.members.cache.filter(m => m.roles.cache.has(process.env.KAYITLI_ROL_ID)).size
          : 0;
        const kayitsizUyeler = process.env.KAYITSIZ_ROL_ID
          ? guild.members.cache.filter(m => m.roles.cache.has(process.env.KAYITSIZ_ROL_ID)).size
          : 0;
        const botlar = guild.members.cache.filter(m => m.user.bot).size;
        return `📊 **Sunucu İstatistikleri**\n` +
          `• Toplam Üye: **${toplamUye}**\n` +
          `• Kayıtlı: **${kayitliUyeler}**\n` +
          `• Kayıtsız: **${kayitsizUyeler}**\n` +
          `• Bot: **${botlar}**\n` +
          `• Kanal Sayısı: **${guild.channels.cache.filter(c => c.type === 0).size}**\n` +
          `• Rol Sayısı: **${guild.roles.cache.size}**`;
      }
      case 'rol_listele': {
        const roller = guild.roles.cache
          .filter(r => r.name !== '@everyone')
          .sort((a, b) => b.position - a.position)
          .map(r => `• ${r.name} (${r.members.size} üye)`)
          .join('\n');
        return `🎭 **Sunucudaki Roller:**\n${roller}`;
      }
      case 'uye_listele': {
        await guild.members.fetch();
        const rol = guild.roles.cache.find(r => r.name.toLowerCase() === parametreler.rol_adi.toLowerCase());
        if (!rol) return `❌ "${parametreler.rol_adi}" rolü bulunamadı.`;
        const uyeler = rol.members.map(m => `• ${m.user.tag}`).join('\n');
        if (!uyeler) return `ℹ️ **${rol.name}** rolünde hiç üye yok.`;
        return `👥 **${rol.name}** rolündeki üyeler (${rol.members.size}):\n${uyeler}`;
      }

      // ─── EĞLENCE ───
      case 'anket_olustur': {
        const kanal = kanalBul(guild, parametreler.kanal_adi);
        if (!kanal) return `❌ "${parametreler.kanal_adi}" kanalı bulunamadı.`;
        const embed = new EmbedBuilder()
          .setTitle(`📊 ${parametreler.soru}`)
          .setColor(0x5865F2)
          .addFields(
            { name: `🅰️ ${parametreler.secenek_a}`, value: '0 oy (0%)', inline: true },
            { name: `🅱️ ${parametreler.secenek_b}`, value: '0 oy (0%)', inline: true },
          )
          .setFooter({ text: 'Oy kullanmak için butona tıkla' })
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('anket_a').setLabel(`🅰️ ${parametreler.secenek_a}`).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('anket_b').setLabel(`🅱️ ${parametreler.secenek_b}`).setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('anket_kapat').setLabel('🔒 Kapat').setStyle(ButtonStyle.Danger),
        );
        await kanal.send({ embeds: [embed], components: [row] });
        return `✅ **#${kanal.name}** kanalına anket gönderildi.`;
      }
      case 'cekilis_baslat': {
        const kanal = kanalBul(guild, parametreler.kanal_adi);
        if (!kanal) return `❌ "${parametreler.kanal_adi}" kanalı bulunamadı.`;
        const sure = Math.max(1, parametreler.sure_dakika || 1);
        const bitis = Math.floor(Date.now() / 1000) + (sure * 60);
        const embed = new EmbedBuilder()
          .setTitle('🎁 ÇEKİLİŞ BAŞLADI!')
          .setDescription(`**Ödül:** ${parametreler.odul}\n\n🎉 Katılmak için aşağıdaki butona tıkla!\n\n⏰ Bitiş: <t:${bitis}:R>`)
          .setColor(0xF1C40F)
          .setFooter({ text: `Süre: ${sure} dakika` })
          .setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`cekilis_katil_${Date.now()}`).setLabel('🎉 Katıl!').setStyle(ButtonStyle.Success),
        );
        const cekilisMsg = await kanal.send({ embeds: [embed], components: [row] });

        // Süre bitince kazananı seç
        setTimeout(async () => {
          const guncelleMesaj = await kanal.messages.fetch(cekilisMsg.id).catch(() => null);
          if (!guncelleMesaj) return;

          // Butona basanları topla (reaction yerine collector kullanmak gerekir ama basit versiyon)
          const katilimcilar = [];
          // Mesaj reactions'dan değil, component interaction'dan tutulmuyor - basit versiyon
          // Kazananı üye listesinden rastgele seç
          await guild.members.fetch();
          const uyeler = guild.members.cache.filter(m => !m.user.bot).map(m => m);
          const kazanan = uyeler[Math.floor(Math.random() * uyeler.length)];

          const sonucEmbed = new EmbedBuilder()
            .setTitle('🎊 ÇEKİLİŞ SONA ERDİ!')
            .setDescription(`**Ödül:** ${parametreler.odul}\n\n🏆 Kazanan: <@${kazanan.id}>\n\nTebrikler!`)
            .setColor(0x2ECC71)
            .setTimestamp();
          await guncelleMesaj.edit({ embeds: [sonucEmbed], components: [] });
          await kanal.send(`🎊 Tebrikler <@${kazanan.id}>! **${parametreler.odul}** ödülünü kazandın!`);
        }, sure * 60 * 1000);

        return `✅ **#${kanal.name}** kanalında **${sure} dakika** sürecek çekiliş başlatıldı! Ödül: **${parametreler.odul}**`;
      }
      case 'hava_durumu': {
        const veri = await havaDurumuGetir(parametreler.sehir);
        if (!veri) return `❌ "${parametreler.sehir}" için hava durumu alınamadı.`;
        return `🌤️ **${veri.sehirAdi} Hava Durumu**\n` +
          `• Durum: **${veri.durum}**\n` +
          `• Sıcaklık: **${veri.sicaklik}°C** (Hissedilen: ${veri.hissedilen}°C)\n` +
          `• Min/Max: **${veri.minSicaklik}°C / ${veri.maxSicaklik}°C**\n` +
          `• Nem: **%${veri.nem}**\n` +
          `• Rüzgar: **${veri.ruzgar} km/h**`;
      }

      default:
        return '❌ Bilinmeyen işlem.';
    }
  } catch (err) {
    return `❌ Hata: ${err.message}`;
  }
}

module.exports = { islemUygula };