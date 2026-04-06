// commands/sil.js
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('sil')
  .setDescription('Kanaldaki mesajları siler [Yetkili]')
  .addIntegerOption(opt => opt
    .setName('sayi')
    .setDescription('Kaç mesaj silinsin?')
    .setRequired(true)
    .setMinValue(1)
  );

async function execute(interaction) {
  const yetkili = (process.env.MODERATOR_ROL_ID
    ? interaction.member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : interaction.member.permissions.has('Administrator')) ||
    (process.env.ASISTAN_ROL_ID ? interaction.member.roles.cache.has(process.env.ASISTAN_ROL_ID) : false);

  if (!yetkili) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const sayi = interaction.options.getInteger('sayi');
  await interaction.deferReply({ ephemeral: true });

  let silinenSayisi = 0;
  let kalan = sayi;

  while (kalan > 0) {
    const alinacak = Math.min(kalan, 100);
    const mesajlar = await interaction.channel.messages.fetch({ limit: alinacak }).catch(() => null);
    if (!mesajlar || mesajlar.size === 0) break;

    // 14 günden yeni olanları toplu sil
    const yeni = mesajlar.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
    const eski = mesajlar.filter(m => Date.now() - m.createdTimestamp >= 14 * 24 * 60 * 60 * 1000);

    if (yeni.size > 0) {
      const silinen = await interaction.channel.bulkDelete(yeni, true).catch(() => null);
      if (silinen) silinenSayisi += silinen.size;
    }

    // Eski mesajları tek tek sil
    for (const [, msg] of eski) {
      await msg.delete().catch(() => {});
      silinenSayisi++;
      await new Promise(r => setTimeout(r, 300)); // rate limit için bekle
    }

    kalan -= mesajlar.size;
    if (mesajlar.size < alinacak) break;
  }

  await interaction.editReply({ content: `✅ **${silinenSayisi}** mesaj silindi.` });
}

module.exports = { data, execute };