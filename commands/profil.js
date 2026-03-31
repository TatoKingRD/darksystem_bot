// commands/profil.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const data = new SlashCommandBuilder()
  .setName('profil')
  .setDescription('Profil kartını gösterir');

const rankRenkleri = {
  'Epik': '#E67E22',
  'Efsane': '#F1C40F',
  'Mistik': '#E74C3C',
  'Şanlı Mistik': '#C0392B',
  'Mistik Zafer': '#8E44AD',
  'Yüce Mistik': '#F39C12',
};

async function profilKartiOlustur(member, bilgi) {
  const W = 800, H = 300;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Arka plan — koyu mor gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a0a2e');
  bg.addColorStop(0.5, '#2c1654');
  bg.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Sol kenar çizgisi (Discord mor)
  ctx.fillStyle = '#5865F2';
  ctx.fillRect(0, 0, 5, H);

  // Sağ kenar çizgisi
  ctx.fillStyle = '#5865F2';
  ctx.fillRect(W - 5, 0, 5, H);

  // Avatar dairesi arka planı
  const avatarX = 80, avatarY = H / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, 67, 0, Math.PI * 2);
  ctx.fillStyle = '#5865F2';
  ctx.fill();
  ctx.restore();

  // Avatar
  try {
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatar = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, 60, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX - 60, avatarY - 60, 120, 120);
    ctx.restore();
  } catch {}

  // İsim
  const isim = bilgi.isim || member.user.username;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(isim, 175, 70);

  // Rank rozeti
  const rank = bilgi.rank || null;
  if (rank) {
    const rankRenk = rankRenkleri[rank] || '#5865F2';
    const rankText = `🏅 ${rank}`;
    ctx.font = 'bold 16px sans-serif';
    const rankW = ctx.measureText(rankText).width + 24;
    ctx.fillStyle = rankRenk + '33';
    ctx.strokeStyle = rankRenk;
    ctx.lineWidth = 2;
    roundRect(ctx, 175, 80, rankW, 28, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = rankRenk;
    ctx.fillText(rankText, 187, 99);
  }

  // Bilgi satırları
  const bilgiler = [
    { label: '👤 İsim', value: bilgi.isim || '-' },
    { label: '🎂 Yaş', value: `${bilgi.yas || '-'}` },
    { label: '🎮 IGN', value: bilgi.ign || 'Belirtilmedi' },
    { label: '🎯 Oyun ID', value: bilgi.oyunId || 'Belirtilmedi' },
  ];

  const col1X = 175, col2X = 490;
  const startY = 145;
  const lineH = 42;

  bilgiler.forEach((b, i) => {
    const x = i < 2 ? col1X : col2X;
    const y = startY + (i % 2) * lineH;

    ctx.fillStyle = '#A0AEC0';
    ctx.font = '13px sans-serif';
    ctx.fillText(b.label, x, y);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(b.value, x, y + 20);
  });

  // Kayıt tarihi
  if (bilgi.tarih) {
    const tarih = new Date(bilgi.tarih * 1000).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    ctx.fillStyle = '#718096';
    ctx.font = '13px sans-serif';
    ctx.fillText(`📅 Kayıt: ${tarih}`, 175, H - 25);
  }

  // Alt çizgi
  ctx.strokeStyle = '#5865F222';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(175, H - 40);
  ctx.lineTo(W - 20, H - 40);
  ctx.stroke();

  // Discord tag
  ctx.fillStyle = '#5865F2';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(member.user.tag, W - 20 - ctx.measureText(member.user.tag).width, H - 25);

  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function execute(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const member = interaction.member;
  const kayitVerisi = client.kayitVerisi;
  let bilgi = kayitVerisi.get(member.id);

  if (!bilgi) {
    // Arşivden ara
    const arsivKanal = interaction.guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
    if (arsivKanal) {
      let lastId = null;
      outer: while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const mesajlar = await arsivKanal.messages.fetch(options).catch(() => null);
        if (!mesajlar || mesajlar.size === 0) break;
        for (const [, msg] of mesajlar) {
          if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `Kullanıcı ID: ${member.id}`) {
            const fields = {};
            for (const f of msg.embeds[0].fields) fields[f.name] = f.value;
            bilgi = {
              isim: (fields['👤 İsim'] || '').trim(),
              yas: parseInt(fields['🎂 Yaş'] || '0') || 0,
              ign: (fields['🎮 IGN'] || 'Belirtilmedi').trim() === 'Belirtilmedi' ? null : fields['🎮 IGN'].trim(),
              oyunId: (fields['🎯 Oyun ID'] || 'Belirtilmedi').trim() === 'Belirtilmedi' ? null : fields['🎯 Oyun ID'].trim(),
              tarih: msg.embeds[0].timestamp ? Math.floor(new Date(msg.embeds[0].timestamp).getTime() / 1000) : null,
              rank: null,
            };
            break outer;
          }
        }
        if (mesajlar.size < 100) break;
        lastId = mesajlar.last().id;
      }
    }
  }

  if (!bilgi) {
    return interaction.editReply({ content: '❌ Kayıt bilgin bulunamadı. Henüz kayıt olmadın mı?' });
  }

  try {
    const buffer = await profilKartiOlustur(member, bilgi);
    const attachment = new AttachmentBuilder(buffer, { name: 'profil.png' });
    await interaction.editReply({ files: [attachment] });
  } catch (err) {
    console.error('Profil kartı hatası:', err);
    await interaction.editReply({ content: '❌ Profil kartı oluşturulurken hata oluştu.' });
  }
}

module.exports = { data, execute };