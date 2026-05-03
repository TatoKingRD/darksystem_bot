// handlers/aiAsistan.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { groqSor } = require('../ai/groqApi');
const { ARACLAR, ONAYSIZ, araclariHazirla } = require('../ai/tools');
const { islemUygula } = require('../ai/islemUygula');
const { gecmisiGetir, gecmisiGuncelle, gecmisiKanalaKaydet } = require('../ai/gecmis');
const SISTEM_MESAJI = require('../ai/sistemMesaji');
const moderasyon = require('../ai/moderasyon');

// Araçları (manuel tool'lar + dinamik slash komutlar) bir kere hazırla
const ARACLAR_TUM = (typeof araclariHazirla === 'function') ? araclariHazirla() : ARACLAR;

// Onay bekleyen işlemler (interactionHandler ile paylaşılır)
const bekleyenIslemler = new Map();

// Bot-moderasyon: kullanici bazli uyari/kara liste verisi (log kanalindan yuklenecek)
let kullaniciVerisi = new Map();
let verisiYuklendiMi = false;

async function verisiYukleBirKere(client) {
  if (verisiYuklendiMi) return;
  verisiYuklendiMi = true;
  kullaniciVerisi = await moderasyon.kullaniciVerisiniYukle(client);
  console.log(`[moderasyon] ${kullaniciVerisi.size} kullanici verisi yuklendi.`);
}

