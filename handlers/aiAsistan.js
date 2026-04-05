// handlers/aiAsistan.js
const https = require('https');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const konusmaTarihi = new Map();

// Kanal ID'si için env variable: AI_ARSIV_KANAL_ID
async function gecmisiKanaldenYukle(client, userId) {
  const kanal = client.channels.cache.get(process.env.AI_ARSIV_KANAL_ID);
  if (!kanal) return [];
  
  const mesajlar = [];
  let lastId = null;
  
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const fetched = await kanal.messages.fetch(options).catch(() => null);
    if (!fetched || fetched.size === 0) break;
    
    for (const [, msg] of fetched) {
      if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `KONUSMA:${userId}`) {
        const fields = msg.embeds[0].fields || [];
        for (const f of fields) {
          if (f.name === 'kullanici') mesajlar.unshift({ role: 'user', content: f.value });
          if (f.name === 'asistan') mesajlar.unshift({ role: 'assistant', content: f.value });
        }
        break;
      }
    }
    if (mesajlar.length > 0) break;
    if (fetched.size < 100) break;
    lastId = fetched.last().id;
  }
  
  return mesajlar.slice(-20); // son 10 çift
}

async function gecmisiKanaleSkaydet(client, userId, gecmis) {
  const kanal = client.channels.cache.get(process.env.AI_ARSIV_KANAL_ID);
  if (!kanal) return;

  const { EmbedBuilder } = require('discord.js');
  
  // Eski kaydı bul ve sil
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

  // Son 10 çifti kaydet
  const sonGecmis = gecmis.slice(-20);
  const fields = [];
  for (const m of sonGecmis) {
    fields.push({ name: m.role === 'user' ? 'kullanici' : 'asistan', value: m.content.slice(0, 1024), inline: false });
  }
  
  if (fields.length === 0) return;

  await kanal.send({ embeds: [new EmbedBuilder()
    .setTitle(`💬 Konuşma Geçmişi`)
    .setColor(0x5865F2)
    .addFields(fields)
    .setFooter({ text: `KONUSMA:${userId}` })
    .setTimestamp()]
  }).catch(() => {});
}

const bekleyenIslemler = new Map(); // mesaj ID => islem

async function groqSor(mesajlar) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: mesajlar,
      max_tokens: 1024,
      temperature: 0.7,
    });

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
          const json = JSON.parse(data);
          resolve(json.choices?.[0]?.message?.content || '❌ Cevap alınamadı.');
        } catch {
          resolve('❌ Bir hata oluştu.');
        }
      });
    });

    req.on('error', () => resolve('❌ Bağlantı hatası.'));
    req.setTimeout(10000, () => { req.destroy(); resolve('❌ Zaman aşımı.'); });
    req.write(body);
    req.end();
  });
}

const SISTEM_MESAJI = `Sen MLBB TR Discord sunucusunun yapay zeka asistanısın. Adın "DARK".

Görevlerin:
- Üyelerin sorularını Türkçe olarak cevapla
- Mobile Legends: Bang Bang hakkında bilgi ver
- Sunucu yönetimi işlemlerini algıla ve JSON formatında döndür

E�er kullanıcı bir Discord sunucu işlemi yapmak istiyorsa (kanal adı değiştirme, kanal silme, kanal oluşturma vb.),
cevabını SADECE şu JSON formatında ver, başka hiçbir şey yazma:

{"islem": "ISLEM_TIPI", "parametreler": {...}, "aciklama": "Ne yapılacağının Türkçe açıklaması"}

İşlem tipleri:
- kanal_adi_degistir: {"kanal_adi": "mevcut ad", "yeni_ad": "yeni ad"}
- kanal_sil: {"kanal_adi": "kanal adı"}
- kanal_olustur: {"kanal_adi": "yeni kanal adı", "kategori": "kategori adı (opsiyonel)"}
- rol_ver: {"kullanici_id": "id", "rol_adi": "rol adı"}
- rol_al: {"kullanici_id": "id", "rol_adi": "rol adı"}

E�er normal bir soru/sohbetse JSON değil, düz Türkçe cevap ver.
Her zaman kısa ve net ol. Bilmediğini uydurma.`;

