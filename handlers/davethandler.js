// handlers/davet.js
// Invite logger - tam paket: takip, leaderboard, rol ödülü, sahte davet algılama
const { EmbedBuilder } = require('discord.js');

// ─── BELLEK ───
// guildId -> Map(inviteCode -> { uses, inviterId })
const davetCache = new Map();

// Kullanici verileri: kullaniciId -> {
//   davetSayisi, sahteDavet, biKez, davetEdilenler: [{id, zaman, sahte}]
// }
const davetVerisi = new Map();

// Kim kimi davet etti: uyeId -> { davetEdenId, kodId, zaman }
const uyeDavetKaydi = new Map();

let veriYuklendi = false;

// Sahte davet suresi (ms): Bu sure icinde sunucudan cikarsa sahte sayilir
const SAHTE_SURE = 10 * 60 * 1000; // 10 dakika

// ─── LOG KANALI ───
function logKanalIdAl() {
  return process.env.DAVET_LOG_KANAL_ID;
}

// ─── CACHE: TUM DAVETLERI BELLEGE AL ───
async function davetleriCachele(guild) {
  try {
    const davetler = await guild.invites.fetch().catch(() => null);
    if (!davetler) return;
    const guildCache = new Map();
    for (const [, invite] of davetler) {
      guildCache.set(invite.code, {
        uses: invite.uses || 0,
        inviterId: invite.inviter?.id || null,
      });
    }
    // Vanity URL de takip et
    if (guild.vanityURLCode) {
      try {
        const vanity = await guild.fetchVanityData().catch(() => null);
        if (vanity) {
          guildCache.set(guild.vanityURLCode, {
            uses: vanity.uses || 0,
            inviterId: null,
            isVanity: true,
          });
        }
      } catch {}
    }
    davetCache.set(guild.id, guildCache);
  } catch (e) {
    console.error('[davet] Cache hatasi:', e.message);
  }
}

// ─── VERI YUKLEME (log kanalindan) ───
async function verileriYukle(client) {
  if (veriYuklendi) return;
  veriYuklendi = true;
  const kanalId = logKanalIdAl();
  if (!kanalId) {
    console.warn('[davet] DAVET_LOG_KANAL_ID tanimli degil, veriler restart\'ta sifirlanacak.');
    return;
  }
  try {
    const kanal = await client.channels.fetch(kanalId).catch(() => null);
    if (!kanal) return;
    const mesajlar = await kanal.messages.fetch({ limit: 50 }).catch(() => null);
    if (!mesajlar) return;
    const sirali = [...mesajlar.values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp);
    // En yeni "davet-data:" footer'li kayit
    for (const msg of sirali) {
      if (msg.author.id !== client.user.id) continue;
      if (!msg.embeds?.[0]?.footer?.text?.startsWith('davet-data:')) continue;
      try {
        const m = msg.embeds[0].description?.match(/```json\n([\s\S]*?)\n```/);
        if (!m) continue;
        const veri = JSON.parse(m[1]);
        for (const [id, kullanici] of Object.entries(veri.kullanicilar || {})) {
          davetVerisi.set(id, kullanici);
        }
        for (const [id, kayit] of Object.entries(veri.uyeKayitlari || {})) {
          uyeDavetKaydi.set(id, kayit);
        }
        break;
      } catch {}
    }
    console.log(`[davet] ${davetVerisi.size} kullanici, ${uyeDavetKaydi.size} uye kaydi yuklendi.`);
  } catch (e) {
    console.error('[davet] Yukleme hatasi:', e.message);
  }
}

// ─── VERI KAYDETME (tek mesaji edit ederek) ───
let kayitZamanlayici = null;
let kayitMesajId = null;

