const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message]
});

const kayitVerisi = new Map();

// â”€â”€â”€ Restart'ta arÅŸivi belleÄŸe yÃ¼kle â”€â”€â”€
async function arsivdenYukle(guild) {
  const arsivKanal = guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
  if (!arsivKanal) { console.log('ArÅŸiv kanalÄ± bulunamadÄ±, yÃ¼kleme atlandÄ±.'); return; }

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
      if (!footerText.startsWith('KullanÄ±cÄ± ID:')) continue;

      const userId = footerText.replace('KullanÄ±cÄ± ID:', '').trim();
      if (!userId) continue;
      if (kayitVerisi.has(userId)) continue; // En yeni kaydÄ± al

      const fields = {};
      for (const f of embed.fields) fields[f.name] = f.value;

      const isim = (fields['ðŸ‘¤ Ä°sim'] || '').trim();
      const yasStr = (fields['ðŸŽ‚ YaÅŸ'] || '0').trim();
      const ignRaw = (fields['ðŸŽ® IGN'] || 'Belirtilmedi').trim();
      const ign = ignRaw === 'Belirtilmedi' ? null : ignRaw;
      const oyunIdRaw = (fields['ðŸŽ¯ Oyun ID'] || '').trim();
      const oyunId = oyunIdRaw === 'Belirtilmedi' || oyunIdRaw === '' ? null : oyunIdRaw;
      const neredenRaw = (fields['ðŸ“£ Nereden Duydun?'] || '').trim();
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

  console.log(`ArÅŸivden ${yuklenen} kayÄ±t belleÄŸe yÃ¼klendi.`);
}

