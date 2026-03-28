const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message]
});

const kayitVerisi = new Map();

// ─── Restart'ta arşivi belleğe yükle ───
async function arsivdenYukle(guild) {
  const arsivKanal = guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
  if (!arsivKanal) { console.log('Arşiv kanalı bulunamadı, yükleme atlandı.'); return; }

  let lastId = null;
  let yuklenen = 0;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const mesajlar = await arsivKanal.messages.fetch(options);
    if (mesajlar.size === 0) break;

    for (const [, msg] of mesajlar) {
      if (msg.embeds.length === 0) continue;
      const embed = msg.embeds[0];
      const footerText = embed.footer?.text || '';
      if (!footerText.startsWith('Kullanıcı ID:')) continue;

      const userId = footerText.replace('Kullanıcı ID:', '').trim();
      if (!userId) continue;
      if (kayitVerisi.has(userId)) continue; // En yeni kaydı al

      const fields = {};
      for (const f of embed.fields) fields[f.name] = f.value;

      const isim = (fields['👤 İsim'] || '').trim();
      const yasStr = (fields['🎂 Yaş'] || '0').trim();
      const ignRaw = (fields['🎮 IGN'] || 'Belirtilmedi').trim();
      const ign = ignRaw === 'Belirtilmedi' ? null : ignRaw;
      const oyunIdRaw = (fields['🎯 Oyun ID'] || '').trim();
      const oyunId = oyunIdRaw === 'Belirtilmedi' || oyunIdRaw === '' ? null : oyunIdRaw;
      const neredenRaw = (fields['📣 Nereden Duydun?'] || '').trim();
      const neredenDuydun = neredenRaw === 'Belirtilmedi' || neredenRaw === '' ? null : neredenRaw;

      if (!isim) continue;

      kayitVerisi.set(userId, {
        isim,
        yas: parseInt(yasStr) || 0,
        ign,
        oyunId,
        neredenDuydun,
        tarih: embed.timestamp ? Math.floor(new Date(embed.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000)
      });
      yuklenen++;
    }

    if (mesajlar.size < 100) break;
    lastId = mesajlar.last().id;
  }

  console.log(`Arşivden ${yuklenen} kayıt belleğe yüklendi.`);
}