function verileriKaydet(client) {
  if (kayitZamanlayici) return;
  kayitZamanlayici = setTimeout(async () => {
    kayitZamanlayici = null;
    const kanalId = logKanalIdAl();
    if (!kanalId) return;
    try {
      const kanal = await client.channels.fetch(kanalId).catch(() => null);
      if (!kanal) return;

      const veri = {
        kullanicilar: Object.fromEntries(davetVerisi),
        uyeKayitlari: Object.fromEntries(uyeDavetKaydi),
      };
      const json = JSON.stringify(veri);
      if (json.length > 3800) {
        console.warn('[davet] Veri cok buyuk:', json.length);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('💾 Davet Veri Kaydı')
        .setColor(0x5865F2)
        .setDescription('```json\n' + json + '\n```')
        .setFooter({ text: 'davet-data: ' + new Date().toISOString() })
        .setTimestamp();

      // Mevcut mesaj varsa edit et
      if (!kayitMesajId) {
        const mesajlar = await kanal.messages.fetch({ limit: 50 }).catch(() => null);
        if (mesajlar) {
          for (const [, m] of mesajlar) {
            if (m.author.id === client.user.id && m.embeds?.[0]?.footer?.text?.startsWith('davet-data:')) {
              kayitMesajId = m.id;
              break;
            }
          }
        }
      }
      if (kayitMesajId) {
        try {
          const eski = await kanal.messages.fetch(kayitMesajId).catch(() => null);
          if (eski?.editable) {
            await eski.edit({ embeds: [embed] }).catch(() => {});
            return;
          }
        } catch {}
        kayitMesajId = null;
      }
      const yeni = await kanal.send({ embeds: [embed] }).catch(() => null);
      if (yeni) kayitMesajId = yeni.id;
    } catch (e) {
      console.error('[davet] Kayit hatasi:', e.message);
    }
  }, 5000);
}

// ─── ROL ODUL SISTEMI ───
// env: DAVET_ODUL_1_ADET=5, DAVET_ODUL_1_ROL_ID=..., DAVET_ODUL_2_ADET=10, ...
function odulListesi() {
  const liste = [];
  for (let i = 1; i <= 10; i++) {
    const adet = parseInt(process.env[`DAVET_ODUL_${i}_ADET`] || '0');
    const rolId = process.env[`DAVET_ODUL_${i}_ROL_ID`];
    if (adet > 0 && rolId) liste.push({ adet, rolId });
  }
  liste.sort((a, b) => a.adet - b.adet);
  return liste;
}

async function odulKontrol(member, yeniSayi) {
  const oduller = odulListesi();
  if (oduller.length === 0) return null;
  // Ulasilan en buyuk odul
  const hakEdilen = oduller.filter(o => yeniSayi >= o.adet);
  const yeniKazanilan = [];
  for (const o of hakEdilen) {
    if (!member.roles.cache.has(o.rolId)) {
      try {
        await member.roles.add(o.rolId).catch(() => {});
        yeniKazanilan.push({ adet: o.adet, rolId: o.rolId });
      } catch {}
    }
  }
  return yeniKazanilan;
}

// ─── SAYAC ARTTIRMA ───
function davetSayisiArttir(kullaniciId) {
  if (!davetVerisi.has(kullaniciId)) {
    davetVerisi.set(kullaniciId, { davetSayisi: 0, sahteDavet: 0, davetEdilenler: [] });
  }
  const k = davetVerisi.get(kullaniciId);
  k.davetSayisi = (k.davetSayisi || 0) + 1;
  return k.davetSayisi;
}

function davetSayisiAzalt(kullaniciId) {
  if (!davetVerisi.has(kullaniciId)) return 0;
  const k = davetVerisi.get(kullaniciId);
  k.davetSayisi = Math.max(0, (k.davetSayisi || 0) - 1);
  return k.davetSayisi;
}

function sahteDavetArttir(kullaniciId) {
  if (!davetVerisi.has(kullaniciId)) {
    davetVerisi.set(kullaniciId, { davetSayisi: 0, sahteDavet: 0, davetEdilenler: [] });
  }
  const k = davetVerisi.get(kullaniciId);
  k.sahteDavet = (k.sahteDavet || 0) + 1;
}

// ─── KATILIM ───
async function uyeKatildi(member) {
  const guild = member.guild;
  await verileriYukle(guild.client);

  // Eski cache ile yeni davetleri karsilastir
  const eskiCache = davetCache.get(guild.id) || new Map();
  let kullanilan = null;
  try {
    const yeniDavetler = await guild.invites.fetch().catch(() => null);
    if (yeniDavetler) {
      for (const [, invite] of yeniDavetler) {
        const eski = eskiCache.get(invite.code);
        if (eski && invite.uses > eski.uses) {
          kullanilan = {
            code: invite.code,
            inviterId: invite.inviter?.id || eski.inviterId,
            yeniUses: invite.uses,
          };
          break;
        }
      }
      // Vanity URL kontrol
      if (!kullanilan && guild.vanityURLCode) {
        try {
          const vanity = await guild.fetchVanityData().catch(() => null);
          const eskiVanity = eskiCache.get(guild.vanityURLCode);
          if (vanity && eskiVanity && vanity.uses > eskiVanity.uses) {
            kullanilan = { code: guild.vanityURLCode, inviterId: null, isVanity: true };
          }
        } catch {}
      }
    }
    // Cache'i guncelle
    await davetleriCachele(guild);
  } catch (e) {
    console.error('[davet] uyeKatildi hata:', e.message);
  }

  const kanalId = logKanalIdAl();
  const kanal = kanalId ? await guild.client.channels.fetch(kanalId).catch(() => null) : null;

  if (!kullanilan) {
    // Davet tespit edilemedi (gizli/one-time/audit)
    if (kanal) {
      await kanal.send({ embeds: [new EmbedBuilder()
        .setTitle('❓ Bilinmeyen Davet')
        .setColor(0x95A5A6)
        .setDescription(`**${member.user.tag}** katıldı ama davet tespit edilemedi.`)
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: `ID: ${member.id}` })
        .setTimestamp()
      ]}).catch(() => {});
    }
    return;
  }

  if (kullanilan.isVanity) {
    if (kanal) {
      await kanal.send({ embeds: [new EmbedBuilder()
        .setTitle('🔗 Vanity URL ile Katıldı')
        .setColor(0x9B59B6)
        .setDescription(`**${member.user.tag}** özel URL ile katıldı.`)
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: `ID: ${member.id}` })
        .setTimestamp()
      ]}).catch(() => {});
    }
    return;
  }

  if (!kullanilan.inviterId) return;

  // Davet eden bilinmiyor veya bot ise cikarak
  const davetEden = await guild.members.fetch(kullanilan.inviterId).catch(() => null);
  if (!davetEden || davetEden.user.bot) return;

  // Uye kaydini olustur
  uyeDavetKaydi.set(member.id, {
    davetEdenId: kullanilan.inviterId,
    kodId: kullanilan.code,
    zaman: Date.now(),
  });

  // Davet sayisini artir
  const yeniSayi = davetSayisiArttir(kullanilan.inviterId);

  // Davet edilenler listesi (son 20)
  const k = davetVerisi.get(kullanilan.inviterId);
  if (!Array.isArray(k.davetEdilenler)) k.davetEdilenler = [];
  k.davetEdilenler.push({ id: member.id, zaman: Date.now(), sahte: false });
  if (k.davetEdilenler.length > 20) k.davetEdilenler.shift();

  // Rol odulleri
  const yeniOduller = await odulKontrol(davetEden, yeniSayi);

  verileriKaydet(guild.client);

  // Log kanalina yaz
  if (kanal) {
    const fields = [
      { name: '👤 Davet Eden', value: `<@${kullanilan.inviterId}>`, inline: true },
      { name: '📊 Toplam Daveti', value: `**${yeniSayi}**`, inline: true },
      { name: '🔗 Davet Kodu', value: `\`${kullanilan.code}\``, inline: true },
    ];
    if (yeniOduller?.length) {
      fields.push({
        name: '🎁 Kazanılan Rol',
        value: yeniOduller.map(o => `${o.adet} davet: <@&${o.rolId}>`).join('\n'),
        inline: false,
      });
    }
    await kanal.send({ embeds: [new EmbedBuilder()
      .setTitle('✅ Yeni Üye Katıldı')
      .setColor(0x57F287)
      .setDescription(`**${member.user.tag}** sunucuya katıldı!`)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(fields)
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp()
    ]}).catch(() => {});
  }
}

