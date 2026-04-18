// commands/tekrarla.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const aktifGorevler = new Map(); // komutAdi => { interval, kanal, sure, baslatan, baslangic, mesajId }

function isMod(member) {
  return process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
}

// Görev kanalına kayıt mesajı gönder
async function kanalaKaydet(client, komutAdi, kanalId, sure, baslatanId, baslangic) {
  const gorevKanal = client.channels.cache.get(process.env.GOREV_KANAL_ID);
  if (!gorevKanal) return null;

  // Aynı komut için eski mesaj varsa sil
  const eskiGorev = aktifGorevler.get(komutAdi);
  if (eskiGorev?.mesajId) {
    await gorevKanal.messages.delete(eskiGorev.mesajId).catch(() => {});
  }

  const msg = await gorevKanal.send({ embeds: [new EmbedBuilder()
    .setTitle('🔁 Aktif Görev')
    .setColor(0x57F287)
    .addFields(
      { name: 'komut', value: komutAdi, inline: true },
      { name: 'kanalId', value: kanalId, inline: true },
      { name: 'sure', value: `${sure}`, inline: true },
      { name: 'baslatan', value: baslatanId, inline: true },
      { name: 'baslangic', value: `${baslangic}`, inline: true },
    )
    .setFooter({ text: 'GOREV_KAYIT' })
  ]}).catch(() => null);

  return msg?.id || null;
}

// Görev kanalından kaydı sil
async function kanalданSil(client, mesajId) {
  if (!mesajId) return;
  const gorevKanal = client.channels.cache.get(process.env.GOREV_KANAL_ID);
  if (!gorevKanal) return;
  await gorevKanal.messages.delete(mesajId).catch(() => {});
}

// Slash komut ID cache: komutAdi -> "<komut:ID>"
const komutLinkCache = new Map();

// Disboard gibi baska botlarin komut ID'lerini ara
async function komutLinkiBul(client, kanal, komutAdi) {
  if (komutLinkCache.has(komutAdi)) return komutLinkCache.get(komutAdi);

  const addCache = (val) => { komutLinkCache.set(komutAdi, val); return val; };

  // 1) Kendi botumuzun komutlari
  try {
    const appCommands = await client.application.commands.fetch().catch(() => null);
    if (appCommands) {
      const bulunan = appCommands.find(c => c.name === komutAdi);
      if (bulunan) return addCache(`</${komutAdi}:${bulunan.id}>`);
    }
  } catch {}

  // 2) Guild'in diger botlarinin komutlari (disboard vs.)
  try {
    const guild = kanal.guild;
    if (guild) {
      const guildCommands = await guild.commands.fetch().catch(() => null);
      if (guildCommands) {
        const bulunan = guildCommands.find(c => c.name === komutAdi);
        if (bulunan) return addCache(`</${komutAdi}:${bulunan.id}>`);
      }
    }
  } catch {}

  // Bulunamadiysa sadece metinsel goster
  return addCache(`\`/${komutAdi}\``);
}

function gorevBaslat(komutAdi, kanal, sure, baslatanId, baslangic, mesajId = null) {
  if (aktifGorevler.has(komutAdi)) {
    clearInterval(aktifGorevler.get(komutAdi).interval);
    aktifGorevler.delete(komutAdi);
  }

  async function hatirlatmaGonder() {
    try {
      const modRolId = process.env.MODERATOR_ROL_ID;
      const asisRolId = process.env.ASISTAN_ROL_ID;
      const pingParcalar = [];
      const izinVerilen = [];
      if (modRolId) { pingParcalar.push(`<@&${modRolId}>`); izinVerilen.push(modRolId); }
      if (asisRolId) { pingParcalar.push(`<@&${asisRolId}>`); izinVerilen.push(asisRolId); }

      const komutLink = await komutLinkiBul(kanal.client, kanal, komutAdi);

      await kanal.send({
        content: pingParcalar.join(' '),
        embeds: [new EmbedBuilder()
          .setTitle('🔔 Hatırlatma!')
          .setColor(0xF39C12)
          .setDescription(`${komutLink} komutunu çalıştırma zamanı geldi!\n\n👆 Yukarıdaki komuta tıklayarak hemen çalıştırabilirsin.`)
          .addFields(
            { name: '⏱️ Tekrar Süresi', value: `${sure} dakikada bir`, inline: true },
            { name: '▶️ Başlatan', value: `<@${baslatanId}>`, inline: true }
          )
          .setFooter({ text: 'Durdurmak için: /durdur ' + komutAdi })
          .setTimestamp()],
        allowedMentions: { roles: izinVerilen }
      });
    } catch (err) {
      console.error(`Hatırlatma gönderilemedi (${komutAdi}):`, err);
    }
  }

  const interval = setInterval(hatirlatmaGonder, sure * 60 * 1000);
  aktifGorevler.set(komutAdi, { interval, kanal, sure, baslatan: baslatanId, baslangic, mesajId });
}

