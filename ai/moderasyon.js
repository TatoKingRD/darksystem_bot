// ai/moderasyon.js
// Bota kufur/supheli mesaj algılama, uyari sayaci, kara liste, DM bildirim ve log kaydi.

const { EmbedBuilder } = require('discord.js');
const { groqSor } = require('./groqApi');

// ─── KELIME LISTELERI ───
// Kokler - TAM KELIME olarak eslesir, icerdigi kelimelerde yakalanmaz.
// Yani "anasi" kökünü koysak bile "nasılsın" içinde yakalanmayacak (kelime sınırı kontrolü var).
// Ayrıca cok kisa kokleri (1-2 harf) buraya koyma - regex'te ayrıca var.
const KUFUR_KOKLERI = [
  // ─── Agir kufur - tam kelime ─── (regex'te cok spesifik olmayan versiyonlari buraya)
  'amk', 'aq', 'amq', 'amg', 'awq', 'amcik', 'amcık',
  'orospu', 'orosbu', 'orosbı', 'oruspu',
  'piç', 'pic', 'pich',
  'yarrak', 'yarak',
  'ibne', 'iibne',
  'puşt', 'pust', 'pusht',
  'şerefsiz', 'serefsiz',
  'kaltak', 'sürtük', 'surtuk',
  'fahişe', 'fahise',
  'gavat', 'kavat', 'kahpe',
  'gerizekalı', 'gerizekali', 'gerizekâlı',
  'dangalak', 'andaval', 'embesil',
  'pezevenk', 'pezo',
  // ─── Cekimli yaygin formlar ───
  'siktir', 'siktirgit', 'sikeyim', 'sikerim', 'sikim', 'siktim',
  'sikiyim', 'sikiyom', 'sikiyorum', 'sikicem',
  'amına', 'amina', 'amıina', 'amina koyim', 'amina koyum',
  'götveren', 'gotveren', 'götoş', 'götoş',
  // ─── Kisa varyantlar ───
  'oç', 'oçç',
  'mk', 'sg', 'sktr',
];

// Supheli ifadeler (AI'ye danısılacak kategori) - kendi basina kufur sayilmaz
const SUPHELI_KELIMELER = [
  'sus ', 'sus,', 'sus.', 'sus!', 'kapa çeneni', 'kapa ceneni',
  'saçmalama', 'sacmalama', 'sacma konusma', 'saçma konuşma',
  'ne diyon', 'ne diyosun', 'ne dedin lan', 'kapat lan',
  'ezik', 'eziksin', 'beceriksiz', 'işe yaramaz',
  'siktir git', 'hadi oradan', 'defol',
  'dalga mı', 'komik misin', 'gıcık', 'gicik',
  'salak', 'aptal', 'mal ',
];

// ─── METNI NORMALIZE ET ───
// Leetspeak, ozel karakterler, bosluklari temizler
function metniNormalize(metin) {
  return (metin || '')
    .toLowerCase()
    // Leetspeak
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    // Turkce karakter duzeltme - ASCII'ye
    .replace(/ı/g, 'i').replace(/İ/g, 'i')
    .replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o')
    .replace(/ç/g, 'c').replace(/Ç/g, 'c')
    // Tekrarli harfleri tek harfe dusur (sikktiirr → siktir, mkkk → mk)
    .replace(/(.)\1{2,}/g, '$1$1')
    // Ozel karakterleri bosluga cevir (*, _, -, ., vb.)
    .replace(/[^a-z0-9\s]/g, ' ')
    // Coklu bosluklari teke indir
    .replace(/\s+/g, ' ')
    .trim();
}

// Bosluklu yazim yakalama: "s i k t i r" → "siktir"
function boslukluKontrol(metin) {
  const tek = metin.replace(/\s+/g, '');
  return tek;
}

