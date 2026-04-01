// commands/kacgun.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('kacgun')
  .setDescription('Sunucuya katılalı kaç gün olduğunu gösterir')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı (boş bırakırsan kendin)').setRequired(false));

async function execute(interaction) {
  const hedef = interaction.options.getMember('kullanici') || interaction.member;

  const katilimTarihi = hedef.joinedAt;
  if (!katilimTarihi) return interaction.reply({ content: '❌ Katılım tarihi alınamadı.', ephemeral: true });

  const simdi = new Date();
  const fark = simdi - katilimTarihi;

  const gun = Math.floor(fark / (1000 * 60 * 60 * 24));
  const saat = Math.floor((fark % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const dakika = Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60));

  const hesapOlusturma = hedef.user.createdAt;
  const hesapGun = Math.floor((simdi - hesapOlusturma) / (1000 * 60 * 60 * 24));

  let rozet = '';
  if (gun >= 365) rozet = '👑 Veteran';
  else if (gun >= 180) rozet = '🌟 Eski Üye';
  else if (gun >= 90) rozet = '🔥 Aktif Üye';
  else if (gun >= 30) rozet = '✨ Yeni Üye';
  else rozet = '🌱 Çaylak';

  await interaction.reply({ embeds: [new EmbedBuilder()
    .setTitle(`📅 ${hedef.user.username} — Sunucu Süresi`)
    .setColor(0x5865F2)
    .setThumbnail(hedef.user.displayAvatarURL())
    .addFields(
      { name: '⏱️ Sunucuda', value: `**${gun}** gün **${saat}** saat **${dakika}** dakika`, inline: false },
      { name: '📆 Katılım Tarihi', value: `<t:${Math.floor(katilimTarihi.getTime() / 1000)}:F>`, inline: false },
      { name: '🎂 Hesap Yaşı', value: `**${hesapGun}** gün`, inline: true },
      { name: '🏅 Rozet', value: rozet, inline: true },
    )
    .setFooter({ text: interaction.guild.name })
    .setTimestamp()]
  });
}

module.exports = { data, execute };