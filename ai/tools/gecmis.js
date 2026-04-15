// ai/gecmis.js
const { EmbedBuilder } = require('discord.js');

// Bellekteki geçmişler (restart'ta sıfırlanır, kanal arşivinden yüklenir)
const konusmaTarihi = new Map();

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
  // Eskisini sil
  const fetched = await kanal.messages.fetch({ limit: 100 }).catch(() => null);
  if (fetched) {
    for (const [, msg] of fetched) {
      if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `KONUSMA:${userId}`) {
        await msg.delete().catch(() => {});
        break;
      }
    }
  }
  const sonGecmis = gecmis.slice(-20);
  const fields = sonGecmis.map(m => ({
    name: m.role === 'user' ? 'kullanici' : 'asistan',
    value: m.content.slice(0, 1024),
    inline: false,
  }));
  if (fields.length === 0) return;
  await kanal.send({
    embeds: [new EmbedBuilder()
      .setTitle('💬 Konuşma')
      .setColor(0x5865F2)
      .addFields(fields)
      .setFooter({ text: `KONUSMA:${userId}` })
      .setTimestamp()],
  }).catch(() => {});
}

async function gecmisiGetir(client, userId) {
  let gecmis = konusmaTarihi.get(userId);
  if (!gecmis) {
    gecmis = await gecmisiKanaldenYukle(client, userId);
    konusmaTarihi.set(userId, gecmis);
  }
  return gecmis;
}

function gecmisiGuncelle(userId, gecmis) {
  if (gecmis.length > 20) gecmis.splice(0, 2);
  konusmaTarihi.set(userId, gecmis);
}

module.exports = { gecmisiGetir, gecmisiGuncelle, gecmisiKanalaKaydet };
