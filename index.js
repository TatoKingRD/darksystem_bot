const { Client, GatewayIntentBits, Partials, ActivityType, REST, Routes, Collection } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
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
  require('./commands/rankguncelle'),
  ...require('./commands/sustur').commands,
  ...require('./commands/eglence').commands,
  ...require('./commands/anket'),
  ...require('./commands/uyari').commands,
  ...require('./commands/rol').commands,
  ...require('./commands/tekrarla').commands,
  ...require('./commands/yonetim').commands,
];

const allCommandData = [];
for (const cmd of commandModules) {
  client.commands.set(cmd.data.name, cmd);
  allCommandData.push(cmd.data.toJSON());
}

// Interaction handler
const interactionHandler = require('./handlers/interactionHandler');
client.on('interactionCreate', (interaction) => interactionHandler(client, interaction));

// Kelime oyunu handler
const kelimeOyunu = require('./handlers/kelimeOyunu');
client.on('messageCreate', (message) => kelimeOyunu(message));

// Yeni üye
const hosgeldinGonder = require('./commands/hosgeldin');
const dmHatirlatmaBaslat = require('./commands/dmHatirlatma');

client.on('guildMemberAdd', async (member) => {
  if (process.env.KAYITSIZ_ROL_ID) await member.roles.add(process.env.KAYITSIZ_ROL_ID).catch(console.error);
  await hosgeldinGonder(member);
  dmHatirlatmaBaslat(member);
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

  client.user.setPresence({
    activities: [{
      name: 'Mobile Legends TR #TURNUVA',
      type: ActivityType.Playing,
      state: 'Sunucuyu Bekliyor 🎮'
    }],
    status: 'online'
  });

  const { arsivdenYukle } = require('./handlers/arsiv');
  for (const [, guild] of client.guilds.cache) {
    await arsivdenYukle(guild, kayitVerisi).catch(console.error);
  }

  const { gorevleriYukle } = require('./commands/tekrarla');
  await gorevleriYukle(client).catch(console.error);
});

client.login(process.env.BOT_TOKEN);