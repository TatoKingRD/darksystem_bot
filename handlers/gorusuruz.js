// handlers/gorusuruz.js
// Uye ayrildiginda #gorusuruz kanalina guzel bir veda mesaji atar

module.exports = async function gorusuruzGonder(member) {
  const kanalId = process.env.GORUSURUZ_KANAL_ID;
  if (!kanalId) return;

  try {
    const kanal = await member.guild.channels.fetch(kanalId).catch(() => null);
    if (!kanal) return;

    // Kalan uye sayisi
    const kalanSayi = member.guild.memberCount;

    // Kullanici adi - username veya displayName
    const kullaniciAdi = member.user?.username || member.displayName || 'bir üye';

    const mesaj =
      `💨 Bir yıldız daha kaydı...\n` +
      `**${kullaniciAdi}** artık aramızda değil.\n` +
      `Şu an **${kalanSayi}** kişiyle yolumuza devam ediyoruz. 🌌\n` +
      `Belki bir gün geri döner... 🍃`;

    await kanal.send({ content: mesaj, allowedMentions: { parse: [] } }).catch(() => {});
  } catch (e) {
    console.error('[gorusuruz] Hata:', e.message);
  }
};