// â”€â”€â”€ Mesaj komutlarÄ± â”€â”€â”€
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.member?.permissions.has('Administrator')) return;

  // !panel
  if (message.content === '!panel') {
    const embed = new EmbedBuilder()
      .setTitle('ðŸ“‹ KayÄ±t Formu')
      .setDescription('**Sunucumuza HoÅŸ Geldin!** ðŸŒŸ\n\nKayÄ±t olmak iÃ§in aÅŸaÄŸÄ±daki butona tÄ±kla ve formu doldur.\nKayÄ±t iÅŸlemi tamamlanÄ±nca **KayÄ±tlÄ± Ãœye** rolÃ¼ verilecektir.\n\n> âš ï¸ LÃ¼tfen gerÃ§ek bilgilerini gir. Aksi takdirde sunucumuzda Ã¶dÃ¼l kazanamazsÄ±n!')
      .setColor(0x5865F2)
      .setFooter({ text: 'KayÄ±t Sistemi' })
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('kayit_baslat').setLabel('ðŸ“ KayÄ±t Ol').setStyle(ButtonStyle.Primary)
    );
    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete().catch(() => {});
  }

  // !kayitsil @kullanÄ±cÄ±
  if (message.content.startsWith('!kayitsil')) {
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('âŒ Bir kullanÄ±cÄ± etiketle. Ã–rnek: `!kayitsil @kullanÄ±cÄ±`');
    try {
      if (process.env.KAYITLI_ROL_ID) await hedef.roles.remove(process.env.KAYITLI_ROL_ID).catch(() => {});
      if (process.env.KAYITSIZ_ROL_ID) await hedef.roles.add(process.env.KAYITSIZ_ROL_ID).catch(() => {});
      await hedef.setNickname(null).catch(() => {});
      kayitVerisi.delete(hedef.id);
      await message.reply(`âœ… **${hedef.user.tag}** kullanÄ±cÄ±sÄ±nÄ±n kaydÄ± sÄ±fÄ±rlandÄ±.`);
      const logKanal = message.guild.channels.cache.get(process.env.LOG_KANAL_ID);
      if (logKanal) {
        await logKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('ðŸ—‘ï¸ KayÄ±t Silindi')
          .setColor(0xFF0000)
          .addFields(
            { name: 'ðŸ‘¤ KullanÄ±cÄ±', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
            { name: 'ðŸ›¡ï¸ Ä°ÅŸlemi Yapan', value: `<@${message.author.id}>`, inline: false },
            { name: 'ðŸ“… Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `KullanÄ±cÄ± ID: ${hedef.id}` })]
        });
      }
    } catch (err) {
      console.error(err);
      await message.reply('âŒ Bir hata oluÅŸtu.');
    }
  }

  // !kayitbilgi @kullanÄ±cÄ±
  if (message.content.startsWith('!kayitbilgi')) {
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('âŒ Bir kullanÄ±cÄ± etiketle. Ã–rnek: `!kayitbilgi @kullanÄ±cÄ±`');

    const bilgi = kayitVerisi.get(hedef.id);
    if (bilgi) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setTitle('ðŸ” KayÄ±t Bilgisi')
        .setColor(0x5865F2)
        .addFields(
          { name: 'ðŸ‘¤ Ä°sim', value: bilgi.isim, inline: true },
          { name: 'ðŸŽ‚ YaÅŸ', value: `${bilgi.yas}`, inline: true },
          { name: 'ðŸŽ® IGN', value: bilgi.ign || 'Belirtilmedi', inline: true },
          { name: 'ðŸŽ¯ Oyun ID', value: bilgi.oyunId || 'Belirtilmedi', inline: true },
          { name: 'ðŸ“£ Nereden Duydun?', value: bilgi.neredenDuydun || 'Belirtilmedi', inline: true },
          { name: 'ðŸ†” Discord', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
          { name: 'ðŸ“… KayÄ±t Tarihi', value: `<t:${bilgi.tarih}:F>`, inline: false }
        )
        .setFooter({ text: `KullanÄ±cÄ± ID: ${hedef.id}` })]
      });
    }

    // Bellekte yoksa arÅŸiv tara
    const arsivKanal = message.guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
    if (!arsivKanal) return message.reply('âŒ ArÅŸiv kanalÄ± bulunamadÄ±. ARSIV_KANAL_ID ayarlÄ± mÄ±?');

    await message.reply('ðŸ” ArÅŸiv taranÄ±yor, lÃ¼tfen bekle...');

    let bulunanMesaj = null;
    let lastId = null;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;
      const mesajlar = await arsivKanal.messages.fetch(options);
      if (mesajlar.size === 0) break;

      for (const [, msg] of mesajlar) {
        if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `KullanÄ±cÄ± ID: ${hedef.id}`) {
          bulunanMesaj = msg;
          break;
        }
      }

      if (bulunanMesaj) break;
      lastId = mesajlar.last().id;
      if (mesajlar.size < 100) break;
    }

    if (!bulunanMesaj) return message.reply('âŒ Bu kullanÄ±cÄ±ya ait kayÄ±t arÅŸivde bulunamadÄ±.');

    const arsivEmbed = bulunanMesaj.embeds[0];
    await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('ðŸ” KayÄ±t Bilgisi (ArÅŸivden)')
      .setColor(0x5865F2)
      .addFields(arsivEmbed.fields)
      .setFooter({ text: arsivEmbed.footer.text })
      .setTimestamp(arsivEmbed.timestamp ? new Date(arsivEmbed.timestamp) : null)]
    });
  }

  // !kayitguncelle @kullanÄ±cÄ±
  if (message.content.startsWith('!kayitguncelle')) {
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('âŒ Bir kullanÄ±cÄ± etiketle. Ã–rnek: `!kayitguncelle @kullanÄ±cÄ±`');

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`guncelle_baslat_${hedef.id}`)
        .setLabel('âœï¸ GÃ¼ncelleme Formunu AÃ§')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.reply({
      content: `**${hedef.user.tag}** kullanÄ±cÄ±sÄ±nÄ±n kaydÄ±nÄ± gÃ¼ncellemek iÃ§in butona tÄ±kla:`,
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
        .setTitle('ðŸ“Š Sunucu Ä°statistikleri')
        .setColor(0x5865F2)
        .addFields(
          { name: 'âœ… Toplam KayÄ±tlÄ± Ãœye', value: `${kayitliUyeler}`, inline: true },
          { name: 'ðŸ“… Bu Hafta KayÄ±t', value: `${buHaftaKayit}`, inline: true },
          { name: 'ðŸ’¾ Bellekteki KayÄ±t', value: `${kayitVerisi.size}`, inline: true }
        )
        .setFooter({ text: 'KayÄ±t Sistemi' })
        .setTimestamp()]
      });
    } catch (err) {
      console.error(err);
      await message.reply('âŒ Ä°statistikler alÄ±nÄ±rken hata oluÅŸtu.');
    }
  }

  // !yardim
  if (message.content === '!yardim') {
    await message.reply({ embeds: [new EmbedBuilder()
      .setTitle('ðŸ“– YÃ¶netici KomutlarÄ±')
      .setColor(0x5865F2)
      .setDescription('AÅŸaÄŸÄ±daki komutlar sadece yÃ¶neticiler tarafÄ±ndan kullanÄ±labilir.')
      .addFields(
        { name: 'ðŸ“‹ `!panel`', value: 'KayÄ±t panelini (embed + buton) bulunduÄŸun kanala gÃ¶nderir.', inline: false },
        { name: 'ðŸ—‘ï¸ `!kayitsil @kullanÄ±cÄ±`', value: 'Etiketlenen Ã¼yenin kaydÄ±nÄ± sÄ±fÄ±rlar.', inline: false },
        { name: 'ðŸ” `!kayitbilgi @kullanÄ±cÄ±`', value: 'Etiketlenen Ã¼yenin kayÄ±t bilgilerini gÃ¶sterir.', inline: false },
        { name: 'âœï¸ `!kayitguncelle @kullanÄ±cÄ±`', value: 'Etiketlenen Ã¼yenin kayÄ±t bilgilerini gÃ¼nceller.', inline: false },
        { name: 'ðŸ“Š `!istatistik`', value: 'Sunucu kayÄ±t istatistiklerini gÃ¶sterir.', inline: false },
        { name: 'â“ `!yardim`', value: 'Bu menÃ¼yÃ¼ gÃ¶sterir.', inline: false }
      )
      .setFooter({ text: 'KayÄ±t Botu â€¢ Sadece yÃ¶neticiler gÃ¶rebilir' })
      .setTimestamp()]
    });
  }
});

