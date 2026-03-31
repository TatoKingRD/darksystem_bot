// commands/profil.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('profil')
  .setDescription('Kayıt bilgilerini gösterir');

async function execute(interaction, client) {
  const member = interaction.member;
  const kayitVerisi = client.kayitVerisi;
  const bilgi = kayitVerisi.get(member.id);

  if (bilgi) {
    return interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
      .setTitle('👤 Profilim')
      .setColor(0x5865F2)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: '👤 İsim', value: bilgi.isim, inline: true },
        { name: '🎂 Yaş', value: `${bilgi.yas}`, inline: true },
        { name: '🎮 IGN', value: bilgi.ign || 'Belirtilmedi', inline: true },
        { name: '🎯 Oyun ID', value: bilgi.oyunId || 'Belirtilmedi', inline: true },
        { name: '🏅 Rank', value: bilgi.rank || 'Belirtilmedi', inline: true },
        { name: '📅 Kayıt Tarihi', value: `<t:${bilgi.tarih}:F>`, inline: false }
      )
      .setFooter({ text: 'Bilgilerini güncellemek için yönetici ile iletişime geç.' })
      .setTimestamp()]
    });
  }

  // Arşivden ara
  await interaction.deferReply({ ephemeral: true });
  const arsivKanal = interaction.guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
  if (!arsivKanal) return interaction.editReply({ content: '❌ Kayıt bilgin bulunamadı. Henüz kayıt olmadın mı?' });

  let bulunanMesaj = null;
  let lastId = null;
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const mesajlar = await arsivKanal.messages.fetch(options);
    if (mesajlar.size === 0) break;
    for (const [, msg] of mesajlar) {
      if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `Kullanıcı ID: ${member.id}`) {
        bulunanMesaj = msg; break;
      }
    }
    if (bulunanMesaj) break;
    lastId = mesajlar.last().id;
    if (mesajlar.size < 100) break;
  }

  if (!bulunanMesaj) return interaction.editReply({ content: '❌ Kayıt bilgin bulunamadı. Henüz kayıt olmadın mı?' });

  const arsivEmbed = bulunanMesaj.embeds[0];
  return interaction.editReply({ embeds: [new EmbedBuilder()
    .setTitle('👤 Profilim')
    .setColor(0x5865F2)
    .setThumbnail(member.user.displayAvatarURL())
    .addFields(arsivEmbed.fields)
    .setFooter({ text: 'Bilgilerini güncellemek için yönetici ile iletişime geç.' })
    .setTimestamp(arsivEmbed.timestamp ? new Date(arsivEmbed.timestamp) : null)]
  });
}

module.exports = { data, execute };