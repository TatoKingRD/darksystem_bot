const { Client, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message]
});

// Paylaşılan kayıt verisi (tüm modüller bu Map'i kullanır)
const kayitVerisi = new Map();
client.kayitVerisi = kayitVerisi;

// Handler'ları yükle
const messageHandler = require('./handlers/messageHandler');
const interactionHandler = require('./handlers/interactionHandler');

client.on('messageCreate', (message) => messageHandler(client, message));
client.on('interactionCreate', (interaction) => interactionHandler(client, interaction));

const hosgeldinGonder = require('./commands/hosgeldin');
const dmHatirlatmaBaşlat = require('./commands/dmHatirlatma');

client.on('guildMemberAdd', async (member) => {
  if (process.env.KAYITSIZ_ROL_ID) await member.roles.add(process.env.KAYITSIZ_ROL_ID).catch(console.error);
  await hosgeldinGonder(member);
  dmHatirlatmaBaşlat(member);
});

client.once('ready', async () => {
  console.log(`Bot aktif: ${client.user.tag}`);
  const { arsivdenYukle } = require('./handlers/arsiv');
  for (const [, guild] of client.guilds.cache) {
    await arsivdenYukle(guild, kayitVerisi).catch(console.error);
  }
});

client.login(process.env.BOT_TOKEN);