// Bot restart'ta görev kanalından görevleri yükle
async function gorevleriYukle(client) {
  const gorevKanal = client.channels.cache.get(process.env.GOREV_KANAL_ID);
  if (!gorevKanal) { console.log('GOREV_KANAL_ID bulunamadı, görevler yüklenemedi.'); return; }

  let yuklenen = 0;
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const mesajlar = await gorevKanal.messages.fetch(options).catch(() => null);
    if (!mesajlar || mesajlar.size === 0) break;

    for (const [mesajId, msg] of mesajlar) {
      if (!msg.embeds.length || msg.embeds[0].footer?.text !== 'GOREV_KAYIT') continue;

      const fields = {};
      for (const f of msg.embeds[0].fields) fields[f.name] = f.value;

      const komutAdi = fields['komut'];
      const kanalId = fields['kanalId'];
      const sure = parseInt(fields['sure']);
      const baslatanId = fields['baslatan'];
      const baslangic = parseInt(fields['baslangic']);

      if (!komutAdi || !kanalId || !sure) continue;
      if (aktifGorevler.has(komutAdi)) continue;

      const kanal = await client.channels.fetch(kanalId).catch(() => null);
      if (!kanal) { console.log(`Görev kanalı bulunamadı: ${komutAdi}`); continue; }

      gorevBaslat(komutAdi, kanal, sure, baslatanId, baslangic, mesajId);
      yuklenen++;
    }

    if (mesajlar.size < 100) break;
    lastId = mesajlar.last().id;
  }

  if (yuklenen > 0) console.log(`${yuklenen} tekrarla görevi yeniden başlatıldı.`);
}

// ─── /tekrarla ───
const tekrarlaData = new SlashCommandBuilder()
  .setName('tekrarla')
  .setDescription('Belirli aralıklarla hatırlatma mesajı gönderir [Moderatör]')
  .addStringOption(opt => opt.setName('komut').setDescription('Hatırlatılacak komut adı (örn: bump)').setRequired(true))
  .addIntegerOption(opt => opt.setName('dakika').setDescription('Kaç dakikada bir hatırlatılsın?').setRequired(true).setMinValue(1));

async function tekrarlaExecute(interaction) {
  if (!isMod(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const komutAdi = interaction.options.getString('komut').toLowerCase().replace('/', '');
  const sure = interaction.options.getInteger('dakika');
  const kanal = interaction.channel;
  const baslangic = Math.floor(Date.now() / 1000);

  const mesajId = await kanalaKaydet(interaction.client, komutAdi, kanal.id, sure, interaction.user.id, baslangic);
  gorevBaslat(komutAdi, kanal, sure, interaction.user.id, baslangic, mesajId);

  await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
    .setTitle('✅ Görev Başlatıldı')
    .setColor(0x57F287)
    .addFields(
      { name: '📌 Komut', value: `/${komutAdi}`, inline: true },
      { name: '⏱️ Süre', value: `${sure} dakikada bir`, inline: true },
      { name: '📢 Kanal', value: `<#${kanal.id}>`, inline: true }
    )
    .setTimestamp()]
  });
}

// ─── /durdur ───
const durdurData = new SlashCommandBuilder()
  .setName('durdur')
  .setDescription('Aktif hatırlatmayı durdurur [Moderatör]')
  .addStringOption(opt => opt.setName('komut').setDescription('Durdurulacak komut adı').setRequired(true));

async function durdurExecute(interaction) {
  if (!isMod(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const komutAdi = interaction.options.getString('komut').toLowerCase().replace('/', '');
  if (!aktifGorevler.has(komutAdi)) return interaction.reply({ content: `❌ \`${komutAdi}\` için aktif görev bulunamadı.`, ephemeral: true });

  const gorev = aktifGorevler.get(komutAdi);
  clearInterval(gorev.interval);
  await kanalданSil(interaction.client, gorev.mesajId);
  aktifGorevler.delete(komutAdi);

  await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
    .setTitle('⏹️ Görev Durduruldu')
    .setColor(0xFF0000)
    .setDescription(`\`/${komutAdi}\` hatırlatması durduruldu.`)
    .setTimestamp()]
  });
}

// ─── /gorevler ───
const gorevlerData = new SlashCommandBuilder()
  .setName('gorevler')
  .setDescription('Aktif hatırlatma görevlerini listeler [Moderatör]');

async function gorevlerExecute(interaction) {
  if (!isMod(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  if (aktifGorevler.size === 0) return interaction.reply({ content: '📋 Şu an aktif görev yok.', ephemeral: true });

  const liste = [...aktifGorevler.entries()].map(([ad, g]) =>
    `**/${ad}** — her ${g.sure} dk — <#${g.kanal.id}> — <@${g.baslatan}> başlattı`
  ).join('\n');

  await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
    .setTitle('📋 Aktif Görevler')
    .setColor(0x5865F2)
    .setDescription(liste)
    .setTimestamp()]
  });
}

const commands = [
  { data: tekrarlaData, execute: tekrarlaExecute },
  { data: durdurData, execute: durdurExecute },
  { data: gorevlerData, execute: gorevlerExecute },
];

module.exports = { commands, gorevleriYukle };
