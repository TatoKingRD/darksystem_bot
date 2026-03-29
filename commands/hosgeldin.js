// commands/hosgeldin.js
// Yeni üye gelince #genel kanalına embed gönderir

const { EmbedBuilder } = require('discord.js');

module.exports = async function hosgeldinGonder(member) {
  const genelKanalId = process.env.GENEL_KANAL_ID;
  if (!genelKanalId) return;

  const kanal = member.guild.channels.cache.get(genelKanalId);
  if (!kanal) return;

  const embed = new EmbedBuilder()
    .setTitle('🎉 Yeni Üye!')
    .setColor(0x5865F2)
    .setDescription(
      `Hoş geldin <@${member.id}>! 🙌\n\n` +
      `Sunucumuza katıldığın için teşekkürler!\n\n` +
      `📋 Kayıt olmayı unutma, kayıtsız üyeler turnuvalara katılamaz ve ödül kazanamaz!\n\n` +
      `🏆 Her **Cumartesi saat 20:00**'de ödüllü turnuvamız var, kaçırma!`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👥 Toplam Üye', value: `${member.guild.memberCount}`, inline: true },
      { name: '📅 Katılım', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: 'Mobile Legends 🇹🇷 #TURNUVA' })
    .setTimestamp();

  await kanal.send({ content: `<@${member.id}>`, embeds: [embed] });
};
