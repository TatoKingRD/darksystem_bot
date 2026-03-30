// commands/takim.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const rankRenkleri = {
  warrior: 0x808080, elite: 0x00AA00, master: 0x0000FF,
  grandmaster: 0x9B59B6, epic: 0xE67E22, legend: 0xF1C40F, mythic: 0xE74C3C
};

const data = new SlashCommandBuilder()
  .setName('takim')
  .setDescription('Takım arkadaşı arama ilanı oluşturur')
  .addStringOption(opt => opt
    .setName('rank')
    .setDescription('Rankın')
    .setRequired(true)
    .addChoices(
      { name: '🩶 Warrior', value: 'warrior' },
      { name: '💚 Elite', value: 'elite' },
      { name: '💙 Master', value: 'master' },
      { name: '💜 Grandmaster', value: 'grandmaster' },
      { name: '🧡 Epic', value: 'epic' },
      { name: '💛 Legend', value: 'legend' },
      { name: '❤️ Mythic', value: 'mythic' }
    ))
  .addStringOption(opt => opt
    .setName('rolum')
    .setDescription('Senin rolün')
    .setRequired(true)
    .addChoices(
      { name: '🏹 Nişancı (ADC)', value: 'Nişancı (ADC)' },
      { name: '🗡️ Suikastçı', value: 'Suikastçı' },
      { name: '⚔️ Savaşçı', value: 'Savaşçı' },
      { name: '🛡️ Tank', value: 'Tank' },
      { name: '🔮 Büyücü', value: 'Büyücü' },
      { name: '💊 Destek', value: 'Destek' }
    ))
  .addStringOption(opt => opt
    .setName('aranan_rol')
    .setDescription('Aradığın rol')
    .setRequired(true)
    .addChoices(
      { name: '🏹 Nişancı (ADC)', value: 'Nişancı (ADC)' },
      { name: '🗡️ Suikastçı', value: 'Suikastçı' },
      { name: '⚔️ Savaşçı', value: 'Savaşçı' },
      { name: '🛡️ Tank', value: 'Tank' },
      { name: '🔮 Büyücü', value: 'Büyücü' },
      { name: '💊 Destek', value: 'Destek' }
    ))
  .addStringOption(opt => opt
    .setName('koridor')
    .setDescription('Koridor (opsiyonel)')
    .setRequired(false)
    .addChoices(
      { name: '⬆️ Üst', value: 'Üst' },
      { name: '➡️ Orta', value: 'Orta' },
      { name: '↗️ Kanat', value: 'Kanat' },
      { name: '🌲 Jungler', value: 'Jungler' },
      { name: '🌀 Roaming', value: 'Roaming' }
    ));

async function execute(interaction, client) {
  const rank = interaction.options.getString('rank');
  const kendiRol = interaction.options.getString('rolum');
  const arananRol = interaction.options.getString('aranan_rol');
  const koridor = interaction.options.getString('koridor');

  const kayitVerisi = client.kayitVerisi;
  const kayit = kayitVerisi?.get(interaction.user.id);
  const ign = kayit?.ign || null;
  const oyunId = kayit?.oyunId || null;

  const rankAdi = rank.charAt(0).toUpperCase() + rank.slice(1);
  const renk = rankRenkleri[rank] || 0x5865F2;

  const ilanFields = [
    { name: '🏅 Rank', value: rankAdi, inline: true },
    { name: '🎮 Rolüm', value: kendiRol, inline: true },
    { name: '🔍 Aranan Rol', value: arananRol, inline: true },
    { name: '👤 Oyuncu', value: `<@${interaction.user.id}>`, inline: true }
  ];
  if (koridor) ilanFields.push({ name: '🗺️ Koridor', value: koridor, inline: true });
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
      const koridorYazi = koridor ? ` **${koridor}** koridorunda` : '';
      let description = `<@${interaction.user.id}> **${rankAdi}** rankında **${kendiRol}** olarak${koridorYazi} oynuyor, **${arananRol}** arıyor — girmek isteyen yok mu? 😢\n\n`;

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