async function islemUygula(interaction, islem, guild) {
  try {
    switch (islem.islem) {
      case 'kanal_adi_degistir': {
        const kanal = guild.channels.cache.find(c =>
          c.name.toLowerCase() === islem.parametreler.kanal_adi.toLowerCase()
        );
        if (!kanal) return '❌ Kanal bulunamadı.';
        const eskiAd = kanal.name;
        await kanal.setName(islem.parametreler.yeni_ad);
        return `✅ **#${eskiAd}** kanalının adı **#${islem.parametreler.yeni_ad}** olarak değiştirildi.`;
      }
      case 'kanal_sil': {
        const kanal = guild.channels.cache.find(c =>
          c.name.toLowerCase() === islem.parametreler.kanal_adi.toLowerCase()
        );
        if (!kanal) return '❌ Kanal bulunamadı.';
        const ad = kanal.name;
        await kanal.delete();
        return `✅ **#${ad}** kanalı silindi.`;
      }
      case 'kanal_olustur': {
        const yeniKanal = await guild.channels.create({
          name: islem.parametreler.kanal_adi,
          type: 0,
        });
        return `✅ **#${yeniKanal.name}** kanalı oluşturuldu.`;
      }
      case 'rol_ver': {
        const uye = await guild.members.fetch(islem.parametreler.kullanici_id).catch(() => null);
        const rol = guild.roles.cache.find(r => r.name.toLowerCase() === islem.parametreler.rol_adi.toLowerCase());
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        if (!rol) return '❌ Rol bulunamadı.';
        await uye.roles.add(rol);
        return `✅ <@${uye.id}> kullanıcısına **${rol.name}** rolü verildi.`;
      }
      case 'rol_al': {
        const uye = await guild.members.fetch(islem.parametreler.kullanici_id).catch(() => null);
        const rol = guild.roles.cache.find(r => r.name.toLowerCase() === islem.parametreler.rol_adi.toLowerCase());
        if (!uye) return '❌ Kullanıcı bulunamadı.';
        if (!rol) return '❌ Rol bulunamadı.';
        await uye.roles.remove(rol);
        return `✅ <@${uye.id}> kullanıcısından **${rol.name}** rolü alındı.`;
      }
      default:
        return '❌ Bilinmeyen işlem.';
    }
  } catch (err) {
    console.error('İşlem hatası:', err);
    return `❌ İşlem uygulanırken hata oluştu: ${err.message}`;
  }
}

module.exports = async function aiAsistan(message, client) {
  if (message.author.bot) return;

  const botMention = `<@${client.user.id}>`;
  const botMentionNick = `<@!${client.user.id}>`;
  if (!message.content.includes(botMention) && !message.content.includes(botMentionNick)) return;

  const soru = message.content
    .replace(botMention, '')
    .replace(botMentionNick, '')
    .trim();

  if (!soru) return message.reply('Merhaba! 👋 Sana nasıl yardımcı olabilirim?');

  await message.channel.sendTyping();

  // Geçmişi bellekten al, yoksa kanaldan yükle
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

  const cevap = await groqSor(mesajlar);

  // JSON işlem mi?
  let islem = null;
  try {
    const temiz = cevap.trim().replace(/```json|```/g, '').trim();
    if (temiz.startsWith('{') && temiz.includes('"islem"')) {
      islem = JSON.parse(temiz);
    }
  } catch {}

  if (islem) {
    // Onay sistemi
    const embed = new EmbedBuilder()
      .setTitle('🤔 İşlem Onayı')
      .setColor(0xF39C12)
      .setDescription(`**Şunu yapmak üzereyim:**\n\n${islem.aciklama}`)
      .setFooter({ text: 'Onaylıyor musun?' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ai_onayla').setLabel('✅ Onayla').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ai_degistir').setLabel('✏️ Değiştir').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ai_reddet').setLabel('❌ Reddet').setStyle(ButtonStyle.Danger),
    );

    const onayMesaj = await message.reply({ embeds: [embed], components: [row] });
    bekleyenIslemler.set(onayMesaj.id, { islem, guild: message.guild, authorId: message.author.id });

    // 60 saniye sonra sil
    setTimeout(() => {
      bekleyenIslemler.delete(onayMesaj.id);
      onayMesaj.edit({ components: [] }).catch(() => {});
    }, 60000);

  } else {
    // Normal cevap
    gecmis.push({ role: 'user', content: soru });
    gecmis.push({ role: 'assistant', content: cevap });
    if (gecmis.length > 20) gecmis.splice(0, 2);
    konusmaTarihi.set(message.author.id, gecmis);
    gecmisiKanaleSkaydet(client, message.author.id, gecmis).catch(() => {});

    if (cevap.length <= 2000) {
      await message.reply(cevap);
    } else {
      const parcalar = cevap.match(/.{1,2000}/gs) || [];
      for (const parca of parcalar) await message.channel.send(parca);
    }
  }
};

module.exports.bekleyenIslemler = bekleyenIslemler;
module.exports.islemUygula = islemUygula;