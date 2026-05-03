// commands/eglence.js
const https = require('https');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// ─── KOMUT TANIMLARI ───
const ETKILESIMLI_KOMUTLAR = [
  { ad: 'kiss',     kategori: 'kiss',     aciklama: 'Bir kullanıcıyı öper',              fiilKendi: 'öptü',          fiilKarsi: 'öptün',          renk: 0xFF69B4, emoji: '💋' },
  { ad: 'hug',      kategori: 'hug',      aciklama: 'Bir kullanıcıya sarılır',           fiilKendi: 'sarıldı',       fiilKarsi: 'sarıldın',       renk: 0xFFB6C1, emoji: '🤗' },
  { ad: 'cuddle',   kategori: 'cuddle',   aciklama: 'Bir kullanıcıyla cuddle yapar',     fiilKendi: 'sarılıp uyudu', fiilKarsi: 'sarılıp uyudun', renk: 0xFFC0CB, emoji: '🥰' },
  { ad: 'pat',      kategori: 'pat',      aciklama: 'Bir kullanıcının başını okşar',     fiilKendi: 'başını okşadı', fiilKarsi: 'başını okşadın', renk: 0x87CEEB, emoji: '🤚' },
  { ad: 'poke',     kategori: 'poke',     aciklama: 'Bir kullanıcıyı dürter',            fiilKendi: 'dürttü',        fiilKarsi: 'dürttün',        renk: 0xDDA0DD, emoji: '👉' },
  { ad: 'bite',     kategori: 'bite',     aciklama: 'Bir kullanıcıyı ısırır',            fiilKendi: 'ısırdı',        fiilKarsi: 'ısırdın',        renk: 0xFF6347, emoji: '😬' },
  { ad: 'slap',     kategori: 'slap',     aciklama: 'Bir kullanıcıyı tokatlar',          fiilKendi: 'tokatladı',     fiilKarsi: 'tokatladın',     renk: 0xFF4500, emoji: '🖐️' },
  { ad: 'bonk',     kategori: 'bonk',     aciklama: 'Bir kullanıcıya bonk yapar',        fiilKendi: 'bonkladı',      fiilKarsi: 'bonkladın',      renk: 0x8B4513, emoji: '🔨' },
  { ad: 'lick',     kategori: 'lick',     aciklama: 'Bir kullanıcıyı yalar',             fiilKendi: 'yaladı',        fiilKarsi: 'yaladın',        renk: 0xFFB6C1, emoji: '👅' },
  { ad: 'nom',      kategori: 'nom',      aciklama: 'Bir kullanıcıyı yer',               fiilKendi: 'yedi',          fiilKarsi: 'yedin',          renk: 0xFFA500, emoji: '🍽️' },
  { ad: 'glomp',    kategori: 'glomp',    aciklama: 'Bir kullanıcıya atlar',             fiilKendi: 'üzerine atladı', fiilKarsi: 'üzerine atladın', renk: 0xFF1493, emoji: '💥' },
  { ad: 'yeet',     kategori: 'yeet',     aciklama: 'Bir kullanıcıyı fırlatır',          fiilKendi: 'fırlattı',      fiilKarsi: 'fırlattın',      renk: 0x9370DB, emoji: '🚀' },
  { ad: 'kick',     kategori: 'kick',     aciklama: 'Bir kullanıcıyı tekmeler',          fiilKendi: 'tekmeledi',     fiilKarsi: 'tekmeledin',     renk: 0x8B0000, emoji: '🦵' },
  { ad: 'kill',     kategori: 'kill',     aciklama: 'Bir kullanıcıyı (sembolik) öldürür',fiilKendi: 'öldürdü',       fiilKarsi: 'öldürdün',       renk: 0x000000, emoji: '💀' },
  { ad: 'bully',    kategori: 'bully',    aciklama: 'Bir kullanıcıyla dalga geçer',      fiilKendi: 'dalga geçti',   fiilKarsi: 'dalga geçtin',   renk: 0xFFD700, emoji: '😈' },
  { ad: 'highfive', kategori: 'highfive', aciklama: 'Bir kullanıcıyla beşlik çakar',     fiilKendi: 'çaktı',         fiilKarsi: 'çaktın',         renk: 0xFFA500, emoji: '🙌' },
  { ad: 'handhold', kategori: 'handhold', aciklama: 'Bir kullanıcının elini tutar',      fiilKendi: 'elini tuttu',   fiilKarsi: 'elini tuttun',   renk: 0xFFB6C1, emoji: '🤝' },
];

