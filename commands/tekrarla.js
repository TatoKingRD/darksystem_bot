// commands/tekrarla.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const GOREV_DOSYASI = path.join(__dirname, '../gorevler.json');
const aktifGorevler = new Map();

function isMod(member) {
  return process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
}

function dosyayaKaydet() {
  const kayit = {};
  for (const [ad, g] of aktifGorevler.entries()) {
    kayit[ad] = { kanalId: g.kanal.id, sure: g.sure, baslatan: g.baslatan, baslangic: g.baslangic };
  }
  fs.writeFileSync(GOREV_DOSYASI, JSON.stringify(kayit, null, 2));
}

function gorevBaslat(komutAdi, kanal, sure, baslatanId, baslangic) {
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

      await kanal.send({
        content: pingParcalar.join(' '),
        embeds: [new EmbedBuilder()
          .setTitle('🔔 Hatırlatma!')
          .setColor(0xF39C12)
          .setDescription(`\`/${komutAdi}\` komutunu çalıştırma zamanı geldi!`)
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
  aktifGorevler.set(komutAdi, { interval, kanal, sure, baslatan: baslatanId, baslangic });
}

// Bot restart'ta görevleri yükle
async function gorevleriYukle(client) {
  if (!fs.existsSync(GOREV_DOSYASI)) return;
  let kayit;
  try { kayit = JSON.parse(fs.readFileSync(GOREV_DOSYASI, 'utf8')); } catch { return; }

  let yuklenen = 0;
  for (const [komutAdi, g] of Object.entries(kayit)) {
    const kanal = await client.channels.fetch(g.kanalId).catch(() => null);
    if (!kanal) { console.log(`Görev yüklenemedi (kanal bulunamadı): ${komutAdi}`); continue; }
    gorevBaslat(komutAdi, kanal, g.sure, g.baslatan, g.baslangic);
    yuklenen++;
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

  gorevBaslat(komutAdi, kanal, sure, interaction.user.id, baslangic);
  dosyayaKaydet();

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

  clearInterval(aktifGorevler.get(komutAdi).interval);
  aktifGorevler.delete(komutAdi);
  dosyayaKaydet();

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
