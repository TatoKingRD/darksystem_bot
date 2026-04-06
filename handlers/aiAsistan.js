// handlers/aiAsistan.js
const https = require('https');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const konusmaTarihi = new Map();
const bekleyenIslemler = new Map();

// ─── GROQ API (Function Calling) ───
async function groqSor(mesajlar, araclar = null) {
  return new Promise((resolve) => {
    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: mesajlar,
      max_tokens: 1024,
      temperature: 0.7,
    };
    if (araclar) {
      payload.tools = araclar;
      payload.tool_choice = 'auto';
    }

    const body = JSON.stringify(payload);
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

// ─── ARAÇLAR (Tools) ───
const ARACLAR = [
  {
    type: 'function',
    function: {
      name: 'kanal_adi_degistir',
      description: 'Bir kanalın adını değiştirir',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Mevcut kanal adı' },
          yeni_ad: { type: 'string', description: 'Yeni kanal adı' },
        },
        required: ['kanal_adi', 'yeni_ad'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_olustur',
      description: 'Yeni bir kanal oluşturur',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Yeni kanalın adı' },
        },
        required: ['kanal_adi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_sil',
      description: 'Bir kanalı siler',
      parameters: {
        type: 'object',
        properties: {
          kanal_adi: { type: 'string', description: 'Silinecek kanalın adı' },
        },
        required: ['kanal_adi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_listele',
      description: 'Sunucudaki tüm kanalları listeler',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_temizle',
      description: 'Tüm kanalların başındaki özel karakter ve emojileri kaldırır',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'kanal_emoji_ekle',
      description: 'Tüm kanallara adlarına uygun emoji ekler',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uye_ban',
      description: 'Bir üyeyi sunucudan banlar',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          sebep: { type: 'string', description: 'Ban sebebi' },
        },
        required: ['kullanici_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uye_kick',
      description: 'Bir üyeyi sunucudan atar',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          sebep: { type: 'string', description: 'Kick sebebi' },
        },
        required: ['kullanici_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'uye_sustur',
      description: 'Bir üyeyi geçici olarak susturur',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          sure: { type: 'string', description: 'Süre: 60s, 5m, 10m, 1h, 1g, 1w' },
          sebep: { type: 'string', description: 'Susturma sebebi' },
        },
        required: ['kullanici_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rol_ver',
      description: 'Kullanıcıya rol verir',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          rol_adi: { type: 'string', description: 'Rol adı' },
        },
        required: ['kullanici_id', 'rol_adi'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rol_al',
      description: 'Kullanıcıdan rol alır',
      parameters: {
        type: 'object',
        properties: {
          kullanici_id: { type: 'string', description: 'Kullanıcı ID veya mention' },
          rol_adi: { type: 'string', description: 'Rol adı' },
        },
        required: ['kullanici_id', 'rol_adi'],
      },
    },
  },
];

// ─── İŞLEM UYGULAMA ───
async function islemUygula(islemAdi, parametreler, guild) {
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
        const liste = guild.channels.cache.filter(c => c.type === 0).sort((a, b) => a.name.localeCompare(b.name)).map(c => `📢 #${c.name}`).join('\n');
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
      default:
        return '❌ Bilinmeyen işlem.';
    }
  } catch (err) {
    return `❌ Hata: ${err.message}`;
  }
}

// ─── GEÇMİŞ YÜKLEME/KAYDETME ───
async function gecmisiKanaldenYukle(client, userId) {
  const kanal = client.channels.cache.get(process.env.AI_ARSIV_KANAL_ID);
  if (!kanal) return [];
  let lastId = null;
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const fetched = await kanal.messages.fetch(options).catch(() => null);
    if (!fetched || fetched.size === 0) break;
    for (const [, msg] of fetched) {
      if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `KONUSMA:${userId}`) {
        const mesajlar = [];
        for (const f of msg.embeds[0].fields || []) {
          if (f.name === 'kullanici') mesajlar.push({ role: 'user', content: f.value });
          if (f.name === 'asistan') mesajlar.push({ role: 'assistant', content: f.value });
        }
        return mesajlar.slice(-20);
      }
    }
    if (fetched.size < 100) break;
    lastId = fetched.last().id;
  }
  return [];
}