module.exports = async function aiAsistan(message, client) {
  if (message.author.bot) return;

  // Ilk cagri'da veriyi yukle
  await verisiYukleBirKere(client);

  const botMention = `<@${client.user.id}>`;
  const botMentionNick = `<@!${client.user.id}>`;

  // Kullanıcı bota reply atmış mı? (etiketleme şart değil)
  let botaReply = false;
  let yanitlananMesajId = null;
  if (message.reference?.messageId) {
    yanitlananMesajId = message.reference.messageId;
    try {
      const refMesaj = await message.channel.messages.fetch(message.reference.messageId);
      if (refMesaj?.author?.id === client.user.id) botaReply = true;
    } catch {}
  }

  const etiketliMi = message.content.includes(botMention) || message.content.includes(botMentionNick);
  if (!etiketliMi && !botaReply) return;

  const soru = message.content.replace(botMention, '').replace(botMentionNick, '').trim();
  if (!soru) return message.reply('Merhaba! 👋 Nasıl yardımcı olabilirim?');

  const sahipIdler = (process.env.OWNER_IDS || process.env.AI_SAHIP_ID || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const islemYetkisi = sahipIdler.includes(message.author.id);
  if (sahipIdler.length === 0) {
    console.warn('[aiAsistan] AI_SAHIP_ID env variable tanimli degil! Hic kimse yonetici yetkisine sahip olmayacak.');
  }

  // ─── BANT ACMA (sadece sahibi yapabilir) ───
  // Esnek yakalama: Etiketli kullanici + [ban/kara/uyari/liste/bant] + [kaldir/ac/temizle/sil]
  if (islemYetkisi) {
    const mentionMatch = message.content.match(/<@!?(\d+)>/g) || [];
    const hedefId = mentionMatch
      .map(m => m.replace(/[<@!>]/g, ''))
      .find(id => id !== client.user.id);

    if (hedefId) {
      const soruNorm = soru.toLowerCase();
      // Konu kelimesi: kara, liste/luste, ban/bant (ve tureevleri uyari/uyar)
      const konuVar = /(kara|liste|luste|\bban\w*|\bbant\w*|\buyar\w*|moderasyon|engel|beyaz)/i.test(soruNorm);
      // Fiil: kald, temizle/sil/ac/aç/sifirla/kapat, cikar, al (al yerine "ekle" de uygun)
      const fiilVar = /(kald[ıi]r|temizle|temize|\bsil\b|\bsil\w*|(^|\s)a[çc]($|[\s.,!?])|sifirla|s[ıi]f[ıi]rla|kapat|[çc][ıi]kar|affet|\bal\b|ekle)/i.test(soruNorm);

      if (konuVar && fiilVar) {
        await moderasyon.bantAc(client, hedefId, kullaniciVerisi);
        try { await message.react('✅'); } catch {}
        return message.reply(`✅ <@${hedefId}> kullanıcısının kara listesi temizlendi, artık cevap verebilirim.`);
      }
    }
  }

  // ─── KARA LISTE KONTROL ───
  // Sahibi hariç kara listedeki kullanicilara cevap verme
  if (!islemYetkisi) {
    const { karaListede, uyariSayisi } = moderasyon.karaListeKontrol(message.author.id, kullaniciVerisi);
    if (karaListede) {
      // Hiç cevap verme, sessizce yok say
      return;
    }
  }

  // ─── KUFUR/SUPHELI KONTROL ───
  // Sahip kendi botuna ne derse desin, kontrol etme
  if (!islemYetkisi) {
    const analiz = await moderasyon.mesajiAnalizEt(soru).catch((e) => {
      console.error('[moderasyon] Analiz hatasi:', e.message);
      return { durum: 'temiz' };
    });
    console.log(`[moderasyon] ${message.author.tag}: "${soru.substring(0, 80)}" → ${analiz.durum}${analiz.sebep ? ' (' + analiz.sebep + ')' : ''}`);

    if (analiz.durum === 'kufur') {
      const { karaListede, uyariSayisi } = await moderasyon.uyariVer(
        client, message.author, message.guild, message, analiz.sebep, kullaniciVerisi
      );

      if (karaListede) {
        try { await message.react('🚨'); } catch {}
        return message.reply(
          `🚨 <@${message.author.id}>, 3 uyarı biriktirdin ve kara listeye eklendin. ` +
          `Artık sana cevap vermeyeceğim. Banın açılması için sunucu sahibini bekle.`
        );
      } else {
        try { await message.react('⚠️'); } catch {}
        return message.reply(
          `⚠️ <@${message.author.id}>, bana karşı saygılı olmanı rica ederim. ` +
          `Bu **${uyariSayisi}. uyarın**. 3'e ulaşırsan seninle konuşmayı keserim. ` +
          `Sebep: _${analiz.sebep}_`
        );
      }
    } else if (analiz.durum === 'supheli') {
      // Sessiz DM, kullaniciya normal cevap verilir
      moderasyon.supheliBildir(client, message.author, message.guild, message, analiz.sebep).catch(() => {});
    }
  }

  await message.channel.sendTyping();

  const gecmis = await gecmisiGetir(client, message.author.id);

  // Alysa modu acik mi kontrol et (opsiyonel modul)
  let alysaAcik = false;
  let alysaKisilikMod = null;
  try {
    alysaKisilikMod = require('../ai/alysaKisilik');
    alysaAcik = await alysaKisilikMod.modAcikMi(client, message.author.id).catch(() => false);
  } catch {
    // Modul yok, normal kisilik kullan
  }

  let sistemIcerik;
  if (alysaAcik && alysaKisilikMod) {
    sistemIcerik = alysaKisilikMod.ALYSA_SISTEM_MESAJI + `\n\nCURRENT_CHANNEL: ${message.channel.name}`;
  } else {
    sistemIcerik = SISTEM_MESAJI + `\n\nMEVCUT_KANAL: ${message.channel.name}`;
  }

  if (yanitlananMesajId) {
    sistemIcerik += `\nYANITLANAN_MESAJ_ID: ${yanitlananMesajId} (kullanıcı bir mesaja reply atmış; mesaj_id gereken komutlarda bu ID'yi kullanabilirsin)`;
  }

  // ─── ANTI-TEKRAR: Son verilen cevabi sisteme bildir ───
  // Son asistan cevabini al
  const sonAsistanMesaji = [...gecmis].reverse().find(m => m.role === 'assistant');
  if (sonAsistanMesaji?.content) {
    sistemIcerik += `\n\nSON_CEVABIN: "${sonAsistanMesaji.content.substring(0, 300)}"\n` +
      `KURAL: Yeni cevabın bu SON_CEVABIN ile neredeyse aynı olmamalı. Farklı kelimeler, farklı bir açı, farklı bir ton kullan. ` +
      `Eğer aynı soru tekrar sorulduysa bunu da belirt ("yine mi?" gibi) ve farklı cevap üret.`;
  }

  // Benzer sorular tekrar soruluyorsa geçmişteki o soruyu bulup AI'ye hatırlat
  const sonKullaniciSorulari = gecmis.filter(m => m.role === 'user').slice(-3);
  const buSoruDahaOnceSoruldu = sonKullaniciSorulari.some(m =>
    m.content && m.content.trim().toLowerCase() === soru.trim().toLowerCase()
  );
  if (buSoruDahaOnceSoruldu) {
    sistemIcerik += `\n\nUYARI: Kullanıcı AYNI soruyu tekrar soruyor. Önceki cevabını tekrar etme, farklı bir yaklaşımla veya mizahi bir şekilde yanıtla.`;
  }

  const mesajlar = [
    {
      role: 'system',
      content: sistemIcerik,
    },
    ...gecmis,
    { role: 'user', content: soru },
  ];

  const sonuc = await groqSor(mesajlar, ARACLAR_TUM);
  if (!sonuc) return message.reply('❌ Bağlantı hatası.');

  const secim = sonuc.choices?.[0];
  if (!secim) return message.reply('❌ Cevap alınamadı.');

  // ─── TOOL CALL ───
  if (secim.finish_reason === 'tool_calls' && secim.message?.tool_calls?.length > 0) {
    const toolCall = secim.message.tool_calls[0];
    const islemAdi = toolCall.function.name;
    let parametreler = {};
    try { parametreler = JSON.parse(toolCall.function.arguments); } catch {}

    if (!islemYetkisi) {
      return message.reply('❌ Sunucu işlemlerini sadece sunucu sahibi yaptırabilir.');
    }

    // Onaysız işlemler direkt uygula
    if (ONAYSIZ.includes(islemAdi)) {
      message.client?.darkRepositories?.audit?.add('ai_tool_executed_without_button', {
        guildId: message.guild?.id,
        actorId: message.author.id,
        targetId: islemAdi,
        details: { parametreler },
      });
      const sonucMesaj = await islemUygula(islemAdi, parametreler, message.guild, message);
      // Geçmişe ekle
      gecmis.push({ role: 'user', content: soru });
      gecmis.push({ role: 'assistant', content: sonucMesaj });
      gecmisiGuncelle(message.author.id, gecmis);
      gecmisiKanalaKaydet(client, message.author.id, gecmis).catch(() => {});
      return sonucGonder(message, sonucMesaj);
    }

    // Onay butonu
    const aciklama = Object.entries(parametreler).map(([k, v]) => `**${k}:** ${v}`).join('\n');
    const embed = new EmbedBuilder()
      .setTitle('🤔 İşlem Onayı')
      .setColor(0xF39C12)
      .setDescription(`**${islemAdi.replace(/_/g, ' ').toUpperCase()}**\n\n${aciklama}`)
      .setFooter({ text: 'Onaylıyor musun?' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ai_onayla').setLabel('✅ Onayla').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ai_degistir').setLabel('✏️ Değiştir').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ai_reddet').setLabel('❌ Reddet').setStyle(ButtonStyle.Danger),
    );

    const onayMesaj = await message.reply({ embeds: [embed], components: [row] });
    bekleyenIslemler.set(onayMesaj.id, {
      islemAdi,
      parametreler,
      guild: message.guild,
      channel: message.channel,
      authorId: message.author.id,
      soru, // geçmişe eklemek için saklıyoruz
    });
    setTimeout(() => {
      bekleyenIslemler.delete(onayMesaj.id);
      onayMesaj.edit({ components: [] }).catch(() => {});
    }, 60000);

    return;
  }

  // ─── NORMAL CEVAP ───
  const cevap = secim.message?.content || '❌ Cevap alınamadı.';

  // Modelin function tag'i düz metin olarak sızdırması (fallback)
  const funcMatches = [...cevap.matchAll(/<function=(\w+)>(.*?)<\/function>/gs)];
  if (funcMatches.length > 0) {
    if (!islemYetkisi) return message.reply('❌ Sunucu işlemlerini sadece sunucu sahibi yaptırabilir.');
    for (const match of funcMatches) {
      const islemAdi = match[1];
      let parametreler = {};
      try { parametreler = JSON.parse(match[2] || '{}'); } catch {}
      if (ONAYSIZ.includes(islemAdi)) {
        message.client?.darkRepositories?.audit?.add('ai_tool_executed_without_button', {
          guildId: message.guild?.id,
          actorId: message.author.id,
          targetId: islemAdi,
          details: { parametreler },
        });
        const sonucMesaj = await islemUygula(islemAdi, parametreler, message.guild, message);
        await sonucGonder(message, sonucMesaj);
      } else {
        const aciklama = Object.entries(parametreler).map(([k, v]) => `**${k}:** ${v}`).join('\n');
        const embed = new EmbedBuilder()
          .setTitle('🤔 İşlem Onayı')
          .setColor(0xF39C12)
          .setDescription(`**${islemAdi.replace(/_/g, ' ').toUpperCase()}**\n\n${aciklama}`)
          .setFooter({ text: 'Onaylıyor musun?' });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ai_onayla').setLabel('✅ Onayla').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('ai_degistir').setLabel('✏️ Değiştir').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('ai_reddet').setLabel('❌ Reddet').setStyle(ButtonStyle.Danger),
        );
        const onayMesaj = await message.reply({ embeds: [embed], components: [row] });
        bekleyenIslemler.set(onayMesaj.id, { islemAdi, parametreler, guild: message.guild, channel: message.channel, authorId: message.author.id, soru });
        setTimeout(() => {
          bekleyenIslemler.delete(onayMesaj.id);
          onayMesaj.edit({ components: [] }).catch(() => {});
        }, 60000);
      }
    }
    return;
  }

  // Geçmişe ekle ve kaydet
  gecmis.push({ role: 'user', content: soru });
  gecmis.push({ role: 'assistant', content: cevap });
  gecmisiGuncelle(message.author.id, gecmis);
  gecmisiKanalaKaydet(client, message.author.id, gecmis).catch(() => {});

  if (cevap.length <= 2000) await message.reply(cevap);
  else {
    const parcalar = cevap.match(/.{1,2000}/gs) || [];
    for (const p of parcalar) await message.channel.send(p);
  }
};

module.exports.bekleyenIslemler = bekleyenIslemler;
module.exports.islemUygula = islemUygula;

// Tool sonuclarini gonderirken: basarili ise sadece reaction, hata ise normal mesaj
async function sonucGonder(message, sonucMesaj) {
  if (typeof sonucMesaj === 'string' && sonucMesaj.trim().startsWith('✅')) {
    try { await message.react('✅'); } catch {}
    return;
  }
  try { await message.reply(sonucMesaj); } catch {}
}
module.exports.sonucGonder = sonucGonder;