// ─── REGEX DESENLERI ───
// Varyasyonlari yakalayan ama yanlis pozitif vermeyen spesifik kaliplar
// ONEMLI: Kelime siniri (\b) ile baslar ve TAM biten kaliplar kullanir
const REGEX_DESENLERI = [
  // amk, aq, amq, amg, awq varyasyonları - kelime olarak
  /\b(?:a+m+[kqgc]+|a+[wq]+|a+m+q+)\b/i,
  // am.k, a.m.k vs. (nokta/boşluk arasi)
  /\ba[\s.*_-]+m[\s.*_-]+[kqg]\b/i,
  // amcık, amına varyasyonları
  /\ba+m+[cç](?:i|ı|ik|ık)/i,
  /\ba+m+(?:i|ı)n(?:a|â)/i,
  // sik + gerçek çekimler: siktir, sikim, sikeyim, siktim, sikerim, sikiyor vb.
  // Cekim sonuna "in", "i", "nin" gibi iyelik ekleri de gelebilir
  /\bs+i+k+(?:ti|tir|tim|tin|im|eyim|erim|iyor|ecek|ti[gğ]im|ti[gğ]i|ti[gğ]in|icek|en|tinin|ici)\w*/i,
  /\bs+o+k+(?:ar[ıi]m|ay[ıi]m|em|im)\b/i,  // sokarım, sokayım
  // orospu varyasyonları
  /\bo+r+o+s+[pb]+u+/i,
  // göt, gotveren
  /\bg[oö]+t(?:[\s]|lek|veren|os|un|une|üm)/i,
  // piç, pic (tek başına veya "piçi", "piçini" gibi)
  /\bpi+ç+\b/i, /\bpi+c+\b/i,
  // yarrak, yarak
  /\by+a+r+r?a+k+\b/i,
  // anan, ananı, babanı vb. - "sen"den sonra veya başlangıçta
  /\b(?:ana|baba|baci|bacı|kari|karı|avrat)n(?:i|ı|in|ın|izi|ızı|ız|izin|ızın|a|e)\b/i,
  // ibne, puşt, kaltak vb.
  /\b(?:ibne|pu[şs][th]|serefsiz|şerefsiz|kahpe|kaltak|s[uü]rt[uü]k|fahi[şs]e|pezevenk|pezo)\b/i,
  // kısaltmalar: mk, sg, sktr, aw (kelime olarak)
  /\b(?:mk|sg|sktr|skrm|sktm)\b/i,
];

// ─── KESIN KUFUR TESPITI ───
function kesinKufurMu(mesaj) {
  const orijinal = (mesaj || '').toLowerCase();
  const normalize = metniNormalize(mesaj);
  const bosluksuz = boslukluKontrol(normalize);

  // 1) Kok listesi kontrolu
  // Tum koklere: kelime siniri gerekli. "nasılsın" icinde "anasi" bulunmasin diye.
  const metinlerKontrolEdilecek = [
    { metin: normalize, etiket: 'normalize' },
    { metin: orijinal, etiket: 'orijinal' },
  ];

  for (const { metin } of metinlerKontrolEdilecek) {
    for (const kok of KUFUR_KOKLERI) {
      const k = kok.toLowerCase().trim();
      if (!k) continue;
      // Kelime siniri: \b kullanarak sadece gercek kelimelerde yakala
      // "anasi" = kelime olarak gecmeli, "nasilsin" icinde olmamali
      const temizKok = k.replace(/[^a-z0-9]/g, ''); // regex icin guvenli
      if (temizKok.length < 2) continue;
      const re = new RegExp('(?:^|[^a-z0-9])' + temizKok + '(?:[^a-z0-9]|$)', 'i');
      if (re.test(metin)) {
        return { yakalandi: true, sebep: `Küfür kökü: "${k}"` };
      }
    }
  }

  // 2) Bosluksuz metinde sadece UZUN koklere bak (en az 4 harf)
  // Boylece "s i k t i r" yakalanir, "as i a" gibi sey yakalanmaz
  for (const kok of KUFUR_KOKLERI) {
    const k = kok.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (k.length < 4) continue;
    if (bosluksuz.includes(k)) {
      return { yakalandi: true, sebep: `Küfür kökü (boşluklu): "${k}"` };
    }
  }

  // 3) Regex desenleri (normalize edilmis metinde)
  for (const regex of REGEX_DESENLERI) {
    if (regex.test(normalize)) {
      return { yakalandi: true, sebep: `Küfür deseni eşleşti` };
    }
  }

  return { yakalandi: false, sebep: null };
}

// Supheli ifade var mi?
function supheliMi(mesaj) {
  const normalize = metniNormalize(mesaj);
  return SUPHELI_KELIMELER.some(k => normalize.includes(k.toLowerCase().trim()));
}

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
  const kesinSonuc = kesinKufurMu(mesaj);
  if (kesinSonuc.yakalandi) {
    return { durum: 'kufur', sebep: kesinSonuc.sebep };
  }
  if (supheliMi(mesaj)) {
    // AI'ye danış
    const saldirgan = await aiSaldirganliKontrol(mesaj);
    if (saldirgan) {
      return { durum: 'kufur', sebep: 'Şüpheli mesaj AI tarafından saldırgan olarak işaretlendi' };
    }
    return { durum: 'supheli', sebep: 'Şüpheli ifade ama agresif değil' };
  }
  // Kelime listesinde yakalanmadı ama bir son kontrol: hakaret/agresiflik kontrolü
  // Sadece mesaj yeterince uzunsa ve bot'a yazıldıysa (bu kontrol aiAsistan'da zaten var)
  // Burada ekstra AI çağrısı yapmıyoruz - performans için. Sadece kelime tabanlı algılama yeterli.
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
  const sahipIdler = (process.env.AI_SAHIP_ID || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  for (const sahipId of sahipIdler) {
    try {
      const sahip = await client.users.fetch(sahipId).catch(() => null);
      if (sahip) await sahip.send({ embeds: [embed] }).catch(() => {});
    } catch {}
  }
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