async function gecmisiKanalaKaydet(client, userId, gecmis) {
  const kanal = client.channels.cache.get(process.env.AI_ARSIV_KANAL_ID);
  if (!kanal) return;
  let lastId = null;
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const fetched = await kanal.messages.fetch(options).catch(() => null);
    if (!fetched || fetched.size === 0) break;
    for (const [, msg] of fetched) {
      if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `KONUSMA:${userId}`) {
        await msg.delete().catch(() => {});
        break;
      }
    }
    break;
  }
  const sonGecmis = gecmis.slice(-20);
  const fields = sonGecmis.map(m => ({ name: m.role === 'user' ? 'kullanici' : 'asistan', value: m.content.slice(0, 1024), inline: false }));
  if (fields.length === 0) return;
  await kanal.send({ embeds: [new EmbedBuilder().setTitle('💬 Konuşma').setColor(0x5865F2).addFields(fields).setFooter({ text: `KONUSMA:${userId}` }).setTimestamp()] }).catch(() => {});
}

const SISTEM_MESAJI = `Sen MLBB TR Discord sunucusunun yapay zeka asistanısın. Adın "DARKSYSTEM".
Türkçe konuş. Kısa ve net cevaplar ver.
Kullanıcı bir Discord işlemi yapmak istiyorsa uygun aracı (tool) çağır.
Sadece sohbet ediyorsa normal cevap ver, araç çağırma.
Bilmediğini uydurma.`;

// ─── ONAY GEREKTİRMEYEN İŞLEMLER ───
const ONAYSIZ = ['kanal_listele', 'kanal_temizle', 'kanal_emoji_ekle'];

module.exports = async function aiAsistan(message, client) {
  if (message.author.bot) return;
  const botMention = `<@${client.user.id}>`;
  const botMentionNick = `<@!${client.user.id}>`;
  if (!message.content.includes(botMention) && !message.content.includes(botMentionNick)) return;

  const soru = message.content.replace(botMention, '').replace(botMentionNick, '').trim();
  if (!soru) return message.reply('Merhaba! 👋 Nasıl yardımcı olabilirim?');

  const sahipId = process.env.AI_SAHIP_ID || '799564777839788033';
  const islemYetkisi = message.author.id === sahipId;

  await message.channel.sendTyping();

  let gecmis = konusmaTarihi.get(message.author.id);
  if (!gecmis) {
    gecmis = await gecmisiKanaldenYukle(client, message.author.id);
    konusmaTarihi.set(message.author.id, gecmis);
  }

  const mesajlar = [
    { role: 'system', content: SISTEM_MESAJI },
    ...gecmis,
    { role: 'user', content: soru }
  ];

  const sonuc = await groqSor(mesajlar, ARACLAR);
  if (!sonuc) return message.reply('❌ Bağlantı hatası.');

  const secim = sonuc.choices?.[0];
  if (!secim) return message.reply('❌ Cevap alınamadı.');

  // Tool call mı?
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
      const sonucMesaj = await islemUygula(islemAdi, parametreler, message.guild);
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
    bekleyenIslemler.set(onayMesaj.id, { islemAdi, parametreler, guild: message.guild, authorId: message.author.id });
    setTimeout(() => { bekleyenIslemler.delete(onayMesaj.id); onayMesaj.edit({ components: [] }).catch(() => {}); }, 60000);

  } else {
    // Normal cevap
    const cevap = secim.message?.content || '❌ Cevap alınamadı.';
    gecmis.push({ role: 'user', content: soru });
    gecmis.push({ role: 'assistant', content: cevap });
    if (gecmis.length > 20) gecmis.splice(0, 2);
    konusmaTarihi.set(message.author.id, gecmis);
    gecmisiKanalaKaydet(client, message.author.id, gecmis).catch(() => {});
    if (cevap.length <= 2000) await message.reply(cevap);
    else { const p = cevap.match(/.{1,2000}/gs) || []; for (const x of p) await message.channel.send(x); }
  }
};

module.exports.bekleyenIslemler = bekleyenIslemler;
module.exports.islemUygula = islemUygula;
