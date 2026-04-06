// commands/hosgeldin.js
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
      `📋 Kayıt olmayı unutma, kayıtsız üyeler etkinliklere katılamaz!`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: '👥 Toplam Üye', value: `${member.guild.memberCount}`, inline: true },
      { name: '📅 Katılım', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: member.guild.name })
    .setTimestamp();

  await kanal.send({ content: `<@${member.id}>`, embeds: [embed] });
};