const TEKBASINA_KOMUTLAR = [
  { ad: 'cry',    kategori: 'cry',    aciklama: "Ağlama GIF'i gönderir",    aciklamaTr: 'ağlıyor 😢',         renk: 0x4682B4, emoji: '😢' },
  { ad: 'blush',  kategori: 'blush',  aciklama: "Utanma GIF'i gönderir",    aciklamaTr: 'utanıyor 😳',        renk: 0xFFB6C1, emoji: '😳' },
  { ad: 'smile',  kategori: 'smile',  aciklama: "Gülümseme GIF'i gönderir", aciklamaTr: 'gülümsüyor 😊',      renk: 0xFFD700, emoji: '😊' },
  { ad: 'wave',   kategori: 'wave',   aciklama: "El sallama GIF'i gönderir",aciklamaTr: 'el sallıyor 👋',     renk: 0x87CEEB, emoji: '👋' },
  { ad: 'wink',   kategori: 'wink',   aciklama: "Göz kırpma GIF'i gönderir",aciklamaTr: 'göz kırpıyor 😉',    renk: 0xDDA0DD, emoji: '😉' },
  { ad: 'dance',  kategori: 'dance',  aciklama: "Dans GIF'i gönderir",      aciklamaTr: 'dans ediyor 💃',     renk: 0xFF1493, emoji: '💃' },
  { ad: 'happy',  kategori: 'happy',  aciklama: "Mutluluk GIF'i gönderir",  aciklamaTr: 'çok mutlu 🎉',       renk: 0xFFD700, emoji: '🎉' },
  { ad: 'smug',   kategori: 'smug',   aciklama: "Smug GIF'i gönderir",      aciklamaTr: 'kendinden memnun 😏',renk: 0x9370DB, emoji: '😏' },
  { ad: 'cringe', kategori: 'cringe', aciklama: "Cringe GIF'i gönderir",    aciklamaTr: 'cringe oldu 😬',     renk: 0x808080, emoji: '😬' },
];

const GORSEL_KOMUTLARI = [
  { ad: 'waifu',   kategori: 'waifu',   aciklama: 'Rastgele bir waifu gösterir',           renk: 0xFF69B4, emoji: '✨' },
  { ad: 'neko',    kategori: 'neko',    aciklama: 'Rastgele bir neko (kedi kız) gösterir', renk: 0xFFB6C1, emoji: '🐱' },
  { ad: 'shinobu', kategori: 'shinobu', aciklama: 'Rastgele bir Shinobu gösterir',         renk: 0xFFD700, emoji: '🌸' },
  { ad: 'megumin', kategori: 'megumin', aciklama: 'Rastgele bir Megumin gösterir',         renk: 0x8B0000, emoji: '💥' },
  { ad: 'awoo',    kategori: 'awoo',    aciklama: 'Rastgele bir awoo (kurt kız) gösterir', renk: 0x808080, emoji: '🐺' },
];

// ─── WAIFU.PICS API ───
function waifuGifGetir(kategori) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.waifu.pics',
      path: `/sfw/${kategori}`,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'DarkSystemBot/1.0' },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).url || null); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

// ─── SAYAC SISTEMI (log kanalinda saklanir) ───
const sayacVerisi = new Map();
let veriYuklendi = false;

