// handlers/aiAsistan.js
// Bot mention edilince Groq AI ile cevap verir

const https = require('https');

const konusmaTarihi = new Map(); // kullanıcı başına son 10 mesaj

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
- Sunucu kuralları ve komutlar hakkında yardım et
- Moderasyon konularında tavsiyelerde bulun
- Sunucuyu analiz edip yöneticiye öneriler sun

Önemli kurallar:
- Her zaman Türkçe konuş
- Kısa ve net cevaplar ver (çok uzun yazma)
- Kibar ve yardımsever ol
- Bilmediğin şeyleri uydurma, "bilmiyorum" de
- Zararlı veya uygunsuz içerik üretme`;

module.exports = async function aiAsistan(message, client) {
  if (message.author.bot) return;

  // Bot mention edildi mi kontrol et
  const botMention = `<@${client.user.id}>`;
  const botMentionNick = `<@!${client.user.id}>`;
  
  if (!message.content.includes(botMention) && !message.content.includes(botMentionNick)) return;

  // Mesajdan mention'ı temizle
  const soru = message.content
    .replace(botMention, '')
    .replace(botMentionNick, '')
    .trim();

  if (!soru) {
    return message.reply('Merhaba! 👋 Sana nasıl yardımcı olabilirim?');
  }

  // Yazıyor göstergesi
  await message.channel.sendTyping();

  // Kullanıcının konuşma geçmişini al (max 10 mesaj)
  const gecmis = konusmaTarihi.get(message.author.id) || [];

  const mesajlar = [
    { role: 'system', content: SISTEM_MESAJI },
    ...gecmis,
    { role: 'user', content: soru }
  ];

  const cevap = await groqSor(mesajlar);

  // Geçmişi güncelle
  gecmis.push({ role: 'user', content: soru });
  gecmis.push({ role: 'assistant', content: cevap });
  if (gecmis.length > 20) gecmis.splice(0, 2); // max 10 çift
  konusmaTarihi.set(message.author.id, gecmis);

  // Cevap 2000 karakterden uzunsa böl
  if (cevap.length <= 2000) {
    await message.reply(cevap);
  } else {
    const parcalar = cevap.match(/.{1,2000}/gs) || [];
    for (const parca of parcalar) {
      await message.channel.send(parca);
    }
  }
};
