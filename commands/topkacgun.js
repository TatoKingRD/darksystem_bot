// commands/topkacgun.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('topkacgun')
  .setDescription('Sunucuda en uzun süredir olan üyeleri listeler')
  .addIntegerOption(opt => opt.setName('sayi').setDescription('Kaç kişi listelensin? (varsayılan: 10, max: 25)').setRequired(false).setMinValue(1).setMaxValue(25))
  .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcının sırasını göster').setRequired(false));

async function execute(interaction) {
  await interaction.deferReply();

  const sayi = interaction.options.getInteger('sayi') || 10;
  const hedefKullanici = interaction.options.getMember('kullanici');

  // Tüm üyeleri çek
  await interaction.guild.members.fetch();
  const simdi = Date.now();

  const uyeler = interaction.guild.members.cache
    .filter(m => !m.user.bot && m.joinedAt)
    .map(m => ({ id: m.id, tag: m.user.tag, joinedAt: m.joinedAt }))
    .sort((a, b) => a.joinedAt - b.joinedAt);

  // Top N listesi
  const topListe = uyeler.slice(0, sayi).map((u, i) => {
    const gun = Math.floor((simdi - u.joinedAt) / (1000 * 60 * 60 * 24));
    const madalya = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
    return `${madalya} <@${u.id}> — **${gun}** gün`;
  }).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(`🏆 En Uzun Süreli ${sayi} Üye`)
    .setColor(0xF1C40F)
    .setDescription(topListe)
    .setFooter({ text: `Toplam ${uyeler.length} üye` })
    .setTimestamp();

  // Etiketlenen kullanıcının sırası
  if (hedefKullanici) {
    const sira = uyeler.findIndex(u => u.id === hedefKullanici.id);
    if (sira !== -1) {
      const gun = Math.floor((simdi - hedefKullanici.joinedAt) / (1000 * 60 * 60 * 24));
      embed.addFields({
        name: `📍 ${hedefKullanici.user.username} Sırası`,
        value: `**${sira + 1}.** sırada — **${gun}** gün`,
        inline: false
      });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { data, execute };