// ─── Mesaj komutları ───
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.member?.permissions.has('Administrator')) return;

  // !panel
  if (message.content === '!panel') {
    const embed = new EmbedBuilder()
      .setTitle('📋 Kayıt Formu')
      .setDescription('**Sunucumuza Hoş Geldin!** 🌟\n\nKayıt olmak için aşağıdaki butona tıkla ve formu doldur.\nKayıt işlemi tamamlanınca **Kayıtlı Üye** rolü verilecektir.\n\n> ⚠️ Lütfen gerçek bilgilerini gir. Aksi takdirde sunucumuzda ödül kazanamazsın!')
      .setColor(0x5865F2)
      .setFooter({ text: 'Kayıt Sistemi' })
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('kayit_baslat').setLabel('📝 Kayıt Ol').setStyle(ButtonStyle.Primary)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete().catch(() => {});
  }

  // !kayitsil @kullanıcı
  if (message.content.startsWith('!kayitsil')) {
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!kayitsil @kullanıcı`');
    try {
      if (process.env.KAYITLI_ROL_ID) await hedef.roles.remove(process.env.KAYITLI_ROL_ID).catch(() => {});
      if (process.env.KAYITSIZ_ROL_ID) await hedef.roles.add(process.env.KAYITSIZ_ROL_ID).catch(() => {});
      await hedef.setNickname(null).catch(() => {});
      kayitVerisi.delete(hedef.id);
      await message.reply(`✅ **${hedef.user.tag}** kullanıcısının kaydı sıfırlandı.`);
      const logKanal = message.guild.channels.cache.get(process.env.LOG_KANAL_ID);
      if (logKanal) {
        await logKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('🗑️ Kayıt Silindi')
          .setColor(0xFF0000)
          .addFields(
            { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
            { name: '🛡️ İşlemi Yapan', value: `<@${message.author.id}>`, inline: false },
            { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })]
        });
      }
    } catch (err) {
      console.error(err);
      await message.reply('❌ Bir hata oluştu.');
    }
  }

  // !kayitbilgi @kullanıcı
  if (message.content.startsWith('!kayitbilgi')) {
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!kayitbilgi @kullanıcı`');

    const bilgi = kayitVerisi.get(hedef.id);
    if (bilgi) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('🔍 Kayıt Bilgisi')
        .setColor(0x5865F2)
        .addFields(
          { name: '👤 İsim', value: bilgi.isim, inline: true },
          { name: '🎂 Yaş', value: `${bilgi.yas}`, inline: true },
          { name: '🎮 IGN', value: bilgi.ign || 'Belirtilmedi', inline: true },
          { name: '🎯 Oyun ID', value: bilgi.oyunId || 'Belirtilmedi', inline: true },
          { name: '📣 Nereden Duydun?', value: bilgi.neredenDuydun || 'Belirtilmedi', inline: true },
          { name: '🆔 Discord', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
          { name: '📅 Kayıt Tarihi', value: `<t:${bilgi.tarih}:F>`, inline: false }
        )
        .setFooter({ text: `Kullanıcı ID: ${hedef.id}` })]
      });
    }

    // Bellekte yoksa arşiv tara
    const arsivKanal = message.guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
    if (!arsivKanal) return message.reply('❌ Arşiv kanalı bulunamadı. ARSIV_KANAL_ID ayarlı mı?');

    await message.reply('🔍 Arşiv taranıyor, lütfen bekle...');

    let bulunanMesaj = null;
    let lastId = null;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const mesajlar = await arsivKanal.messages.fetch(options);
      if (mesajlar.size === 0) break;

      for (const [, msg] of mesajlar) {
        if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `Kullanıcı ID: ${hedef.id}`) {
          bulunanMesaj = msg;
          break;
        }
      }

      if (bulunanMesaj) break;
      lastId = mesajlar.last().id;
      if (mesajlar.size < 100) break;
    }

    if (!bulunanMesaj) return message.reply('❌ Bu kullanıcıya ait kayıt arşivde bulunamadı.');

    const arsivEmbed = bulunanMesaj.embeds[0];
    await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('🔍 Kayıt Bilgisi (Arşivden)')
      .setColor(0x5865F2)
      .addFields(arsivEmbed.fields)
      .setFooter({ text: arsivEmbed.footer.text })
      .setTimestamp(arsivEmbed.timestamp ? new Date(arsivEmbed.timestamp) : null)]
    });
  }

  // !kayitguncelle @kullanıcı
  if (message.content.startsWith('!kayitguncelle')) {
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!kayitguncelle @kullanıcı`');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`guncelle_baslat_${hedef.id}`)
        .setLabel('✏️ Güncelleme Formunu Aç')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.reply({
      content: `**${hedef.user.tag}** kullanıcısının kaydını güncellemek için butona tıkla:`,
      components: [row]
    });
  }

  // !istatistik
  if (message.content === '!istatistik') {
    try {
      await message.guild.members.fetch();
      const kayitliUyeler = message.guild.members.cache.filter(m =>
        process.env.KAYITLI_ROL_ID && m.roles.cache.has(process.env.KAYITLI_ROL_ID)
      ).size;

      const birHaftaOnce = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      const buHaftaKayit = [...kayitVerisi.values()].filter(v => v.tarih >= birHaftaOnce).length;

      await message.reply({ embeds: [new EmbedBuilder()
        .setTitle('📊 Sunucu İstatistikleri')
        .setColor(0x5865F2)
        .addFields(
          { name: '✅ Toplam Kayıtlı Üye', value: `${kayitliUyeler}`, inline: true },
          { name: '📅 Bu Hafta Kayıt', value: `${buHaftaKayit}`, inline: true },
          { name: '💾 Bellekteki Kayıt', value: `${kayitVerisi.size}`, inline: true }
        )
        .setFooter({ text: 'Kayıt Sistemi' })
        .setTimestamp()]
      });
    } catch (err) {
      console.error(err);
      await message.reply('❌ İstatistikler alınırken hata oluştu.');
    }
  }

  // !yardim
  if (message.content === '!yardim') {
    await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('📖 Yönetici Komutları')
      .setColor(0x5865F2)
      .setDescription('Aşağıdaki komutlar sadece yöneticiler tarafından kullanılabilir.')
      .addFields(
        { name: '📋 `!panel`', value: 'Kayıt panelini (embed + buton) bulunduğun kanala gönderir.', inline: false },
        { name: '🗑️ `!kayitsil @kullanıcı`', value: 'Etiketlenen üyenin kaydını sıfırlar.', inline: false },
        { name: '🔍 `!kayitbilgi @kullanıcı`', value: 'Etiketlenen üyenin kayıt bilgilerini gösterir.', inline: false },
        { name: '✏️ `!kayitguncelle @kullanıcı`', value: 'Etiketlenen üyenin kayıt bilgilerini günceller.', inline: false },
        { name: '📊 `!istatistik`', value: 'Sunucu kayıt istatistiklerini gösterir.', inline: false },
        { name: '❓ `!yardim`', value: 'Bu menüyü gösterir.', inline: false }
      )
      .setFooter({ text: 'Kayıt Botu • Sadece yöneticiler görebilir' })
      .setTimestamp()]
    });
  }
});

// ─── Interaction handler ───
client.on('interactionCreate', async (interaction) => {

  // Kayıt başlat butonu
  if (interaction.isButton() && interaction.customId === 'kayit_baslat') {
    if (interaction.member.roles.cache.has(process.env.KAYITLI_ROL_ID)) {
      return interaction.reply({ content: '✅ Zaten kayıtlısın!', ephemeral: true });
    }
    const modal = new ModalBuilder().setCustomId('kayit_modal').setTitle('Kayıt Formu');

    const isimInput = new TextInputBuilder()
      .setCustomId('isim').setLabel('Adın')
      .setPlaceholder('Örnek: Emre')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32);

    const yasInput = new TextInputBuilder()
      .setCustomId('yas').setLabel('Yaşın')
      .setPlaceholder('Örnek: 18')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3);

    const ignInput = new TextInputBuilder()
      .setCustomId('ign').setLabel('IGN — Oyun Kullanıcı Adı (Opsiyonel)')
      .setPlaceholder('MLBB nickini gir ya da boş bırak')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(64);

    const oyunIdInput = new TextInputBuilder()
      .setCustomId('oyunId').setLabel('⚠️ Oyun ID — ID YOK = ÖDÜL YOK!')
      .setPlaceholder('Örnek: 123456789 (1234) — Parantez içi sunucu numarası')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(32);

    const neredenInput = new TextInputBuilder()
      .setCustomId('nereden').setLabel('Bizi nereden duydun? (Opsiyonel)')
      .setPlaceholder('disboard / dscv / arkadaş / diğer')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(64);

    modal.addComponents(
      new ActionRowBuilder().addComponents(isimInput),
      new ActionRowBuilder().addComponents(yasInput),
      new ActionRowBuilder().addComponents(ignInput),
      new ActionRowBuilder().addComponents(oyunIdInput),
      new ActionRowBuilder().addComponents(neredenInput)
    );
    await interaction.showModal(modal);
  }

  // Güncelleme butonu → modal aç
  if (interaction.isButton() && interaction.customId.startsWith('guncelle_baslat_')) {
    if (!interaction.member?.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ Bu butonu sadece yöneticiler kullanabilir.', ephemeral: true });
    }
    const hedefId = interaction.customId.replace('guncelle_baslat_', '');
    const mevcutBilgi = kayitVerisi.get(hedefId);

    const modal = new ModalBuilder().setCustomId(`guncelle_modal_${hedefId}`).setTitle('Kayıt Güncelleme Formu');

    const isimInput = new TextInputBuilder()
      .setCustomId('isim').setLabel('Yeni İsim')
      .setPlaceholder('Örnek: Emre')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32);
    if (mevcutBilgi?.isim) isimInput.setValue(mevcutBilgi.isim);

    const yasInput = new TextInputBuilder()
      .setCustomId('yas').setLabel('Yeni Yaş')
      .setPlaceholder('Örnek: 18')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3);
    if (mevcutBilgi?.yas) yasInput.setValue(`${mevcutBilgi.yas}`);

    const ignInput = new TextInputBuilder()
      .setCustomId('ign').setLabel('Yeni IGN (Opsiyonel)')
      .setPlaceholder('MLBB nickini gir ya da boş bırak')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(64);
    if (mevcutBilgi?.ign) ignInput.setValue(mevcutBilgi.ign);

    const oyunIdInput = new TextInputBuilder()
      .setCustomId('oyunId').setLabel('Yeni Oyun ID (Opsiyonel)')
      .setPlaceholder('Örnek: 123456789 (1234)')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(32);
    if (mevcutBilgi?.oyunId) oyunIdInput.setValue(mevcutBilgi.oyunId);

    modal.addComponents(
      new ActionRowBuilder().addComponents(isimInput),
      new ActionRowBuilder().addComponents(yasInput),
      new ActionRowBuilder().addComponents(ignInput),
      new ActionRowBuilder().addComponents(oyunIdInput)
    );
    await interaction.showModal(modal);
  }

  // Kayıt modal submit
  if (interaction.isModalSubmit() && interaction.customId === 'kayit_modal') {
    await interaction.deferReply({ ephemeral: true });

    const isim = interaction.fields.getTextInputValue('isim');
    const yas = interaction.fields.getTextInputValue('yas');
    const ign = interaction.fields.getTextInputValue('ign') || null;
    const oyunId = interaction.fields.getTextInputValue('oyunId') || null;
    const neredenDuydun = interaction.fields.getTextInputValue('nereden') || null;
    const yasNum = parseInt(yas);

    if (isNaN(yasNum) || yasNum < 1 || yasNum > 100) {
      return interaction.editReply({ content: '❌ Geçerli bir yaş gir (1-100 arası).' });
    }
    if (yasNum < 13) {
      return interaction.editReply({ content: '❌ Sunucumuza katılmak için en az **13 yaşında** olman gerekiyor.' });
    }

    const guild = interaction.guild;
    const member = interaction.member;
    const logKanal = guild.channels.cache.get(process.env.LOG_KANAL_ID);

    // Duplicate IGN kontrolü
    if (ign) {
      for (const [uid, veri] of kayitVerisi.entries()) {
        if (uid !== member.id && veri.ign && veri.ign.toLowerCase() === ign.toLowerCase()) {
          if (logKanal) {
            await logKanal.send({ embeds: [new EmbedBuilder()
              .setTitle('⚠️ Duplicate IGN Uyarısı')
              .setColor(0xFFA500)
              .setDescription('Aynı IGN ile kayıt girişimi tespit edildi!')
              .addFields(
                { name: '🎮 IGN', value: ign, inline: true },
                { name: '🆕 Yeni Kullanıcı', value: `<@${member.id}> (${member.user.tag})`, inline: false },
                { name: '📋 Mevcut Kayıt', value: `<@${uid}>`, inline: false }
              )
              .setTimestamp()]
            });
          }
        }
      }
    }

    try {
      if (process.env.KAYITLI_ROL_ID) await member.roles.add(process.env.KAYITLI_ROL_ID);
      if (process.env.KAYITSIZ_ROL_ID) await member.roles.remove(process.env.KAYITSIZ_ROL_ID).catch(() => {});
      const nick = ign ? `${isim} (${ign}) | ${yasNum}` : `${isim} | ${yasNum}`;
      await member.setNickname(nick).catch(() => {});

      kayitVerisi.set(member.id, { isim, yas: yasNum, ign, oyunId, neredenDuydun, tarih: Math.floor(Date.now() / 1000) });

      const arsivKanal = guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
      if (arsivKanal) {
        await arsivKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('📁 Yeni Kayıt')
          .setColor(0x57F287)
          .addFields(
            { name: '👤 İsim', value: isim, inline: true },
            { name: '🎂 Yaş', value: `${yasNum}`, inline: true },
            { name: '🎮 IGN', value: ign || 'Belirtilmedi', inline: true },
            { name: '🎯 Oyun ID', value: oyunId || 'Belirtilmedi', inline: true },
            { name: '📣 Nereden Duydun?', value: neredenDuydun || 'Belirtilmedi', inline: true },
            { name: '🆔 Discord', value: `<@${member.id}> (${member.user.tag})`, inline: false },
            { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `Kullanıcı ID: ${member.id}` })
          .setTimestamp()]
        });
      }

      if (logKanal) {
        await logKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('✅ Yeni Kayıt')
          .setColor(0x57F287)
          .addFields(
            { name: '👤 İsim', value: isim, inline: true },
            { name: '🎂 Yaş', value: `${yasNum}`, inline: true },
            { name: '🎮 IGN', value: ign || 'Belirtilmedi', inline: true },
            { name: '🎯 Oyun ID', value: oyunId || 'Belirtilmedi', inline: true },
            { name: '📣 Nereden Duydun?', value: neredenDuydun || 'Belirtilmedi', inline: true },
            { name: '🆔 Discord', value: `<@${member.id}> (${member.user.tag})`, inline: false },
            { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `Kullanıcı ID: ${member.id}` })
          .setTimestamp()]
        });
      }

      await member.send({ embeds: [new EmbedBuilder()
        .setTitle('🎉 Sunucumuza Hoş Geldin!')
        .setDescription(
          `Merhaba **${isim}**! Artık ailemizin bir parçasısın. Seni aramızda görmek harika! 🙌\n\n` +
          `🏆 **Haftalık Turnuva**\nHer **Cumartesi saat 20:00**'de ödüllü turnuvamız var! Katılmak için duyurularımızı takip et, fırsatı kaçırma!\n\n` +
          `💬 **Sohbet & Eğlence**\nKanallarımızda özgürce sohbet et, yeni arkadaşlar edin, birlikte oyna!\n\n` +
          (!oyunId ? `⚠️ **Oyun ID Girilmedi!**\nÖdüllü turnuvalarda ödül alabilmek için Oyun ID'ni girmen gerekiyor. Bir yöneticiye ulaş ve güncellet!\n\n` : '') +
          `⚠️ **Hatırlatma**\nGerçek bilgilerinle kayıt olduğun için turnuvalarda ödül kazanabilirsin. Yanlış bilgi tespit edilirse etkinlik haklarını kaybedebilirsin.\n\n` +
          `Herhangi bir sorun olursa yöneticilere ulaşabilirsin. İyi oyunlar! 🎮`
        )
        .setColor(0x5865F2)
        .setFooter({ text: 'Kayıt Sistemi' })
        .setTimestamp()]
      }).catch(() => {});

      await interaction.editReply({
        content: `✅ **Kayıt başarılı!**\nHoş geldin, **${isim}**! Artık sunucunun tam üyesisin. 🎉` +
          (!oyunId ? '\n\n⚠️ **Oyun ID girmedin!** Ödül almak için bir yöneticiye ulaş.' : '')
      });
    } catch (err) {
      console.error('Kayıt hatası:', err);
      await interaction.editReply({ content: '❌ Bir hata oluştu. Yönetici ile iletişime geç.' });
    }
  }

  // Güncelleme modal submit
  if (interaction.isModalSubmit() && interaction.customId.startsWith('guncelle_modal_')) {
    await interaction.deferReply({ ephemeral: true });
    const hedefId = interaction.customId.replace('guncelle_modal_', '');

    const isim = interaction.fields.getTextInputValue('isim');
    const yas = interaction.fields.getTextInputValue('yas');
    const ign = interaction.fields.getTextInputValue('ign') || null;
    const oyunId = interaction.fields.getTextInputValue('oyunId') || null;
    const yasNum = parseInt(yas);

     if (isNaN(yasNum) || yasNum < 1 || yasNum > 100) {
      return interaction.editReply({ content: '❌ Geçerli bir yaş gir (1-100 arası).' });
    }

    const guild = interaction.guild;
    const hedef = await guild.members.fetch(hedefId).catch(() => null);
    if (!hedef) return interaction.editReply({ content: '❌ Kullanıcı bulunamadı.' });

    const eskiBilgi = kayitVerisi.get(hedefId);
    kayitVerisi.set(hedefId, {
      isim, yas: yasNum, ign, oyunId,
      neredenDuydun: eskiBilgi?.neredenDuydun || null,
      tarih: eskiBilgi?.tarih || Math.floor(Date.now() / 1000)
    });

    const nick = ign ? `${isim} (${ign}) | ${yasNum}` : `${isim} | ${yasNum}`;
    await hedef.setNickname(nick).catch(() => {});

    const arsivKanal = guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
    if (arsivKanal) {
      await arsivKanal.send({ embeds: [new EmbedBuilder()
        .setTitle('✏️ Kayıt Güncellendi')
        .setColor(0xFFA500)
        .addFields(
          { name: '👤 İsim', value: isim, inline: true },
          { name: '🎂 Yaş', value: `${yasNum}`, inline: true },
          { name: '🎮 IGN', value: ign || 'Belirtilmedi', inline: true },
          { name: '🎯 Oyun ID', value: oyunId || 'Belirtilmedi', inline: true },
          { name: '🆔 Discord', value: `<@${hedefId}> (${hedef.user.tag})`, inline: false },
          { name: '🛡️ Güncelleyen', value: `<@${interaction.user.id}>`, inline: false },
          { name: '📅 Güncelleme Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: `Kullanıcı ID: ${hedefId}` })
        .setTimestamp()]
      });
    }

    const logKanal = guild.channels.cache.get(process.env.LOG_KANAL_ID);
    if (logKanal) {
      await logKanal.send({ embeds: [new EmbedBuilder()
        .setTitle('✏️ Kayıt Güncellendi')
        .setColor(0xFFA500)
        .addFields(
          { name: '👤 Kullanıcı', value: `<@${hedefId}> (${hedef.user.tag})`, inline: false },
          { name: '🛡️ Güncelleyen', value: `<@${interaction.user.id}>`, inline: false },
          { name: '📝 Yeni Bilgiler', value: `İsim: ${isim} | Yaş: ${yasNum} | IGN: ${ign || 'Belirtilmedi'} | Oyun ID: ${oyunId || 'Belirtilmedi'}`, inline: false }
        )
        .setTimestamp()]
      });
    }

    await interaction.editReply({ content: `✅ **${hedef.user.tag}** kullanıcısının kaydı güncellendi!` });
  }
});

client.on('guildMemberAdd', async (member) => {
  if (process.env.KAYITSIZ_ROL_ID) await member.roles.add(process.env.KAYITSIZ_ROL_ID).catch(console.error);
});

client.once('ready', async () => {
  console.log(`Bot aktif: ${client.user.tag}`);
  for (const [, guild] of client.guilds.cache) {
    await arsivdenYukle(guild).catch(console.error);
  }
});

client.login(process.env.BOT_TOKEN);
