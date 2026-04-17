// commands/eglence.js
// /hero ve /duello komutları
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const heroes = {
  'Tank': ['Akai', 'Alice', 'Atlas', 'Baxia', 'Belerick', 'Carmilla', 'Chip', 'Edith', 'Esmeralda', 'Franco', 'Gatotkaca', 'Gloo', 'Grock', 'Hylos', 'Johnson', 'Khufra', 'Lolita', 'Minotaur', 'Tigreal', 'Uranus', 'Barats', 'Fredrinn', 'Hilda', 'Ruby'],
  'Jungler': ['Aamon', 'Alucard', 'Benedetta', 'Fanny', 'Gusion', 'Hanzo', 'Harley', 'Hayabusa', 'Helcurt', 'Joy', 'Julian', 'Karina', 'Lancelot', 'Ling', 'Mathilda', 'Natalia', 'Saber', 'Yi Sun-shin', 'Zilong', 'Paquito', 'Arlott', 'Nolan', 'Fredrinn'],
  'EXP': ['Aldous', 'Alpha', 'Argus', 'Aulus', 'Badang', 'Balmond', 'Bane', 'Chou', 'Cici', 'Dyrroth', 'Freya', 'Guinevere', 'Hilda', 'Jawhead', 'Khaleed', 'Lapu-Lapu', 'Leomord', 'Martis', 'Masha', 'Minsitthar', 'Paquito', 'Phoveus', 'Roger', 'Ruby', 'Silvanna', 'Sora', 'Sun', 'Terizla', 'Thamuz', 'X.Borg', 'Yin', 'Yu Zhong'],
  'Gold': ['Beatrix', 'Brody', 'Bruno', 'Claude', 'Clint', 'Granger', 'Hanabi', 'Irithel', 'Ixia', 'Karrie', 'Kimmy', 'Layla', 'Melissa', 'Miya', 'Moskov', 'Natan', 'Popol and Kupa', 'Wanwan', 'Yi Sun-shin', 'Edith'],
  'Mid': ['Aurora', 'Cecilion', "Chang'e", 'Cyclops', 'Esmeralda', 'Eudora', 'Faramis', 'Gord', 'Harith', 'Harley', 'Kadita', 'Kagura', 'Luo Yi', 'Lunox', 'Lylia', 'Nana', 'Odette', 'Pharsa', 'Selena', 'Vale', 'Valentina', 'Valir', 'Vexana', 'Xavier', 'Yve', 'Zhask', 'Zhuxin', 'Novaria'],
  'Roam': ['Angela', 'Carmilla', 'Diggie', 'Estes', 'Faramis', 'Floryn', 'Johnson', 'Kaja', 'Lolita', 'Mathilda', 'Minotaur', 'Nana', 'Rafaela', 'Tigreal', 'Atlas', 'Chip'],
};

const rolEmojileri = {
  'Tank': '🛡️',
  'Jungler': '🌲',
  'EXP': '⚔️',
  'Gold': '🏹',
  'Mid': '🔮',
  'Roam': '🛡️',
};

// ─── /hero ───
const heroData = new SlashCommandBuilder()
  .setName('hero')
  .setDescription('Rastgele bir karakter/hero önerir')
  .addStringOption(opt => opt
    .setName('rol')
    .setDescription('Rol seç (opsiyonel)')
    .setRequired(false)
    .addChoices(
      { name: '🛡️ Tank', value: 'Tank' },
      { name: '🌲 Jungler', value: 'Jungler' },
      { name: '⚔️ EXP Koridor', value: 'EXP' },
      { name: '🏹 Gold Koridor (ADC)', value: 'Gold' },
      { name: '🔮 Mid', value: 'Mid' },
      { name: '🤝 Roam', value: 'Roam' },
    ));

async function heroExecute(interaction) {
  const rol = interaction.options.getString('rol');
  const secilenRol = rol || Object.keys(heroes)[Math.floor(Math.random() * Object.keys(heroes).length)];
  const liste = heroes[secilenRol];
  const hero = liste[Math.floor(Math.random() * liste.length)];
  const emoji = rolEmojileri[secilenRol];

  await interaction.reply({ embeds: [new EmbedBuilder()
    .setTitle('🎮 Hero Önerisi')
    .setColor(0x5865F2)
    .setDescription(`**${hero}** oynamalısın!`)
    .addFields(
      { name: `${emoji} Rol`, value: secilenRol === 'EXP' ? 'EXP Koridor' : secilenRol === 'Gold' ? 'Gold Koridor (ADC)' : secilenRol, inline: true },
    )
    .setFooter({ text: 'İyi oyunlar! 🎮' })
    .setTimestamp()]
  });
}

// ─── /duello ───
const duelloData = new SlashCommandBuilder()
  .setName('duello')
  .setDescription('Başka bir kullanıcıya düello meydan oku!')
  .addUserOption(opt => opt.setName('rakip').setDescription('Düello yapılacak kullanıcı').setRequired(true));

const duelloSonuclari = [
  '{kazanan} rakibini tek atışla devirdi! 🎯',
  '{kazanan} son anda kaçıp karşı atak yaptı! ⚡',
  '{kazanan} ultimate attı, {kaybeden} anında öldü! 💀',
  '{kazanan} mekanı okudu ve zaferle çıktı! 🏆',
  '{kaybeden} kaçmaya çalıştı ama {kazanan} yakaladı! 🏃',
  '{kazanan} triple kill aldı! {kaybeden} şans yok! 🔥',
  '{kazanan} 1v1\'de dominasyon kurdu! 👑',
  '{kaybeden} respawn\'da takılı kaldı, {kazanan} kazandı! 😂',
];

async function duelloExecute(interaction) {
  const rakip = interaction.options.getMember('rakip');
  const meydan = interaction.member;

  if (!rakip) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });
  if (rakip.id === meydan.id) return interaction.reply({ content: '❌ Kendinle düello yapamazsın!', ephemeral: true });
  if (rakip.user.bot) return interaction.reply({ content: '❌ Botlarla düello yapılamaz!', ephemeral: true });

  const kazanan = Math.random() < 0.5 ? meydan : rakip;
  const kaybeden = kazanan.id === meydan.id ? rakip : meydan;

  const sonucSablonu = duelloSonuclari[Math.floor(Math.random() * duelloSonuclari.length)];
  const sonuc = sonucSablonu
    .replace(/{kazanan}/g, `<@${kazanan.id}>`)
    .replace(/{kaybeden}/g, `<@${kaybeden.id}>`);

  await interaction.reply({ embeds: [new EmbedBuilder()
    .setTitle('⚔️ Düello Sonucu!')
    .setColor(kazanan.id === meydan.id ? 0x57F287 : 0xE74C3C)
    .addFields(
      { name: '⚔️ Meydan Okuyan', value: `<@${meydan.id}>`, inline: true },
      { name: 'vs', value: '⚡', inline: true },
      { name: '🎯 Rakip', value: `<@${rakip.id}>`, inline: true },
      { name: '🏆 Kazanan', value: `<@${kazanan.id}>`, inline: false },
      { name: '📖 Sonuç', value: sonuc, inline: false },
    )
    .setFooter({ text: 'Şans seninle olsun! 🎮' })
    .setTimestamp()]
  });
}

const commands = [
  { data: heroData, execute: heroExecute },
  { data: duelloData, execute: duelloExecute },
];

module.exports = { commands };