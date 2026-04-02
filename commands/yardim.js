// commands/yardim.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('yardim')
  .setDescription('Kullanılabilir komutları gösterir');

function isMod(member) {
  return process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
}
function isAsis(member) {
  return process.env.ASISTAN_ROL_ID
    ? member.roles.cache.has(process.env.ASISTAN_ROL_ID)
    : false;
}

// ─── KOMUT DETAYLARI ───
const komutDetaylari = {
  takim: {
    baslik: '🎮 /takim — Takım Bulma',
    aciklama: 'Takım arkadaşı arama ilanı oluşturur.',
    kullanim: '`/takim rank: rolum: aranan_rol_1:`',
    parametreler: [
      '**rank** — Rankın (Epik → Yüce Mistik)',
      '**rolum** — Oynadığın pozisyon',
      '**aranan_rol_1** — Zorunlu, aradığın rol',
      '**aranan_rol_2/3/4** — Opsiyonel, max 4 rol',
    ],
    renk: 0x5865F2,
  },
  profil: {
    baslik: '👤 /profil — Profil',
    aciklama: 'Kendi kayıt bilgilerini gösterir. Arşivde kayıt varsa oradan çeker.',
    kullanim: '`/profil`',
    parametreler: [],
    renk: 0x5865F2,
  },
  rankguncelle: {
    baslik: '🏅 /rankguncelle — Rank Güncelle',
    aciklama: 'Kendi rankını günceller. Güncelleme log kanalına bildirilir.',
    kullanim: '`/rankguncelle rank:`',
    parametreler: ['**rank** — Yeni rankın (Epik → Yüce Mistik)'],
    renk: 0xE67E22,
  },
  kacgun: {
    baslik: '📅 /kacgun — Kaç Gün',
    aciklama: 'Sunucuya katılalı kaç gün olduğunu gösterir. Rozet sistemi var.',
    kullanim: '`/kacgun` veya `/kacgun kullanici:@kişi`',
    parametreler: ['**kullanici** — Opsiyonel, boş bırakırsan kendin'],
    renk: 0x3498DB,
  },
  topkacgun: {
    baslik: '🏆 /topkacgun — Sıralama',
    aciklama: 'Sunucuda en uzun süredir olan üyeleri sıralar.',
    kullanim: '`/topkacgun` veya `/topkacgun sayi:15 kullanici:@kişi`',
    parametreler: [
      '**sayi** — Kaç kişi listelensin (1-25, varsayılan: 10)',
      '**kullanici** — Opsiyonel, etiketlenen kişinin sırası da gösterilir',
    ],
    renk: 0xF1C40F,
  },
  hero: {
    baslik: '🎲 /hero — Hero Öner',
    aciklama: 'Rastgele MLBB hero önerir.',
    kullanim: '`/hero` veya `/hero rol:Mid`',
    parametreler: ['**rol** — Opsiyonel, Tank/Jungler/EXP/Gold/Mid/Roam'],
    renk: 0xE74C3C,
  },
  duello: {
    baslik: '⚔️ /duello — Düello',
    aciklama: 'Birine düello meydan okursun, rastgele kazanan belirlenir.',
    kullanim: '`/duello rakip:@kişi`',
    parametreler: ['**rakip** — Düello yapılacak kullanıcı'],
    renk: 0xE74C3C,
  },
  panel: {
    baslik: '📋 /panel — Kayıt Paneli',
    aciklama: 'Kayıt butonunu kanala gönderir. Üyeler butona basarak kayıt olur.',
    kullanim: '`/panel`',
    parametreler: [],
    renk: 0x9B59B6,
  },
  kayitsil: {
    baslik: '🗑️ /kayitsil — Kayıt Sil',
    aciklama: 'Üyenin kaydını sıfırlar. Kayıtlı rolü alınır, kayıtsız rol verilir.',
    kullanim: '`/kayitsil kullanici:@kişi`',
    parametreler: ['**kullanici** — Kaydı silinecek üye'],
    renk: 0xFF0000,
  },
  kayitbilgi: {
    baslik: '🔍 /kayitbilgi — Kayıt Bilgi',
    aciklama: 'Kullanıcının kayıt bilgilerini gösterir. Bellekte yoksa arşivden çeker.',
    kullanim: '`/kayitbilgi kullanici:@kişi`',
    parametreler: ['**kullanici** — Sorgulanacak üye'],
    renk: 0x9B59B6,
  },
  kayitguncelle: {
    baslik: '✏️ /kayitguncelle — Kayıt Güncelle',
    aciklama: 'Kullanıcının kayıt bilgilerini günceller. Form açılır, doldurulur.',
    kullanim: '`/kayitguncelle kullanici:@kişi`',
    parametreler: ['**kullanici** — Güncellenecek üye'],
    renk: 0xFFA500,
  },
  istatistik: {
    baslik: '📊 /istatistik — İstatistik',
    aciklama: 'Sunucu istatistiklerini gösterir: toplam kayıtlı üye, bu hafta kayıt vb.',
    kullanim: '`/istatistik`',
    parametreler: [],
    renk: 0x5865F2,
  },
  uyar: {
    baslik: '⚠️ /uyar — Uyarı Ver',
    aciklama: 'Kullanıcıya uyarı verir. Log kanalına kaydedilir.',
    kullanim: '`/uyar kullanici:@kişi sebep:mesaj`',
    parametreler: ['**kullanici** — Uyarılacak üye', '**sebep** — Uyarı sebebi'],
    renk: 0xFFA500,
  },
  uyarilar: {
    baslik: '📋 /uyarilar — Uyarı Listesi',
    aciklama: 'Kullanıcının geçmiş uyarılarını gösterir.',
    kullanim: '`/uyarilar kullanici:@kişi`',
    parametreler: ['**kullanici** — Uyarıları sorgulanacak üye'],
    renk: 0xFFA500,
  },
  sustur: {
    baslik: '🔇 /sustur — Sustur',
    aciklama: 'Kullanıcıyı belirtilen süre boyunca susturur. Kullanıcıya DM gider.',
    kullanim: '`/sustur kullanici:@kişi sure:10m sebep:spam`',
    parametreler: [
      '**kullanici** — Susturulacak üye',
      '**sure** — 60sn / 5dk / 10dk / 1saat / 1gün / 1hafta',
      '**sebep** — Opsiyonel',
    ],
    renk: 0xFF0000,
  },
  sustursil: {
    baslik: '🔊 /sustursil — Susturma Kaldır',
    aciklama: 'Kullanıcının susturmasını kaldırır. Kullanıcıya DM gider.',
    kullanim: '`/sustursil kullanici:@kişi sebep:`',
    parametreler: ['**kullanici** — Susturması kaldırılacak üye', '**sebep** — Opsiyonel'],
    renk: 0x57F287,
  },
  anket: {
    baslik: '📊 /anket — Anket',
    aciklama: 'Evet/Hayır veya özel seçenekli anket oluşturur. Her kullanıcı 1 kez oy verebilir.',
    kullanim: '`/anket soru:Turnuvaya katılacak mısın?`',
    parametreler: [
      '**soru** — Anket sorusu',
      '**aciklama** — Opsiyonel açıklama',
      '**secenek1** — Boş bırakırsan: Evet',
      '**secenek2** — Boş bırakırsan: Hayır',
      '**ping** — @everyone ping at (true/false)',
    ],
    renk: 0x5865F2,
  },
  tekrarla: {
    baslik: '🔁 /tekrarla — Hatırlatma',
    aciklama: 'Belirli aralıklarla hatırlatma mesajı gönderir. Bot kapansa bile devam eder.',
    kullanim: '`/tekrarla komut:bump dakika:120`',
    parametreler: ['**komut** — Hatırlatılacak komut adı', '**dakika** — Kaç dakikada bir'],
    renk: 0xF39C12,
  },
};

