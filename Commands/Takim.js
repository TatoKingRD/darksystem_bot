// commands/takim.js
// Herkes kullanabilir - takım arkadaşı arama ilanı oluşturur

const { EmbedBuilder } = require('discord.js');

module.exports = async function takimKomutu(client, message) {
  // Kullanım: !takim [rank] [rol]
  // Örnek:    !takim Mythic Nişancı
  const args = message.content.slice('!takim'.length).trim().split(' ');

  if (args.length < 2 || !args[0]) {
    return message.reply({ embeds: [new EmbedBuilder()
      .setTitle('❌ Hatalı Kullanım')
      .setColor(0xFF0000)
      .setDescription('Doğru kullanım:\n`!takim [rank] [rol]`\n\nÖrnek:\n`!takim Mythic Nişancı`\n`!takim Epic Tank`')
      .addFields(
        { name: '🏅 Rank Seçenekleri', value: 'Warrior · Elite · Master · Grandmaster · Epic · Legend · Mythic', inline: false },
        { name: '🎮 Rol Seçenekleri', value: 'Nişancı · Suikastçı · Savaşçı · Tank · Büyücü · Destek', inline: false }
      )]
    });
  }

  const rank = args[0];
  const rol = args.slice(1).join(' ');

  // Rank rengi
  const rankRenkleri = {
    warrior: 0x808080,
    elite: 0x00AA00,
    master: 0x0000FF,
    grandmaster: 0x9B59B6,
    epic: 0xE67E22,
    legend: 0xF1C40F,
    mythic: 0xE74C3C
  };
  const renk = rankRenkleri[rank.toLowerCase()] || 0x5865F2;

  const ilan = new EmbedBuilder()
    .setTitle('🎮 Takım Arkadaşı Aranıyor!')
    .setColor(renk)
    .setDescription(`<@${message.author.id}> takım arıyor, ilgilenenler DM atsın veya bu mesajı yanıtlasın!`)
    .addFields(
      { name: '🏅 Rank', value: rank, inline: true },
      { name: '🎯 Aranan Rol', value: rol, inline: true },
      { name: '👤 Oyuncu', value: `<@${message.author.id}>`, inline: true }
    )
    .setFooter({ text: 'İlgilenenler bu mesajı yanıtlayabilir' })
    .setTimestamp();

  await message.delete().catch(() => {});
  await message.channel.send({ embeds: [ilan] });
};