async function sayaclariYukle(client) {
  if (veriYuklendi) return;
  veriYuklendi = true;
  const guildId = client.darkConfig?.guildId;
  const repo = client.darkRepositories?.funCounters;
  if (guildId && repo) {
    for (const row of repo.loadAll(guildId)) {
      if (!sayacVerisi.has(row.user_id)) sayacVerisi.set(row.user_id, {});
      const kullanici = sayacVerisi.get(row.user_id);
      if (row.target_user_id) {
        if (!kullanici[row.command_name] || typeof kullanici[row.command_name] !== 'object') {
          kullanici[row.command_name] = {};
        }
        kullanici[row.command_name][row.target_user_id] = row.count;
      } else {
        kullanici[row.command_name] = row.count;
      }
    }
  }
  const kanalId = process.env.EGLENCE_LOG_KANAL_ID || process.env.MOD_LOG_KANAL_ID;
  if (!kanalId) {
    console.warn('[eglence] EGLENCE_LOG_KANAL_ID tanimli degil, sayaclar restart\'ta sifirlanacak.');
    return;
  }
  try {
    const kanal = await client.channels.fetch(kanalId).catch(() => null);
    if (!kanal) return;
    const mesajlar = await kanal.messages.fetch({ limit: 100 }).catch(() => null);
    if (!mesajlar) return;
    // En yeniden eskiye - ilk bulduğumuz en güncel
    const sirali = [...mesajlar.values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp);
    for (const msg of sirali) {
      if (msg.author.id !== client.user.id) continue;
      if (!msg.embeds?.[0]?.footer?.text?.startsWith('eglence-sayac:')) continue;
      try {
        const desc = msg.embeds[0].description || '';
        const m = desc.match(/```json\n([\s\S]*?)\n```/);
        if (!m) continue;
        const veri = JSON.parse(m[1]);
        for (const [kullaniciId, kullanici] of Object.entries(veri)) {
          sayacVerisi.set(kullaniciId, kullanici);
        }
        break; // En yeni kayıt yeterli
      } catch {}
    }
    console.log(`[eglence] ${sayacVerisi.size} kullanici sayaci yuklendi.`);
  } catch (e) {
    console.error('[eglence] Sayac yukleme hatasi:', e.message);
  }
}

let kayitZamanlayici = null;
function sayaclariKaydet(client) {
  persistSayaclar(client);
  if (kayitZamanlayici) return;
  kayitZamanlayici = setTimeout(async () => {
    kayitZamanlayici = null;
    const kanalId = process.env.EGLENCE_LOG_KANAL_ID || process.env.MOD_LOG_KANAL_ID;
    if (!kanalId) return;
    try {
      const kanal = await client.channels.fetch(kanalId).catch(() => null);
      if (!kanal) return;
      const veri = Object.fromEntries(sayacVerisi);
      const json = JSON.stringify(veri);
      if (json.length > 3800) {
        console.warn('[eglence] Veri cok buyuk, kayit atlandi. Boyut:', json.length);
        return;
      }

      // Tum kullanicilar icin etkilesim icin isim cozme
      const tumKullaniciIdleri = new Set();
      for (const [kullaniciId, veri2] of Object.entries(veri)) {
        tumKullaniciIdleri.add(kullaniciId);
        for (const [_komut, deger] of Object.entries(veri2)) {
          if (typeof deger === 'object') {
            for (const hedefId of Object.keys(deger)) tumKullaniciIdleri.add(hedefId);
          }
        }
      }

      // ID → kullanici adi (cache)
      const isimMap = new Map();
      for (const id of tumKullaniciIdleri) {
        try {
          const k = await client.users.fetch(id).catch(() => null);
          if (k) isimMap.set(id, k.username);
        } catch {}
      }
      const isimAl = (id) => isimMap.get(id) || id;

      // Insan okunabilir ozet
      const ozetSatirlari = [];
      for (const [kullaniciId, veri2] of Object.entries(veri)) {
        const kullaniciAdi = isimAl(kullaniciId);
        const komutSatirlari = [];
        for (const [komut, deger] of Object.entries(veri2)) {
          if (typeof deger === 'object') {
            // Etkilesim: komut -> hedef -> sayi
            const hedefler = Object.entries(deger).map(
              ([hId, s]) => `${isimAl(hId)} (${s})`
            ).join(', ');
            komutSatirlari.push(`  • **${komut}**: ${hedefler}`);
          } else if (typeof deger === 'number') {
            komutSatirlari.push(`  • **${komut}**: ${deger} kez`);
          }
        }
        if (komutSatirlari.length) {
          ozetSatirlari.push(`**${kullaniciAdi}**\n${komutSatirlari.join('\n')}`);
        }
      }
      const ozetMetin = ozetSatirlari.join('\n\n').substring(0, 1024) || 'Henuz veri yok.';

      const embed = new EmbedBuilder()
        .setTitle('📊 Eğlence Sayaç Kaydı')
        .setColor(0x5865F2)
        .setDescription('```json\n' + json + '\n```')
        .addFields({ name: '📖 Özet', value: ozetMetin, inline: false })
        .setFooter({ text: 'eglence-sayac: ' + new Date().toISOString() })
        .setTimestamp();
      await kanal.send({ embeds: [embed] }).catch(() => {});
    } catch (e) {
      console.error('[eglence] Sayac kayit hatasi:', e.message);
    }
  }, 10000);
}