// ─── KATEGORİ TANIMLARI ───
const kategoriler = {
  genel: {
    label: '📖 Genel',
    renk: 0x5865F2,
    baslik: '📖 Genel Komutlar',
    aciklama: 'Tüm üyelerin kullanabileceği komutlar:',
    komutlar: ['takim', 'profil', 'rankguncelle', 'kacgun', 'topkacgun'],
  },
  eglence: {
    label: '🎉 Eğlence',
    renk: 0xE67E22,
    baslik: '🎉 Eğlence Komutları',
    aciklama: 'Eğlence amaçlı komutlar:',
    komutlar: ['hero', 'duello'],
  },
  kayit: {
    label: '📋 Kayıt',
    renk: 0x9B59B6,
    baslik: '📋 Kayıt Yönetimi',
    aciklama: 'Kayıt sistemi komutları (Yetkili):',
    komutlar: ['panel', 'kayitsil', 'kayitbilgi', 'kayitguncelle', 'istatistik'],
    yetkiliGerekli: true,
  },
  moderasyon: {
    label: '🛡️ Moderasyon',
    renk: 0xE74C3C,
    baslik: '🛡️ Moderasyon',
    aciklama: 'Moderasyon komutları (Yetkili):',
    komutlar: ['uyar', 'uyarilar', 'sustur', 'sustursil', 'anket', 'tekrarla'],
    yetkiliGerekli: true,
  },
};