// ─── AYRILMA ───
async function uyeAyrildi(member) {
  await verileriYukle(member.guild.client);
  const kayit = uyeDavetKaydi.get(member.id);
  if (!kayit) return;

  const { davetEdenId, zaman } = kayit;
  const sunucudaKalmaSuresi = Date.now() - zaman;
  const sahteMi = sunucudaKalmaSuresi < SAHTE_SURE;

  // Sayacı azalt
  const yeniSayi = davetSayisiAzalt(davetEdenId);
  if (sahteMi) sahteDavetArttir(davetEdenId);

  // davetEdilenler listesinde isaretla
  const k = davetVerisi.get(davetEdenId);
  if (k?.davetEdilenler) {
    const kayit2 = k.davetEdilenler.find(e => e.id === member.id);
    if (kayit2) kayit2.sahte = sahteMi;
  }

  verileriKaydet(member.guild.client);

  const kanalId = logKanalIdAl();
  const kanal = kanalId ? await member.guild.client.channels.fetch(kanalId).catch(() => null) : null;
  if (kanal) {
    const dakika = Math.floor(sunucudaKalmaSuresi / 60000);
    await kanal.send({ embeds: [new EmbedBuilder()
      .setTitle(sahteMi ? '❌ Sahte Davet (Erken Ayrıldı)' : '👋 Üye Ayrıldı')
      .setColor(sahteMi ? 0xE74C3C : 0xF39C12)
      .setDescription(`**${member.user?.tag || member.id}** sunucudan ayrıldı.`)
      .setThumbnail(member.user?.displayAvatarURL() || null)
      .addFields(
        { name: '👤 Davet Eden', value: `<@${davetEdenId}>`, inline: true },
        { name: '📊 Yeni Davet Sayısı', value: `**${yeniSayi}**`, inline: true },
        { name: '⏱️ Sunucuda Kaldı', value: `${dakika} dakika`, inline: true },
      )
      .setFooter({ text: `ID: ${member.id}${sahteMi ? ' • Sahte sayıldı' : ''}` })
      .setTimestamp()
    ]}).catch(() => {});
  }

  // Sahte olduysa rol odulunu da geri al (opsiyonel - simdilik yapmiyoruz)
}

