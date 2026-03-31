// commands/rankguncelle.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('rankguncelle')
  .setDescription('Kendi rankını günceller')
  .addStringOption(opt => opt
    .setName('rank')
    .setDescription('Yeni rankın')
    .setRequired(true)
    .addChoices(
      { name: '🧡 Epik', value: 'Epik' },
      { name: '💛 Efsane', value: 'Efsane' },
      { name: '❤️ Mistik', value: 'Mistik' },
      { name: '✨ Şanlı Mistik', value: 'Şanlı Mistik' },
      { name: '💜 Mistik Zafer', value: 'Mistik Zafer' },
      { name: '👑 Yüce Mistik', value: 'Yüce Mistik' }
    ));

async function execute(interaction, client) {
  const member = interaction.member;
  const yeniRank = interaction.options.getString('rank');
  const kayitVerisi = client.kayitVerisi;
  const bilgi = kayitVerisi.get(member.id);

  if (!bilgi) {
    return interaction.reply({ content: '❌ Kayıtlı değilsin. Önce kayıt ol!', ephemeral: true });
  }

  const eskiRank = bilgi.rank || 'Belirtilmedi';
  bilgi.rank = yeniRank;
  kayitVerisi.set(member.id, bilgi);

  const logKanal = interaction.guild.channels.cache.get(process.env.LOG_KANAL_ID);
  if (logKanal) {
    await logKanal.send({ embeds: [new EmbedBuilder()
      .setTitle('🏅 Rank Güncellendi')
      .setColor(0x5865F2)
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${member.id}> (${member.user.tag})`, inline: false },
        { name: '📉 Eski Rank', value: eskiRank, inline: true },
        { name: '📈 Yeni Rank', value: yeniRank, inline: true },
        { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: `Kullanıcı ID: ${member.id}` })
      .setTimestamp()]
    });
  }

  return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
    .setTitle('✅ Rank Güncellendi!')
    .setColor(0x57F287)
    .setDescription(`Rankın **${eskiRank}** → **${yeniRank}** olarak güncellendi.`)
    .setTimestamp()]
  });
}

module.exports = { data, execute };