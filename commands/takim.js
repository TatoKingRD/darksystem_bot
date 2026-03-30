// commands/takim.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const rankRenkleri = {
  epik: 0xE67E22, efsane: 0xF1C40F, mistik: 0xE74C3C,
  sanliMistik: 0xC0392B, mistikZafer: 0x8E44AD, yuceMistik: 0xF39C12
};

const rolSecenekleri = [
  { name: '🏹 ADC (Gold Koridor)', value: 'ADC (Gold Koridor)' },
  { name: '🗡️ Jungler', value: 'Jungler' },
  { name: '⚔️ EXP Koridor', value: 'EXP Koridor' },
  { name: '🛡️ Roam', value: 'Roam' },
  { name: '🔮 Mid', value: 'Mid' },
];

const data = new SlashCommandBuilder()
  .setName('takim')
  .setDescription('Takım arkadaşı arama ilanı oluşturur')
  .addStringOption(opt => opt
    .setName('rank')
    .setDescription('Rankın')
    .setRequired(true)
    .addChoices(
      { name: '🧡 Epik', value: 'epik' },
      { name: '💛 Efsane', value: 'efsane' },
      { name: '❤️ Mistik', value: 'mistik' },
      { name: '✨ Şanlı Mistik', value: 'sanliMistik' },
      { name: '💜 Mistik Zafer', value: 'mistikZafer' },
      { name: '👑 Yüce Mistik', value: 'yuceMistik' }
    ))
  .addStringOption(opt => opt
    .setName('rolum')
    .setDescription('Senin rolün')
    .setRequired(true)
    .addChoices(...rolSecenekleri))
  .addStringOption(opt => opt
    .setName('aranan_rol_1')
    .setDescription('Aradığın rol (1)')
    .setRequired(true)
    .addChoices(...rolSecenekleri))
  .addStringOption(opt => opt
    .setName('aranan_rol_2')
    .setDescription('Aradığın rol (2) (opsiyonel)')
    .setRequired(false)
    .addChoices(...rolSecenekleri))
  .addStringOption(opt => opt
    .setName('aranan_rol_3')
    .setDescription('Aradığın rol (3) (opsiyonel)')
    .setRequired(false)
    .addChoices(...rolSecenekleri))
  .addStringOption(opt => opt
    .setName('aranan_rol_4')
    .setDescription('Aradığın rol (4) (opsiyonel)')
    .setRequired(false)
    .addChoices(...rolSecenekleri))


async function execute(interaction, client) {
  const rank = interaction.options.getString('rank');
  const kendiRol = interaction.options.getString('rolum');

  // Aranan rolleri topla (tekrar edenleri filtrele)
  const arananRoller = [
    interaction.options.getString('aranan_rol_1'),
    interaction.options.getString('aranan_rol_2'),
    interaction.options.getString('aranan_rol_3'),
    interaction.options.getString('aranan_rol_4'),
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  const kayitVerisi = client.kayitVerisi;
  const kayit = kayitVerisi?.get(interaction.user.id);
  const ign = kayit?.ign || null;
  const oyunId = kayit?.oyunId || null;

  const rankAdlari = { epik: 'Epik', efsane: 'Efsane', mistik: 'Mistik', sanliMistik: 'Şanlı Mistik', mistikZafer: 'Mistik Zafer', yuceMistik: 'Yüce Mistik' };
  const rankAdi = rankAdlari[rank] || rank;
  const renk = rankRenkleri[rank] || 0x5865F2;

  const ilanFields = [
    { name: '🏅 Rank', value: rankAdi, inline: true },
    { name: '🎮 Rolüm', value: kendiRol, inline: true },
    { name: '🔍 Aranan Roller', value: arananRoller.join(', '), inline: true },
    { name: '👤 Oyuncu', value: `<@${interaction.user.id}>`, inline: true }
  ];
  if (ign) ilanFields.push({ name: '🎯 IGN', value: ign, inline: true });
  if (oyunId) ilanFields.push({ name: '🆔 Oyun ID', value: oyunId, inline: true });

  const ilan = new EmbedBuilder()
    .setTitle('🎮 Takım Arkadaşı Aranıyor!')
    .setColor(renk)
    .setDescription(`<@${interaction.user.id}> takım arıyor! İlgilenenler DM atsın veya bu mesajı yanıtlasın.`)
    .addFields(ilanFields)
    .setFooter({ text: 'İlgilenenler bu mesajı yanıtlayabilir' })
    .setTimestamp();

  const takimRolId = process.env.TAKIM_ROL_ID;

  await interaction.reply({
    content: takimRolId ? `<@&${takimRolId}>` : null,
    embeds: [ilan],
    allowedMentions: { roles: takimRolId ? [takimRolId] : [] }
  });

  // Genel kanala bildirim
  if (process.env.GENEL_KANAL_ID) {
    const genelKanal = interaction.guild.channels.cache.get(process.env.GENEL_KANAL_ID);
    if (genelKanal && genelKanal.id !== interaction.channelId) {
      const koridorYazi = '';
      let description = `<@${interaction.user.id}> **${rankAdi}** rankında **${kendiRol}** olarak${koridorYazi} oynuyor, **${arananRoller.join(' / ')}** arıyor — girmek isteyen yok mu? 😢\n\n`;

      if (ign || oyunId) {
        description += `Eklemek için:\n`;
        if (ign) description += `🎯 **IGN:** ${ign}\n`;
        if (oyunId) description += `🆔 **Oyun ID:** ${oyunId}\n`;
        description += `\n`;
      }
      description += `👉 <#${interaction.channelId}>`;

      await genelKanal.send({
        content: takimRolId ? `<@&${takimRolId}>` : null,
        embeds: [new EmbedBuilder().setColor(renk).setDescription(description).setTimestamp()],
        allowedMentions: { roles: takimRolId ? [takimRolId] : [] }
      });
    }
  }
}

module.exports = { data, execute };