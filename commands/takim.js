// commands/takim.js
// Kullanim: !takim [rank] [kendi_rol] [aranan_rol] [koridor]
// Ornek:    !takim Mythic ADC Mid
// Ornek:    !takim Epic Support Tank Kanat

const { EmbedBuilder } = require('discord.js');

module.exports = async function takimKomutu(client, message) {
  const args = message.content.slice('!takim'.length).trim().split(' ').filter(a => a.length > 0);

  if (args.length < 3) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('❌ Hatalı Kullanım')
      .setColor(0xFF0000)
      .setDescription(
        'Doğru kullanım:\n`!takim [rank] [kendi_rol] [aranan_rol] [koridor]`\n\n' +
        '**Örnekler:**\n' +
        '`!takim Mythic ADC Mid`\n' +
        '`!takim Epic Support Tank Kanat`\n' +
        '`!takim Legend Destek Savaşçı Üst`'
      )
      .addFields(
        { name: '🏅 Rank', value: 'Warrior · Elite · Master · Grandmaster · Epic · Legend · Mythic', inline: false },
        { name: '🎮 Roller', value: 'Nişancı · Suikastçı · Savaşçı · Tank · Büyücü · Destek', inline: false },
        { name: '🗺️ Koridor', value: 'Üst · Orta · Kanat · Jungler · Roaming (opsiyonel)', inline: false }
      )]
    });
  }

  const rank = args[0];
  const kendiRol = args[1];
  const arananRol = args[2];
  const koridor = args[3] || null;

  // Kayıt verisinden IGN ve Oyun ID çek
  const kayitVerisi = client.kayitVerisi;
  const kayit = kayitVerisi?.get(message.author.id);
  const ign = kayit?.ign || null;
  const oyunId = kayit?.oyunId || null;

  const rankRenkleri = {
    warrior: 0x808080, elite: 0x00AA00, master: 0x0000FF,
    grandmaster: 0x9B59B6, epic: 0xE67E22, legend: 0xF1C40F, mythic: 0xE74C3C
  };
  const renk = rankRenkleri[rank.toLowerCase()] || 0x5865F2;

  const ilanFields = [
    { name: '🏅 Rank', value: rank, inline: true },
    { name: '🎮 Rolüm', value: kendiRol, inline: true },
    { name: '🔍 Aranan Rol', value: arananRol, inline: true },
    { name: '👤 Oyuncu', value: `<@${message.author.id}>`, inline: true }
  ];
  if (koridor) ilanFields.push({ name: '🗺️ Koridor', value: koridor, inline: true });
  if (ign) ilanFields.push({ name: '🎯 IGN', value: ign, inline: true });
  if (oyunId) ilanFields.push({ name: '🆔 Oyun ID', value: oyunId, inline: true });

  const ilan = new EmbedBuilder()
    .setTitle('🎮 Takım Arkadaşı Aranıyor!')
    .setColor(renk)
    .setDescription(`<@${message.author.id}> takım arıyor! İlgilenenler DM atsın veya bu mesajı yanıtlasın.`)
    .addFields(ilanFields)
    .setFooter({ text: 'İlgilenenler bu mesajı yanıtlayabilir' })
    .setTimestamp();

  await message.delete().catch(() => {});

  const takimRolId = process.env.TAKIM_ROL_ID;
  await message.channel.send({
    content: takimRolId ? `<@&${takimRolId}>` : null,
    embeds: [ilan],
    allowedMentions: { roles: takimRolId ? [takimRolId] : [] }
  });

  // Genel kanala samimi bildirim
  if (process.env.GENEL_KANAL_ID) {
    const genelKanal = message.guild.channels.cache.get(process.env.GENEL_KANAL_ID);
    if (genelKanal) {
      const koridorYazi = koridor ? ` **${koridor}** koridorunda` : '';
      let description =
        `<@${message.author.id}> **${rank}** rankında **${kendiRol}** olarak${koridorYazi} oynuyor, **${arananRol}** arıyor — girmek isteyen yok mu? 😢\n\n`;

      if (ign || oyunId) {
        description += `Eklemek için:\n`;
        if (ign) description += `🎯 **IGN:** ${ign}\n`;
        if (oyunId) description += `🆔 **Oyun ID:** ${oyunId}\n`;
        description += `\n`;
      }

      description += `👉 <#${message.channel.id}>`;

      await genelKanal.send({
        embeds: [new EmbedBuilder()
          .setColor(renk)
          .setDescription(description)
          .setTimestamp()]
      });
    }
  }
};
