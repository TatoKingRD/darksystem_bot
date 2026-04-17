// handlers/aiAsistan.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { groqSor } = require('../ai/groqApi');
const { ARACLAR, ONAYSIZ, araclariHazirla } = require('../ai/tools');
const { islemUygula } = require('../ai/islemUygula');
const { gecmisiGetir, gecmisiGuncelle, gecmisiKanalaKaydet } = require('../ai/gecmis');
const SISTEM_MESAJI = require('../ai/sistemMesaji');

// Araçları (manuel tool'lar + dinamik slash komutlar) bir kere hazırla
const ARACLAR_TUM = (typeof araclariHazirla === 'function') ? araclariHazirla() : ARACLAR;

// Onay bekleyen işlemler (interactionHandler ile paylaşılır)
const bekleyenIslemler = new Map();

module.exports = async function aiAsistan(message, client) {
  if (message.author.bot) return;
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

  const sahipId = process.env.AI_SAHIP_ID || '799564777839788033';
  const islemYetkisi = message.author.id === sahipId;

  await message.channel.sendTyping();

  const gecmis = await gecmisiGetir(client, message.author.id);

  let sistemIcerik = SISTEM_MESAJI + `\n\nMEVCUT_KANAL: ${message.channel.name}`;
  if (yanitlananMesajId) {
    sistemIcerik += `\nYANITLANAN_MESAJ_ID: ${yanitlananMesajId} (kullanıcı bir mesaja reply atmış; mesaj_id gereken komutlarda bu ID'yi kullanabilirsin)`;
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
      const sonucMesaj = await islemUygula(islemAdi, parametreler, message.guild, message);
      // Geçmişe ekle
      gecmis.push({ role: 'user', content: soru });
      gecmis.push({ role: 'assistant', content: sonucMesaj });
      gecmisiGuncelle(message.author.id, gecmis);
      gecmisiKanalaKaydet(client, message.author.id, gecmis).catch(() => {});
      return message.reply(sonucMesaj);
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
        const sonucMesaj = await islemUygula(islemAdi, parametreler, message.guild, message);
        await message.reply(sonucMesaj);
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
