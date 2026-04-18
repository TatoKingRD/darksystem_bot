// commands/davet.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const davetHandler = require('../handlers/davethandler');

// ─── /davet ───
const davetData = new SlashCommandBuilder()
  .setName('davet')
  .setDescription('Bir kullanıcının davet bilgilerini gösterir')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Hedef kullanıcı (boş: kendin)').setRequired(false));

async function davetExecute(interaction) {
  const hedef = interaction.options.getUser('kullanici') || interaction.user;
  const { gercek, sahte, toplam } = davetHandler.davetSayisiGetir(hedef.id);

  const embed = new EmbedBuilder()
    .setTitle(`🎟️ ${hedef.username} — Davet Bilgileri`)
    .setColor(0x5865F2)
    .setThumbnail(hedef.displayAvatarURL())
    .addFields(
      { name: '✅ Gerçek Davet', value: `**${gercek}**`, inline: true },
      { name: '❌ Sahte Davet', value: `**${sahte}**`, inline: true },
      { name: '📊 Toplam', value: `**${toplam}**`, inline: true },
    )
    .setFooter({ text: 'Sahte = davetli 10 dk içinde çıkan' })
    .setTimestamp();

  // Sonraki odul kac davet sonra?
  const oduller = davetHandler.odulListesi();
  const sonraki = oduller.find(o => gercek < o.adet);
  if (sonraki) {
    embed.addFields({
      name: '🎁 Sonraki Ödül',
      value: `${sonraki.adet} davete ulaşınca: <@&${sonraki.rolId}> rolü (${sonraki.adet - gercek} davet kaldı)`,
      inline: false,
    });
  }

  await interaction.reply({ embeds: [embed] });
}

// ─── /davetlerim ───
const davetlerimData = new SlashCommandBuilder()
  .setName('davetlerim')
  .setDescription('Davet ettiğin son kişileri gösterir');

async function davetlerimExecute(interaction) {
  const liste = davetHandler.davetEdilenlerGetir(interaction.user.id);
  if (!liste.length) {
    return interaction.reply({
      content: '📭 Henüz kimseyi davet etmemişsin. Sunucu linkini arkadaşlarına gönder!',
      ephemeral: true,
    });
  }

  // ID -> kullanici adi
  const satirlar = [];
  for (const e of liste.slice(-15).reverse()) {
    const k = await interaction.client.users.fetch(e.id).catch(() => null);
    const ad = k ? k.username : `ID:${e.id}`;
    const tarih = `<t:${Math.floor(e.zaman / 1000)}:R>`;
    const durum = e.sahte ? '❌ sahte' : '✅';
    satirlar.push(`${durum} **${ad}** — ${tarih}`);
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎟️ Davetlerin (Son ${satirlar.length})`)
    .setColor(0x5865F2)
    .setDescription(satirlar.join('\n'))
    .setThumbnail(interaction.user.displayAvatarURL())
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// ─── /davetlider ───
const davetliderData = new SlashCommandBuilder()
  .setName('davetlider')
  .setDescription('Sunucuda en çok davet yapanları listeler')
  .addIntegerOption(opt => opt.setName('sayi').setDescription('Kaç kişi listelensin (1-25)').setMinValue(1).setMaxValue(25).setRequired(false));

async function davetliderExecute(interaction) {
  const sayi = interaction.options.getInteger('sayi') || 10;
  const liste = davetHandler.leaderboardGetir(sayi);

  if (!liste.length) {
    return interaction.reply({ content: '📭 Henüz davet kaydı yok.', ephemeral: true });
  }

  const madalyalar = ['🥇', '🥈', '🥉'];
  const satirlar = [];
  for (let i = 0; i < liste.length; i++) {
    const e = liste[i];
    const k = await interaction.client.users.fetch(e.id).catch(() => null);
    const ad = k ? k.username : `ID:${e.id}`;
    const rank = madalyalar[i] || `**${i + 1}.**`;
    const sahteMetni = e.sahte > 0 ? ` _(${e.sahte} sahte)_` : '';
    satirlar.push(`${rank} **${ad}** — ${e.gercek} davet${sahteMetni}`);
  }

  const embed = new EmbedBuilder()
    .setTitle('🏆 Davet Liderleri')
    .setColor(0xF1C40F)
    .setDescription(satirlar.join('\n'))
    .setFooter({ text: 'Arkadaşını çağır, listede yüksel!' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ─── /davetodul ───
const davetodulData = new SlashCommandBuilder()
  .setName('davetodul')
  .setDescription('Davet ödül sistemini gösterir (kaç davete ne rol verilir)');

async function davetodulExecute(interaction) {
  const oduller = davetHandler.odulListesi();
  if (!oduller.length) {
    return interaction.reply({
      content: '📭 Henüz davet ödül sistemi kurulmamış.\n' +
        '_Sahibi `DAVET_ODUL_1_ADET` ve `DAVET_ODUL_1_ROL_ID` env variable\'larını ekleyerek kurabilir._',
      ephemeral: true,
    });
  }

  const satirlar = oduller.map(o => `• **${o.adet}** davet → <@&${o.rolId}>`);

  const embed = new EmbedBuilder()
    .setTitle('🎁 Davet Ödül Sistemi')
    .setColor(0xE67E22)
    .setDescription('Arkadaşını davet ederek bu rolleri kazan:\n\n' + satirlar.join('\n'))
    .setFooter({ text: 'Sahte davetler sayılmaz.' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

const commands = [
  { data: davetData, execute: davetExecute },
  { data: davetlerimData, execute: davetlerimExecute },
  { data: davetliderData, execute: davetliderExecute },
  { data: davetodulData, execute: davetodulExecute },
];

module.exports = { commands };
