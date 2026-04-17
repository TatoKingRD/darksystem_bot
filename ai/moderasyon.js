// ai/moderasyon.js
// Bota kufur/supheli mesaj algılama, uyari sayaci, kara liste, DM bildirim ve log kaydi.

const { EmbedBuilder } = require('discord.js');
const { groqSor } = require('./groqApi');

// ─── KELIME LISTELERI ───
// Acik kufur/hakaret (anlik algilama icin)
const KESIN_KUFURLER = [
  // Ağır küfürler (yaygın olanların kökleri)
  'amk', 'aq', 'amq', 'amına', 'amina', 'orospu', 'oç', 'piç', 'pic',
  'sikerim', 'sikim', 'sikiş', 'sikis', 'sikeyim', 'siktir', 'siktirgit',
  'yarrak', 'yarak', 'göt', 'got ', 'göt ', 'gotveren', 'götveren',
  'ibne', 'puşt', 'pust', 'serefsiz', 'şerefsiz', 'itoğlu', 'itoglu',
  'salak', 'gerizekalı', 'gerizekali', 'mal ', 'aptal', 'embesil',
  'dangalak', 'andaval', 'kaltak', 'sürtük', 'surtuk', 'fahişe', 'fahise',
  'bok ', 'sıçtın', 'sictin', 'anan', 'ananı', 'anani', 'avrat',
  'babanı', 'babani',
];

// Supheli ifadeler (AI'ye danısılacak kategori)
const SUPHELI_KELIMELER = [
  'salak', 'aptal', 'sus ', 'kapa çeneni', 'kapa ceneni',
  'boş konuş', 'sen ne', 'saçmalama', 'sacmalama',
  'ne diyon', 'kapat', 'hadi lan', 'lan ',
];

// ─── KARA LISTE KONTROL ───
function karaListeKontrol(kullaniciId, kullaniciVerisi) {
  const veri = kullaniciVerisi.get(kullaniciId);
  if (!veri) return { karaListede: false, uyariSayisi: 0 };
  return {
    karaListede: (veri.uyariSayisi || 0) >= 3,
    uyariSayisi: veri.uyariSayisi || 0,
  };
}

// ─── MESAJ ANALIZI ───
// Hızlı kelime kontrolü - kesin küfür mü?
function kesinKufurMu(mesaj) {
  const lower = ' ' + mesaj.toLowerCase() + ' ';
  return KESIN_KUFURLER.some(k => lower.includes(' ' + k) || lower.includes(k + ' '));
}

// Şüpheli ifade var mı?
function supheliMi(mesaj) {
  const lower = mesaj.toLowerCase();
  return SUPHELI_KELIMELER.some(k => lower.includes(k));
}

// AI'ye danış - gerçekten saldırgan mı yoksa normal sohbet mi?
// Küçük/hızlı bir model yeterli, sadece evet/hayır cevabı istiyoruz
async function aiSaldirganliKontrol(mesaj) {
  const cevap = await groqSor([
    {
      role: 'system',
      content: 'Sen bir içerik moderatörüsün. Kullanıcının mesajı bir Discord botuna yazılmıştır. Mesaj bota yönelik HAKARET, KÜFÜR, AŞAĞILAMA veya kötü niyetli saldırı mı içeriyor? Sadece "EVET" veya "HAYIR" cevabı ver, başka hiçbir şey yazma. Samimi şakalar, esprili takılmalar, "lan", "ya", "dostum" gibi günlük ifadeler HAYIR kategorisinde.',
    },
    { role: 'user', content: mesaj },
  ]);

  const icerik = cevap?.choices?.[0]?.message?.content?.trim()?.toUpperCase() || '';
  return icerik.startsWith('EVET');
}