function persistSayaclar(client) {
  const guildId = client.darkConfig?.guildId;
  const repo = client.darkRepositories?.funCounters;
  if (!guildId || !repo) return;
  try {
    for (const [userId, veri] of sayacVerisi.entries()) {
      for (const [komut, deger] of Object.entries(veri)) {
        if (typeof deger === 'object') {
          for (const [targetId, count] of Object.entries(deger)) {
            repo.setCount(guildId, userId, komut, targetId, count);
          }
        } else {
          repo.setCount(guildId, userId, komut, '', deger);
        }
      }
    }
  } catch (error) {
    console.error('[eglence] SQLite persist hatasi:', error.message);
  }
}

function sayacArttir(kullaniciId, komut, hedefId) {
  if (!sayacVerisi.has(kullaniciId)) sayacVerisi.set(kullaniciId, {});
  const kullanici = sayacVerisi.get(kullaniciId);
  if (hedefId) {
    if (!kullanici[komut] || typeof kullanici[komut] !== 'object') kullanici[komut] = {};
    kullanici[komut][hedefId] = (kullanici[komut][hedefId] || 0) + 1;
  } else {
    if (typeof kullanici[komut] !== 'number') kullanici[komut] = 0;
    kullanici[komut] = (kullanici[komut] || 0) + 1;
  }
}

function sayacAl(kullaniciId, komut, hedefId) {
  const v = sayacVerisi.get(kullaniciId);
  if (!v || !v[komut]) return 0;
  if (hedefId) return (typeof v[komut] === 'object') ? (v[komut][hedefId] || 0) : 0;
  return (typeof v[komut] === 'number') ? v[komut] : 0;
}

// ─── KOMUT OLUSTURUCULAR ───
function etkilesimliKomutOlustur(k) {
  const data = new SlashCommandBuilder()
    .setName(k.ad)
    .setDescription(k.aciklama)
    .addUserOption(opt => opt.setName('kullanici').setDescription('Hedef kullanıcı').setRequired(true));

  async function execute(interaction, clientParam) {
    const client = interaction.client || clientParam;
    await sayaclariYukle(client);

    const hedef = interaction.options.getUser('kullanici');
    if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });
    if (hedef.bot) return interaction.reply({ content: '❌ Botlara yapamazsın canım 😅', ephemeral: true });
    if (hedef.id === interaction.user.id) return interaction.reply({ content: `❌ Kendine \`/${k.ad}\` yapamazsın 😂`, ephemeral: true });

    await interaction.deferReply();
    const gifUrl = await waifuGifGetir(k.kategori);
    if (!gifUrl) return interaction.editReply({ content: '❌ GIF alınamadı, biraz sonra dene.' });

    sayacArttir(interaction.user.id, k.ad, hedef.id);
    sayaclariKaydet(client);
    const toplam = sayacAl(interaction.user.id, k.ad, hedef.id);

    const embed = new EmbedBuilder()
      .setColor(k.renk)
      .setDescription(`${k.emoji} **${interaction.user.username}**, **${hedef.username}** adlı kullanıcıyı ${k.fiilKendi}!\n\n_<@${hedef.id}>, <@${interaction.user.id}> seni toplam **${toplam}** kez ${k.fiilKarsi}!_`)
      .setImage(gifUrl)
      .setFooter({ text: `/${k.ad}` });
    await interaction.editReply({ embeds: [embed] });
  }

  return { data, execute };
}

