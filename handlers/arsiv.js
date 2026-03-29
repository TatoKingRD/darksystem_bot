// handlers/arsiv.js
// Restart'ta arşiv kanalından kayıtları belleğe yükler

async function arsivdenYukle(guild, kayitVerisi) {
  const arsivKanal = guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
  if (!arsivKanal) { console.log('Arşiv kanalı bulunamadı, yükleme atlandı.'); return; }

  let lastId = null;
  let yuklenen = 0;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const mesajlar = await arsivKanal.messages.fetch(options);
    if (mesajlar.size === 0) break;

    for (const [, msg] of mesajlar) {
      if (msg.embeds.length === 0) continue;
      const embed = msg.embeds[0];
      const footerText = embed.footer?.text || '';
      if (!footerText.startsWith('Kullanıcı ID:')) continue;

      const userId = footerText.replace('Kullanıcı ID:', '').trim();
      if (!userId) continue;
      if (kayitVerisi.has(userId)) continue;

      const fields = {};
      for (const f of embed.fields) fields[f.name] = f.value;

      const isim = (fields['👤 İsim'] || '').trim();
      const yasStr = (fields['🎂 Yaş'] || '0').trim();
      const ignRaw = (fields['🎮 IGN'] || 'Belirtilmedi').trim();
      const ign = ignRaw === 'Belirtilmedi' ? null : ignRaw;
      const oyunIdRaw = (fields['🎯 Oyun ID'] || '').trim();
      const oyunId = oyunIdRaw === 'Belirtilmedi' || oyunIdRaw === '' ? null : oyunIdRaw;
      const neredenRaw = (fields['📣 Nereden Duydun?'] || '').trim();
      const neredenDuydun = neredenRaw === 'Belirtilmedi' || neredenRaw === '' ? null : neredenRaw;

      if (!isim) continue;

      kayitVerisi.set(userId, {
        isim,
        yas: parseInt(yasStr) || 0,
        ign,
        oyunId,
        neredenDuydun,
        tarih: embed.timestamp ? Math.floor(new Date(embed.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000)
      });
      yuklenen++;
    }

    if (mesajlar.size < 100) break;
    lastId = mesajlar.last().id;
  }

  console.log(`Arşivden ${yuklenen} kayıt belleğe yüklendi.`);
}

module.exports = { arsivdenYukle };
