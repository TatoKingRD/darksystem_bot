const { Client, GatewayIntentBits, Partials, ActivityType, REST, Routes, Collection } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildInvites,
  ],
  partials: [Partials.Channel, Partials.Message]
});

// Paylaşılan kayıt verisi
const kayitVerisi = new Map();
client.kayitVerisi = kayitVerisi;

// Komutları yükle
client.commands = new Collection();

const commandModules = [
  require('./commands/takim'),
  require('./commands/yardim'),
  require('./commands/profil'),
  require('./commands/kacgun'),
  require('./commands/topkacgun'),
  require('./commands/sil'),
  require('./commands/rankguncelle'),
  ...require('./commands/sustur').commands,
  ...require('./commands/eglence').commands,
  ...require('./commands/anket'),
  ...require('./commands/uyari').commands,
  ...require('./commands/rol').commands,
  ...require('./commands/tekrarla').commands,
  ...require('./commands/yonetim').commands,
  ...require('./commands/davetcommand').commands,
];

const allCommandData = [];
for (const cmd of commandModules) {
  client.commands.set(cmd.data.name, cmd);
  allCommandData.push(cmd.data.toJSON());
}

// Cooldown sistemi
const cooldowns = new Map();
const COOLDOWN_SURE = 3000; // 3 saniye

// Interaction handler
const interactionHandler = require('./handlers/interactionHandler');
client.on('interactionCreate', (interaction) => {
  if (!interaction.isChatInputCommand()) return interactionHandler(client, interaction);

  const userId = interaction.user.id;
  const simdi = Date.now();
  const sonKullanim = cooldowns.get(userId) || 0;

  if (simdi - sonKullanim < COOLDOWN_SURE) {
    const kalanSn = ((COOLDOWN_SURE - (simdi - sonKullanim)) / 1000).toFixed(1);
    return interaction.reply({ content: `⏳ Çok hızlı! **${kalanSn}** saniye bekle.`, ephemeral: true });
  }

  cooldowns.set(userId, simdi);
  interactionHandler(client, interaction);
});

// Kelime oyunu handler
const kelimeOyunu = require('./handlers/kelimeOyunu');
// AI Asistan handler
const aiAsistan = require('./handlers/aiAsistan');
client.on('messageCreate', (message) => {
  kelimeOyunu(message);
  aiAsistan(message, client).catch(err => console.error('AI Asistan hatası:', err));
});

// Yeni üye
const hosgeldinGonder = require('./commands/hosgeldin');
const dmHatirlatmaBaslat = require('./commands/dmHatirlatma');
const davetHandler = require('./handlers/davethandler');

client.on('guildMemberAdd', async (member) => {
  if (process.env.KAYITSIZ_ROL_ID) await member.roles.add(process.env.KAYITSIZ_ROL_ID).catch(console.error);
  await hosgeldinGonder(member);
  dmHatirlatmaBaslat(member);
  // Davet takibi
  await davetHandler.uyeKatildi(member).catch(err => console.error('[davet] uyeKatildi:', err));
});

// Üye ayrıldığında
const gorusuruzGonder = require('./handlers/gorusuruz');
client.on('guildMemberRemove', async (member) => {
  await davetHandler.uyeAyrildi(member).catch(err => console.error('[davet] uyeAyrildi:', err));
  await gorusuruzGonder(member).catch(err => console.error('[gorusuruz] hata:', err));
});

// Davet olusturuldu/silindi - cache'i guncelle
client.on('inviteCreate', async (invite) => {
  if (invite.guild) await davetHandler.davetleriCachele(invite.guild).catch(() => {});
});
client.on('inviteDelete', async (invite) => {
  if (invite.guild) await davetHandler.davetleriCachele(invite.guild).catch(() => {});
});

client.once('ready', async () => {
  console.log(`Bot aktif: ${client.user.tag}`);

  // Slash komutlarını kaydet (guild bazlı = anlık)
  const rest = new REST().setToken(process.env.BOT_TOKEN);
  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
      { body: allCommandData }
    );
    console.log(`${allCommandData.length} slash komut kaydedildi.`);
  } catch (err) {
    console.error('Slash komut kaydı hatası:', err);
  }

  // ─── ROTASYONLU STATUS ───
  // Sahip ismini al (env'den ID, ondan username)
  const sahipIdler = (process.env.AI_SAHIP_ID || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  let sahipAdi = 'Bilinmiyor';
  if (sahipIdler.length > 0) {
    try {
      const sahip = await client.users.fetch(sahipIdler[0]).catch(() => null);
      if (sahip) sahipAdi = sahip.username;
    } catch {}
  }

  const statusListesi = [
    { name: 'AniZen TR 🌸',                    type: ActivityType.Watching },
    { name: '/yardim • komutlar için',         type: ActivityType.Playing },
    { name: `👑 Sahibi: ${sahipAdi}`,           type: ActivityType.Listening },
    { name: () => {
        const uyeSayisi = client.guilds.cache.reduce((t, g) => t + (g.memberCount || 0), 0);
        return `${client.guilds.cache.size} sunucu • ${uyeSayisi} üye`;
      }, type: ActivityType.Watching },
  ];

  let statusIndex = 0;
  const statusGuncelle = () => {
    const s = statusListesi[statusIndex % statusListesi.length];
    const name = typeof s.name === 'function' ? s.name() : s.name;
    client.user.setPresence({
      activities: [{ name, type: s.type }],
      status: 'online',
    });
    statusIndex++;
  };
  statusGuncelle();
  setInterval(statusGuncelle, 10000); // 10 saniyede bir degis

  const { arsivdenYukle } = require('./handlers/arsiv');
  for (const [, guild] of client.guilds.cache) {
    await arsivdenYukle(guild, kayitVerisi).catch(console.error);
  }

  const { gorevleriYukle } = require('./commands/tekrarla');
  await gorevleriYukle(client).catch(console.error);

  // Davet takibi baslat
  await davetHandler.baslat(client).catch(console.error);
});

client.login(process.env.BOT_TOKEN);