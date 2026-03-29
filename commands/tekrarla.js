// commands/tekrarla.js
const { EmbedBuilder } = require('discord.js');

const aktifGorevler = new Map();

async function tekrarlaBaslat(message) {
  const args = message.content.slice('!tekrarla'.length).trim().split(' ');
  if (args.length < 2) {
    return message.reply('❌ Kullanım: `!tekrarla [komut] [dakika]`\nÖrnek: `!tekrarla bump 125`');
  }

  const komutAdi = args[0].toLowerCase().replace('/', '');
  const sure = parseInt(args[1]);

  if (isNaN(sure) || sure < 1) {
    return message.reply('❌ Geçerli bir süre gir (dakika cinsinden).');
  }

  if (aktifGorevler.has(komutAdi)) {
    clearInterval(aktifGorevler.get(komutAdi).interval);
    aktifGorevler.delete(komutAdi);
  }

  const kanal = message.channel;

  async function hatirlatmaGonder() {
    try {
      const modRolId = process.env.MODERATOR_ROL_ID;
      const asisRolId = process.env.ASISTAN_ROL_ID;

      const pingParcalar = [];
      const izinVerilen = [];
      if (modRolId) { pingParcalar.push(`<@&${modRolId}>`); izinVerilen.push(modRolId); }
      if (asisRolId) { pingParcalar.push(`<@&${asisRolId}>`); izinVerilen.push(asisRolId); }

      await kanal.send({
        content: pingParcalar.join(' '),
        embeds: [new EmbedBuilder()
          .setTitle('🔔 Hatırlatma!')
          .setColor(0xF39C12)
          .setDescription(`\`/${komutAdi}\` komutunu çalıştırma zamanı geldi!`)
          .addFields(
            { name: '⏱️ Tekrar Süresi', value: `${sure} dakikada bir`, inline: true },
            { name: '▶️ Başlatan', value: `<@${message.author.id}>`, inline: true }
          )
          .setFooter({ text: 'Durdurmak için: !durdur ' + komutAdi })
          .setTimestamp()],
        allowedMentions: { roles: izinVerilen }
      });
    } catch (err) {
      console.error(`Hatırlatma gönderilemedi (${komutAdi}):`, err);
    }
  }

  await hatirlatmaGonder();

  const interval = setInterval(hatirlatmaGonder, sure * 60 * 1000);

  aktifGorevler.set(komutAdi, {
    interval, kanal, sure,
    baslatan: message.author.id,
    baslangic: Math.floor(Date.now() / 1000)
  });

  await message.reply({ embeds: [new EmbedBuilder()
    .setTitle('✅ Görev Başlatıldı')
    .setColor(0x57F287)
    .addFields(
      { name: '📌 Komut', value: `/${komutAdi}`, inline: true },
      { name: '⏱️ Süre', value: `${sure} dakikada bir`, inline: true },
      { name: '📢 Kanal', value: `<#${kanal.id}>`, inline: true }
    )
    .setTimestamp()]
  });
}

async function tekrarlaDurdur(message) {
  const args = message.content.slice('!durdur'.length).trim().split(' ');
  const komutAdi = args[0]?.toLowerCase().replace('/', '');

  if (!komutAdi) return message.reply('❌ Kullanım: `!durdur [komut]`\nÖrnek: `!durdur bump`');
  if (!aktifGorevler.has(komutAdi)) return message.reply(`❌ \`${komutAdi}\` için aktif görev bulunamadı.`);

  clearInterval(aktifGorevler.get(komutAdi).interval);
  aktifGorevler.delete(komutAdi);

  await message.reply({ embeds: [new EmbedBuilder()
    .setTitle('⏹️ Görev Durduruldu')
    .setColor(0xFF0000)
    .setDescription(`\`/${komutAdi}\` hatırlatması durduruldu.`)
    .setTimestamp()]
  });
}

async function gorevleriListele(message) {
  if (aktifGorevler.size === 0) return message.reply('📋 Şu an aktif görev yok.');

  const liste = [...aktifGorevler.entries()].map(([ad, g]) =>
    `**/${ad}** — her ${g.sure} dk — <#${g.kanal.id}> — <@${g.baslatan}> başlattı`
  ).join('\n');

  await message.reply({ embeds: [new EmbedBuilder()
    .setTitle('📋 Aktif Görevler')
    .setColor(0x5865F2)
    .setDescription(liste)
    .setTimestamp()]
  });
}

module.exports = { tekrarlaBaslat, tekrarlaDurdur, gorevleriListele };