// ─── API: Dışarıya fonksiyonlar ───
function davetSayisiGetir(kullaniciId) {
  const k = davetVerisi.get(kullaniciId);
  if (!k) return { gercek: 0, sahte: 0, toplam: 0 };
  const gercek = k.davetSayisi || 0;
  const sahte = k.sahteDavet || 0;
  return { gercek, sahte, toplam: gercek + sahte };
}

function davetEdilenlerGetir(kullaniciId) {
  const k = davetVerisi.get(kullaniciId);
  return k?.davetEdilenler || [];
}

function leaderboardGetir(limit = 10) {
  const liste = [...davetVerisi.entries()]
    .map(([id, k]) => ({ id, gercek: k.davetSayisi || 0, sahte: k.sahteDavet || 0 }))
    .filter(e => e.gercek > 0)
    .sort((a, b) => b.gercek - a.gercek)
    .slice(0, limit);
  return liste;
}

// ─── BOT HAZIR OLDUGUNDA: Tum guild'lerin davetlerini cachele ───
async function baslat(client) {
  for (const [, guild] of client.guilds.cache) {
    await davetleriCachele(guild);
  }
  await verileriYukle(client);
  console.log(`[davet] ${davetCache.size} sunucu icin davetler cachelendi.`);
}

module.exports = {
  baslat,
  uyeKatildi,
  uyeAyrildi,
  davetleriCachele,
  davetSayisiGetir,
  davetEdilenlerGetir,
  leaderboardGetir,
  odulListesi,
};