// ─── ANA ANALIZ FONKSIYONU ───
// Dönüş: { durum: 'temiz' | 'supheli' | 'kufur', sebep: '...' }
async function mesajiAnalizEt(mesaj) {
  if (kesinKufurMu(mesaj)) {
    return { durum: 'kufur', sebep: 'Küfür/hakaret tespit edildi' };
  }
  if (supheliMi(mesaj)) {
    // AI'ye danış
    const saldirgan = await aiSaldirganliKontrol(mesaj);
    if (saldirgan) {
      return { durum: 'kufur', sebep: 'Şüpheli mesaj AI tarafından saldırgan olarak işaretlendi' };
    }
    return { durum: 'supheli', sebep: 'Şüpheli ifade ama agresif değil' };
  }
  return { durum: 'temiz', sebep: null };
}

// ─── VERI KAYDI - Log kanalina mesaj olarak ───
async function kullaniciVerisiniYukle(client) {
  const kanalId = process.env.MOD_LOG_KANAL_ID;
  const kullaniciVerisi = new Map();
  if (!kanalId) {
    console.warn('[moderasyon] MOD_LOG_KANAL_ID tanimli degil, uyarilar restart\'ta sifirlanacak.');
    return kullaniciVerisi;
  }
  try {
    const kanal = await client.channels.fetch(kanalId).catch(() => null);
    if (!kanal) return kullaniciVerisi;

    // Son 100 mesajı tara, her kullanıcı için en son durum
    const mesajlar = await kanal.messages.fetch({ limit: 100 }).catch(() => null);
    if (!mesajlar) return kullaniciVerisi;

    const sirali = [...mesajlar.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    for (const msg of sirali) {
      if (msg.author.id !== client.user.id) continue;
      const embed = msg.embeds[0];
      if (!embed) continue;

      // Kullanıcı ID footer'da
      const footer = embed.footer?.text || '';
      const match = footer.match(/Kullanici ID: (\d+)/);
      if (!match) continue;
      const kullaniciId = match[1];

      // Bant açma mesajı mı?
      if (embed.title?.includes('Bant Açıldı') || embed.title?.includes('Kara Liste Temizlendi')) {
        kullaniciVerisi.delete(kullaniciId);
        continue;
      }

      // Uyarı mesajı mı?
      if (embed.title?.includes('Uyarı') || embed.title?.includes('Kara Liste')) {
        const mevcut = kullaniciVerisi.get(kullaniciId) || { uyariSayisi: 0 };
        mevcut.uyariSayisi = (mevcut.uyariSayisi || 0) + 1;
        kullaniciVerisi.set(kullaniciId, mevcut);
      }
    }
  } catch (e) {
    console.error('[moderasyon] Veri yukleme hatasi:', e.message);
  }
  return kullaniciVerisi;
}

async function logKanalinaYaz(client, embed) {
  const kanalId = process.env.MOD_LOG_KANAL_ID;
  if (!kanalId) return;
  try {
    const kanal = await client.channels.fetch(kanalId).catch(() => null);
    if (kanal) await kanal.send({ embeds: [embed] }).catch(() => {});
  } catch {}
}

// ─── SAHIBE DM ───
async function sahibeDmAt(client, embed) {
  const sahipId = process.env.AI_SAHIP_ID || '799564777839788033';
  try {
    const sahip = await client.users.fetch(sahipId).catch(() => null);
    if (sahip) await sahip.send({ embeds: [embed] }).catch(() => {});
  } catch {}
}

// ─── UYARI VER ───
async function uyariVer(client, kullanici, guild, mesaj, sebep, kullaniciVerisi) {
  const mevcut = kullaniciVerisi.get(kullanici.id) || { uyariSayisi: 0 };
  mevcut.uyariSayisi = (mevcut.uyariSayisi || 0) + 1;
  kullaniciVerisi.set(kullanici.id, mevcut);

  const karaListede = mevcut.uyariSayisi >= 3;

  // Sahibe DM
  const dmEmbed = new EmbedBuilder()
    .setTitle(karaListede ? '🚨 Kara Liste!' : `⚠️ Bota Küfür/Hakaret (${mevcut.uyariSayisi}. Uyarı)`)
    .setColor(karaListede ? 0xFF0000 : 0xFFA500)
    .setDescription(
      `**Kullanıcı:** <@${kullanici.id}> (${kullanici.tag})\n` +
      `**Sunucu:** ${guild?.name || '?'}\n` +
      `**Kanal:** ${mesaj.channel?.name ? `#${mesaj.channel.name}` : '?'}\n\n` +
      `**Mesaj:**\n\`\`\`${(mesaj.content || '').substring(0, 500)}\`\`\`\n` +
      `**Sebep:** ${sebep}\n` +
      (karaListede
        ? '\n🔴 Bu kullanıcı **kara listeye eklendi**, bot artık ona cevap vermeyecek.\nBanı açmak için: `@DARKSYSTEM BOT <@kullanici> banını kaldır`'
        : `\nBu ${mevcut.uyariSayisi}. uyarısı. 3. uyarıda kara listeye eklenecek.`)
    )
    .setFooter({ text: `Kullanici ID: ${kullanici.id}` })
    .setTimestamp();
  await sahibeDmAt(client, dmEmbed);

  // Log kanalı
  const logEmbed = new EmbedBuilder()
    .setTitle(karaListede ? '🚨 Kara Liste' : `⚠️ Bot Uyarı (${mevcut.uyariSayisi}/3)`)
    .setColor(karaListede ? 0xFF0000 : 0xFFA500)
    .addFields(
      { name: '👤 Kullanıcı', value: `<@${kullanici.id}> (${kullanici.tag})`, inline: false },
      { name: '📋 Mesaj', value: (mesaj.content || '').substring(0, 1000) || '(boş)', inline: false },
      { name: '🔍 Sebep', value: sebep, inline: true },
      { name: '⚠️ Uyarı', value: `${mevcut.uyariSayisi}/3`, inline: true },
    )
    .setFooter({ text: `Kullanici ID: ${kullanici.id}` })
    .setTimestamp();
  await logKanalinaYaz(client, logEmbed);

  return { karaListede, uyariSayisi: mevcut.uyariSayisi };
}

// ─── SUPHELI BILDIRIM (uyari vermeden, sadece DM) ───
async function supheliBildir(client, kullanici, guild, mesaj, sebep) {
  const dmEmbed = new EmbedBuilder()
    .setTitle('🔎 Şüpheli Mesaj')
    .setColor(0x3498DB)
    .setDescription(
      `**Kullanıcı:** <@${kullanici.id}> (${kullanici.tag})\n` +
      `**Sunucu:** ${guild?.name || '?'}\n` +
      `**Kanal:** ${mesaj.channel?.name ? `#${mesaj.channel.name}` : '?'}\n\n` +
      `**Mesaj:**\n\`\`\`${(mesaj.content || '').substring(0, 500)}\`\`\`\n` +
      `**Not:** ${sebep}\n\n_Uyarı verilmedi, sadece bilgilendirme._`
    )
    .setFooter({ text: `Kullanici ID: ${kullanici.id}` })
    .setTimestamp();
  await sahibeDmAt(client, dmEmbed);
}

// ─── BANT AC ───
async function bantAc(client, kullaniciId, kullaniciVerisi) {
  kullaniciVerisi.delete(kullaniciId);

  const logEmbed = new EmbedBuilder()
    .setTitle('✅ Bant Açıldı')
    .setColor(0x57F287)
    .setDescription(`<@${kullaniciId}> kullanıcısının kara listesi temizlendi, bot tekrar cevap verebilir.`)
    .setFooter({ text: `Kullanici ID: ${kullaniciId}` })
    .setTimestamp();
  await logKanalinaYaz(client, logEmbed);

  return true;
}

module.exports = {
  mesajiAnalizEt,
  karaListeKontrol,
  uyariVer,
  supheliBildir,
  bantAc,
  kullaniciVerisiniYukle,
};