function tekBasinaKomutOlustur(k) {
  const data = new SlashCommandBuilder()
    .setName(k.ad)
    .setDescription(k.aciklama);

  async function execute(interaction) {
    await interaction.deferReply();
    const gifUrl = await waifuGifGetir(k.kategori);
    if (!gifUrl) return interaction.editReply({ content: '❌ GIF alınamadı, biraz sonra dene.' });

    const embed = new EmbedBuilder()
      .setColor(k.renk)
      .setDescription(`${k.emoji} **${interaction.user.username}** ${k.aciklamaTr}`)
      .setImage(gifUrl)
      .setFooter({ text: `/${k.ad}` });
    await interaction.editReply({ embeds: [embed] });
  }

  return { data, execute };
}

function gorselKomutOlustur(k) {
  const data = new SlashCommandBuilder()
    .setName(k.ad)
    .setDescription(k.aciklama);

  async function execute(interaction) {
    await interaction.deferReply();
    const gifUrl = await waifuGifGetir(k.kategori);
    if (!gifUrl) return interaction.editReply({ content: '❌ Görsel alınamadı, biraz sonra dene.' });

    const embed = new EmbedBuilder()
      .setColor(k.renk)
      .setTitle(`${k.emoji} Rastgele ${k.ad}`)
      .setImage(gifUrl)
      .setFooter({ text: `Kaynak: waifu.pics • /${k.ad}` });
    await interaction.editReply({ embeds: [embed] });
  }

  return { data, execute };
}

// ─── SAYAC GOSTERME KOMUTU ───
const sayacData = new SlashCommandBuilder()
  .setName('sayac')
  .setDescription('Eğlence komutlarındaki sayaçlarını gösterir')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Hedef kullanıcı (boş bırakırsan kendin)').setRequired(false));

async function sayacExecute(interaction, clientParam) {
  const client = interaction.client || clientParam;
  await sayaclariYukle(client);
  const hedef = interaction.options.getUser('kullanici') || interaction.user;
  const veri = sayacVerisi.get(hedef.id);
  if (!veri || Object.keys(veri).length === 0) {
    return interaction.reply({ content: `📊 <@${hedef.id}> henüz hiç eğlence komutu kullanmamış.` });
  }

  const satirlar = [];
  for (const [komut, deger] of Object.entries(veri)) {
    const k = ETKILESIMLI_KOMUTLAR.find(x => x.ad === komut);
    const tek = TEKBASINA_KOMUTLAR.find(x => x.ad === komut);
    if (k && typeof deger === 'object') {
      const toplam = Object.values(deger).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
      satirlar.push(`${k.emoji} **${k.ad}**: ${toplam} kez`);
    } else if (tek && typeof deger === 'number') {
      satirlar.push(`${tek.emoji} **${tek.ad}**: ${deger} kez`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${hedef.username} — Eğlence Sayaçları`)
    .setColor(0x5865F2)
    .setThumbnail(hedef.displayAvatarURL())
    .setDescription(satirlar.join('\n') || 'Hiç komut kullanılmamış.')
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

// ─── TUM KOMUTLARI TOPLA ───
const commands = [
  ...ETKILESIMLI_KOMUTLAR.map(etkilesimliKomutOlustur),
  ...TEKBASINA_KOMUTLAR.map(tekBasinaKomutOlustur),
  ...GORSEL_KOMUTLARI.map(gorselKomutOlustur),
  { data: sayacData, execute: sayacExecute },
];

module.exports = { commands };