function getKategoriEmbed(kategoriKey) {
  const k = kategoriler[kategoriKey];
  const fields = k.komutlar.map(key => {
    const d = komutDetaylari[key];
    return { name: d.baslik.split(' — ')[0], value: d.aciklama, inline: false };
  });
  return new EmbedBuilder()
    .setTitle(k.baslik)
    .setColor(k.renk)
    .setDescription(k.aciklama)
    .addFields(fields)
    .setFooter({ text: 'MLBB TR • Detay için aşağıdaki butonlara bas' });
}

function getKomutDetayEmbed(komutKey) {
  const d = komutDetaylari[komutKey];
  if (!d) return null;
  const embed = new EmbedBuilder()
    .setTitle(d.baslik)
    .setColor(d.renk)
    .setDescription(d.aciklama)
    .addFields({ name: '📌 Kullanım', value: d.kullanim, inline: false });
  if (d.parametreler.length > 0) {
    embed.addFields({ name: '⚙️ Parametreler', value: d.parametreler.join('\n'), inline: false });
  }
  embed.setFooter({ text: 'MLBB TR • Komut Detayı' });
  return embed;
}

function getKategoriRow(aktifKategori, yetkili) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('yardim_kat_genel').setLabel('📖 Genel').setStyle(aktifKategori === 'genel' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('yardim_kat_eglence').setLabel('🎉 Eğlence').setStyle(aktifKategori === 'eglence' ? ButtonStyle.Primary : ButtonStyle.Secondary),
  );
  if (yetkili) {
    row1.addComponents(
      new ButtonBuilder().setCustomId('yardim_kat_kayit').setLabel('📋 Kayıt').setStyle(aktifKategori === 'kayit' ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('yardim_kat_moderasyon').setLabel('🛡️ Moderasyon').setStyle(aktifKategori === 'moderasyon' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );
  }
  return row1;
}

function getKomutButonlari(kategoriKey) {
  const k = kategoriler[kategoriKey];
  const rows = [];
  const chunks = [];
  for (let i = 0; i < k.komutlar.length; i += 5) chunks.push(k.komutlar.slice(i, i + 5));
  for (const chunk of chunks) {
    const row = new ActionRowBuilder().addComponents(
      chunk.map(key => {
        const d = komutDetaylari[key];
        const label = d.baslik.split(' — ')[0];
        return new ButtonBuilder().setCustomId(`yardim_cmd_${key}`).setLabel(label).setStyle(ButtonStyle.Success);
      })
    );
    rows.push(row);
  }
  return rows;
}

async function execute(interaction) {
  const yetkili = isMod(interaction.member) || isAsis(interaction.member);
  const embed = getKategoriEmbed('genel');
  const katRow = getKategoriRow('genel', yetkili);
  const cmdRows = getKomutButonlari('genel');
  await interaction.reply({ embeds: [embed], components: [katRow, ...cmdRows], ephemeral: true });
}

module.exports = { data, execute, getKategoriEmbed, getKomutDetayEmbed, getKategoriRow, getKomutButonlari, kategoriler, komutDetaylari };