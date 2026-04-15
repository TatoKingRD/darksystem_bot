// ai/islemUygula.js

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

async function islemUygula(islemAdi, parametreler, guild) {
  try {
    switch (islemAdi) {
      case 'kanal_adi_degistir': {
        const kanal = guild.channels.cache.find(c => c.name.toLowerCase() === parametreler.kanal_adi.toLowerCase());
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
        const kanal = guild.channels.cache.find(c => c.name.toLowerCase() === parametreler.kanal_adi.toLowerCase());
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
        const kanal = guild.channels.cache.find(c =>
          c.name.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\-]/gi, '') === parametreler.kanal_adi.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\-]/gi, '') ||
          c.name.toLowerCase() === parametreler.kanal_adi.toLowerCase()
        );
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
        let tasinan = 0;
        let kategoriOlusturulan = 0;
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
      default:
        return '❌ Bilinmeyen işlem.';
    }
  } catch (err) {
    return `❌ Hata: ${err.message}`;
  }
}

module.exports = { islemUygula };