// â”€â”€â”€ Interaction handler â”€â”€â”€
client.on('interactionCreate', async (interaction) => {

  // KayÄ±t baÅŸlat butonu
  if (interaction.isButton() && interaction.customId === 'kayit_baslat') {
    if (interaction.member.roles.cache.has(process.env.KAYITLI_ROL_ID)) {
      return interaction.reply({ content: 'âœ… Zaten kayÄ±tlÄ±sÄ±n!', ephemeral: true });
    }
    const modal = new ModalBuilder().setCustomId('kayit_modal').setTitle('KayÄ±t Formu');

    const isimInput = new TextInputBuilder()
      .setCustomId('isim').setLabel('AdÄ±n')
      .setPlaceholder('Ã–rnek: Emre')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32);

    const yasInput = new TextInputBuilder()
      .setCustomId('yas').setLabel('YaÅŸÄ±n')
      .setPlaceholder('Ã–rnek: 18')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3);

    const ignInput = new TextInputBuilder()
      .setCustomId('ign').setLabel('IGN â€” Oyun KullanÄ±cÄ± AdÄ± (Opsiyonel)')
      .setPlaceholder('MLBB nickini gir ya da boÅŸ bÄ±rak')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(64);

    const oyunIdInput = new TextInputBuilder()
      .setCustomId('oyunId').setLabel('âš ï¸ Oyun ID â€” ID YOK = Ã–DÃœL YOK!')
      .setPlaceholder('Ã–rnek: 123456789 (1234) â€” Parantez iÃ§i sunucu numarasÄ±')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(32);

    const neredenInput = new TextInputBuilder()
      .setCustomId('nereden').setLabel('Bizi nereden duydun? (Opsiyonel)')
      .setPlaceholder('disboard / dscv / arkadaÅŸ / diÄŸer')
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

  // GÃ¼ncelleme butonu â†’ modal aÃ§
  if (interaction.isButton() && interaction.customId.startsWith('guncelle_baslat_')) {
    if (!interaction.member?.permissions.has('Administrator')) {
      return interaction.reply({ content: 'âŒ Bu butonu sadece yÃ¶neticiler kullanabilir.', ephemeral: true });
    }
    const hedefId = interaction.customId.replace('guncelle_baslat_', '');
    const mevcutBilgi = kayitVerisi.get(hedefId);

    const modal = new ModalBuilder().setCustomId(`guncelle_modal_${hedefId}`).setTitle('KayÄ±t GÃ¼ncelleme Formu');

    const isimInput = new TextInputBuilder()
      .setCustomId('isim').setLabel('Yeni Ä°sim')
      .setPlaceholder('Ã–rnek: Emre')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32);
    if (mevcutBilgi?.isim) isimInput.setValue(mevcutBilgi.isim);

    const yasInput = new TextInputBuilder()
      .setCustomId('yas').setLabel('Yeni YaÅŸ')
      .setPlaceholder('Ã–rnek: 18')
      .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3);
    if (mevcutBilgi?.yas) yasInput.setValue(`${mevcutBilgi.yas}`);

    const ignInput = new TextInputBuilder()
      .setCustomId('ign').setLabel('Yeni IGN (Opsiyonel)')
      .setPlaceholder('MLBB nickini gir ya da boÅŸ bÄ±rak')
      .setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(64);
    if (mevcutBilgi?.ign) ignInput.setValue(mevcutBilgi.ign);

    const oyunIdInput = new TextInputBuilder()
      .setCustomId('oyunId').setLabel('Yeni Oyun ID (Opsiyonel)')
      .setPlaceholder('Ã–rnek: 123456789 (1234)')
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

  // KayÄ±t modal submit
  if (interaction.isModalSubmit() && interaction.customId === 'kayit_modal') {
    await interaction.deferReply({ ephemeral: true });

    const isim = interaction.fields.getTextInputValue('isim');
    const yas = interaction.fields.getTextInputValue('yas');
    const ign = interaction.fields.getTextInputValue('ign') || null;
    const oyunId = interaction.fields.getTextInputValue('oyunId') || null;
    const neredenDuydun = interaction.fields.getTextInputValue('nereden') || null;
    const yasNum = parseInt(yas);

    if (isNaN(yasNum) || yasNum < 1 || yasNum > 100) {
      return interaction.editReply({ content: 'âŒ GeÃ§erli bir yaÅŸ gir (1-100 arasÄ±).' });
    }
    if (yasNum < 13) {
      return interaction.editReply({ content: 'âŒ Sunucumuza katÄ±lmak iÃ§in en az **13 yaÅŸÄ±nda** olman gerekiyor.' });
    }

    const guild = interaction.guild;
    const member = interaction.member;
    const logKanal = guild.channels.cache.get(process.env.LOG_KANAL_ID);

    // Duplicate IGN kontrolÃ¼
    if (ign) {
      for (const [uid, veri] of kayitVerisi.entries()) {
        if (uid !== member.id && veri.ign && veri.ign.toLowerCase() === ign.toLowerCase()) {
          if (logKanal) {
            await logKanal.send({ embeds: [new EmbedBuilder()
              .setTitle('âš ï¸ Duplicate IGN UyarÄ±sÄ±')
              .setColor(0xFFA500)
              .setDescription('AynÄ± IGN ile kayÄ±t giriÅŸimi tespit edildi!')
              .addFields(
                { name: 'ðŸŽ® IGN', value: ign, inline: true },
                { name: 'ðŸ†• Yeni KullanÄ±cÄ±', value: `<@${member.id}> (${member.user.tag})`, inline: false },
                { name: 'ðŸ“‹ Mevcut KayÄ±t', value: `<@${uid}>`, inline: false }
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
          .setTitle('ðŸ“ Yeni KayÄ±t')
          .setColor(0x57F287)
          .addFields(
            { name: 'ðŸ‘¤ Ä°sim', value: isim, inline: true },
            { name: 'ðŸŽ‚ YaÅŸ', value: `${yasNum}`, inline: true },
            { name: 'ðŸŽ® IGN', value: ign || 'Belirtilmedi', inline: true },
            { name: 'ðŸŽ¯ Oyun ID', value: oyunId || 'Belirtilmedi', inline: true },
            { name: 'ðŸ“£ Nereden Duydun?', value: neredenDuydun || 'Belirtilmedi', inline: true },
            { name: 'ðŸ†” Discord', value: `<@${member.id}> (${member.user.tag})`, inline: false },
            { name: 'ðŸ“… Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `KullanÄ±cÄ± ID: ${member.id}` })
          .setTimestamp()]
        });
      }

      if (logKanal) {
        await logKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('âœ… Yeni KayÄ±t')
          .setColor(0x57F287)
          .addFields(
            { name: 'ðŸ‘¤ Ä°sim', value: isim, inline: true },
            { name: 'ðŸŽ‚ YaÅŸ', value: `${yasNum}`, inline: true },
            { name: 'ðŸŽ® IGN', value: ign || 'Belirtilmedi', inline: true },
            { name: 'ðŸŽ¯ Oyun ID', value: oyunId || 'Belirtilmedi', inline: true },
            { name: 'ðŸ“£ Nereden Duydun?', value: neredenDuydun || 'Belirtilmedi', inline: true },
            { name: 'ðŸ†” Discord', value: `<@${member.id}> (${member.user.tag})`, inline: false },
            { name: 'ðŸ“… Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `KullanÄ±cÄ± ID: ${member.id}` })
          .setTimestamp()]
        });
      }

      await member.send({ embeds: [new EmbedBuilder()
        .setTitle('ðŸŽ‰ Sunucumuza HoÅŸ Geldin!')
        .setDescription(
          `Merhaba **${isim}**! ArtÄ±k ailemizin bir parÃ§asÄ±sÄ±n. Seni aramÄ±zda gÃ¶rmek harika! ðŸ™Œ\n\n` +
          `ðŸ† **HaftalÄ±k Turnuva**\nHer **Cumartesi saat 20:00**'de Ã¶dÃ¼llÃ¼ turnuvamÄ±z var! KatÄ±lmak iÃ§in duyurularÄ±mÄ±zÄ± takip et, fÄ±rsatÄ± kaÃ§Ä±rma!\n\n` +
          `ðŸ’¬ **Sohbet & EÄŸlence**\nKanallarÄ±mÄ±zda Ã¶zgÃ¼rce sohbet et, yeni arkadaÅŸlar edin, birlikte oyna!\n\n` +
          (!oyunId ? `âš ï¸ **Oyun ID Girilmedi!**\nÃ–dÃ¼llÃ¼ turnuvalarda Ã¶dÃ¼l alabilmek iÃ§in Oyun ID'ni girmen gerekiyor. Bir yÃ¶neticiye ulaÅŸ ve gÃ¼ncellet!\n\n` : '') +
          `âš ï¸ **HatÄ±rlatma**\nGerÃ§ek bilgilerinle kayÄ±t olduÄŸun iÃ§in turnuvalarda Ã¶dÃ¼l kazanabilirsin. YanlÄ±ÅŸ bilgi tespit edilirse etkinlik haklarÄ±nÄ± kaybedebilirsin.\n\n` +
          `Herhangi bir sorun olursa yÃ¶neticilere ulaÅŸabilirsin. Ä°yi oyunlar! ðŸŽ®`
        )
        .setColor(0x5865F2)
        .setFooter({ text: 'KayÄ±t Sistemi' })
        .setTimestamp()]
      }).catch(() => {});

      await interaction.editReply({
        content: `âœ… **KayÄ±t baÅŸarÄ±lÄ±!**\nHoÅŸ geldin, **${isim}**! ArtÄ±k sunucunun tam Ã¼yesisin. ðŸŽ‰` +
          (!oyunId ? '\n\nâš ï¸ **Oyun ID girmedin!** Ã–dÃ¼l almak iÃ§in bir yÃ¶neticiye ulaÅŸ.' : '')
      });
    } catch (err) {
      console.error('KayÄ±t hatasÄ±:', err);
      await interaction.editReply({ content: 'âŒ Bir hata oluÅŸtu. YÃ¶netici ile iletiÅŸime geÃ§.' });
    }
  }

  // GÃ¼ncelleme modal submit
  if (interaction.isModalSubmit() && interaction.customId.startsWith('guncelle_modal_')) {
    await interaction.deferReply({ ephemeral: true });
    const hedefId = interaction.customId.replace('guncelle_modal_', '');

    const isim = interaction.fields.getTextInputValue('isim');
    const yas = interaction.fields.getTextInputValue('yas');
    const ign = interaction.fields.getTextInputValue('ign') || null;
    const oyunId = interaction.fields.getTextInputValue('oyunId') || null;
    const yasNum = parseInt(yas);

    if (isNaN(yasNum) || yasNum < 1 || yasNum > 100) {
      return interaction.editReply({ content: 'âŒ GeÃ§erli bir yaÅŸ gir (1-100 arasÄ±).' });
    }

    const guild = interaction.guild;
    const hedef = await guild.members.fetch(hedefId).catch(() => null);
    if (!hedef) return interaction.editReply({ content: 'âŒ KullanÄ±cÄ± bulunamadÄ±.' });

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
        .setTitle('âœï¸ KayÄ±t GÃ¼ncellendi')
        .setColor(0xFFA500)
        .addFields(
          { name: 'ðŸ‘¤ Ä°sim', value: isim, inline: true },
          { name: 'ðŸŽ‚ YaÅŸ', value: `${yasNum}`, inline: true },
          { name: 'ðŸŽ® IGN', value: ign || 'Belirtilmedi', inline: true },
          { name: 'ðŸŽ¯ Oyun ID', value: oyunId || 'Belirtilmedi', inline: true },
          { name: 'ðŸ†” Discord', value: `<@${hedefId}> (${hedef.user.tag})`, inline: false },
          { name: 'ðŸ›¡ï¸ GÃ¼ncelleyen', value: `<@${interaction.user.id}>`, inline: false },
          { name: 'ðŸ“… GÃ¼ncelleme Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: `KullanÄ±cÄ± ID: ${hedefId}` })
        .setTimestamp()]
      });
    }

    const logKanal = guild.channels.cache.get(process.env.LOG_KANAL_ID);
    if (logKanal) {
      await logKanal.send({ embeds: [new EmbedBuilder()
        .setTitle('âœï¸ KayÄ±t GÃ¼ncellendi')
        .setColor(0xFFA500)
        .addFields(
          { name: 'ðŸ‘¤ KullanÄ±cÄ±', value: `<@${hedefId}> (${hedef.user.tag})`, inline: false },
          { name: 'ðŸ›¡ï¸ GÃ¼ncelleyen', value: `<@${interaction.user.id}>`, inline: false },
          { name: 'ðŸ“ Yeni Bilgiler', value: `Ä°sim: ${isim} | YaÅŸ: ${yasNum} | IGN: ${ign || 'Belirtilmedi'} | Oyun ID: ${oyunId || 'Belirtilmedi'}`, inline: false }
        )
        .setTimestamp()]
      });
    }

    await interaction.editReply({ content: `âœ… **${hedef.user.tag}** kullanÄ±cÄ±sÄ±nÄ±n kaydÄ± gÃ¼ncellendi!` });
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
