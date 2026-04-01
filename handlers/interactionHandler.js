// handlers/interactionHandler.js
// Slash komutlar + buton + modal interaction'larını yönetir

const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = async function interactionHandler(client, interaction) {

  // ─── SLASH KOMUTLAR ───
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`/${interaction.commandName} hatası:`, err);
      const msg = { content: '❌ Komut çalışırken bir hata oluştu.', ephemeral: true 
  // ─── ANKET BUTONLARI ───
  if (interaction.isButton() && interaction.customId.startsWith('anket_')) {
    const msg = interaction.message;
    const embed = msg.embeds[0];
    if (!embed) return interaction.reply({ content: '❌ Anket bulunamadı.', ephemeral: true });

    // Anketi kapat
    if (interaction.customId === 'anket_kapat') {
      const isMod = process.env.MODERATOR_ROL_ID
        ? interaction.member.roles.cache.has(process.env.MODERATOR_ROL_ID)
        : interaction.member.permissions.has('Administrator');
      if (!isMod) return interaction.reply({ content: '❌ Sadece moderatörler anketi kapatabilir.', ephemeral: true });

      const kapalıEmbed = EmbedBuilder.from(embed).setColor(0x808080).setTitle('🔒 ' + embed.title.replace('📊 ', '')).setFooter({ text: embed.footer.text + ' • Kapatıldı' });
      await msg.edit({ embeds: [kapalıEmbed], components: [] });
      return interaction.reply({ content: '✅ Anket kapatıldı.', ephemeral: true });
    }

    // Oy ver
    const oylar = msg.reactions?.cache || new Map();
    const fields = embed.fields;
    const evetField = fields.find(f => f.name === '✅ Evet');
    const hayirField = fields.find(f => f.name === '❌ Hayır');

    let evetOy = parseInt(evetField?.value) || 0;
    let hayirOy = parseInt(hayirField?.value) || 0;

    // Kullanıcı daha önce oy verdi mi? (footer'da sakla)
    const oyVerenler = msg.components[0]?.components ? 
      (embed.description?.match(/OYVERENLER:(.*)/)?.[1]?.split(',') || []) : [];
    
    if (oyVerenler.includes(interaction.user.id)) {
      return interaction.reply({ content: '❌ Zaten oy verdin!', ephemeral: true });
    }

    if (interaction.customId === 'anket_evet') evetOy++;
    if (interaction.customId === 'anket_hayir') hayirOy++;

    oyVerenler.push(interaction.user.id);
    const toplamOy = evetOy + hayirOy;
    const evetYuzde = toplamOy > 0 ? Math.round((evetOy / toplamOy) * 100) : 0;
    const hayirYuzde = toplamOy > 0 ? Math.round((hayirOy / toplamOy) * 100) : 0;

    const baslik = embed.title;
    const aciklama = embed.description?.replace(/
OYVERENLER:.*/s, '') || null;

    const yeniEmbed = new EmbedBuilder()
      .setTitle(baslik)
      .setColor(0x5865F2)
      .addFields(
        { name: '✅ Evet', value: `${evetOy} oy (${evetYuzde}%)`, inline: true },
        { name: '❌ Hayır', value: `${hayirOy} oy (${hayirYuzde}%)`, inline: true },
      )
      .setFooter({ text: embed.footer.text })
      .setTimestamp(embed.timestamp ? new Date(embed.timestamp) : null);

    if (aciklama) yeniEmbed.setDescription(aciklama + '
OYVERENLER:' + oyVerenler.join(','));
    else yeniEmbed.setDescription('OYVERENLER:' + oyVerenler.join(','));

    await msg.edit({ embeds: [yeniEmbed] });
    return interaction.reply({ content: `✅ Oyun kaydedildi! (${interaction.customId === 'anket_evet' ? 'Evet' : 'Hayır'})`, ephemeral: true });
  }

};
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
    return;
  }

  const kayitVerisi = client.kayitVerisi;

  // ─── KAYIT BAŞLAT BUTONU ───
  if (interaction.isButton() && interaction.customId === 'kayit_baslat') {
    if (interaction.member.roles.cache.has(process.env.KAYITLI_ROL_ID)) {
      return interaction.reply({ content: '✅ Zaten kayıtlısın!', ephemeral: true });
    }
    const modal = new ModalBuilder().setCustomId('kayit_modal').setTitle('Kayıt Formu');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('isim').setLabel('Adın')
          .setPlaceholder('Örnek: Emre').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('yas').setLabel('Yaşın')
          .setPlaceholder('Örnek: 18').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('ign').setLabel('IGN — Oyun Kullanıcı Adı (Opsiyonel)')
          .setPlaceholder('MLBB nickini gir ya da boş bırak').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(64)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('oyunId').setLabel('⚠️ Oyun ID — ID YOK = ÖDÜL YOK!')
          .setPlaceholder('Örnek: 123456789 (1234)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(32)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nereden').setLabel('Bizi nereden duydun? (Opsiyonel)')
          .setPlaceholder('disboard / dscv / arkadaş / diğer').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(64)
      )
    );
    await interaction.showModal(modal);
  }

  // ─── GÜNCELLEME BUTONU ───
  if (interaction.isButton() && interaction.customId.startsWith('guncelle_baslat_')) {
    if (!interaction.member?.permissions.has('Administrator') && !interaction.member?.roles.cache.has(process.env.MODERATOR_ROL_ID)) {
      return interaction.reply({ content: '❌ Bu butonu sadece yöneticiler kullanabilir.', ephemeral: true });
    }
    const hedefId = interaction.customId.replace('guncelle_baslat_', '');
    let mevcutBilgi = kayitVerisi.get(hedefId);

    if (!mevcutBilgi) {
      const arsivKanal = interaction.guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
      if (arsivKanal) {
        let lastId = null;
        outer: while (true) {
          const options = { limit: 100 };
          if (lastId) options.before = lastId;
          const mesajlar = await arsivKanal.messages.fetch(options);
          if (mesajlar.size === 0) break;
          for (const [, msg] of mesajlar) {
            if (msg.embeds.length > 0 && msg.embeds[0].footer?.text === `Kullanıcı ID: ${hedefId}`) {
              const fields = {};
              for (const f of msg.embeds[0].fields) fields[f.name] = f.value;
              mevcutBilgi = {
                isim: (fields['👤 İsim'] || '').trim(),
                yas: parseInt((fields['🎂 Yaş'] || '0').trim()) || 0,
                ign: (fields['🎮 IGN'] || '').trim() === 'Belirtilmedi' ? null : (fields['🎮 IGN'] || '').trim() || null,
                oyunId: (fields['🎯 Oyun ID'] || '').trim() === 'Belirtilmedi' ? null : (fields['🎯 Oyun ID'] || '').trim() || null,
              };
              break outer;
            }
          }
          if (mesajlar.size < 100) break;
          lastId = mesajlar.last().id;
        }
      }
    }

    const modal = new ModalBuilder().setCustomId(`guncelle_modal_${hedefId}`).setTitle('Kayıt Güncelleme Formu');

    const isimInput = new TextInputBuilder().setCustomId('isim').setLabel('Yeni İsim')
      .setPlaceholder('Örnek: Emre').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32);
    if (mevcutBilgi?.isim) isimInput.setValue(mevcutBilgi.isim);

    const yasInput = new TextInputBuilder().setCustomId('yas').setLabel('Yeni Yaş')
      .setPlaceholder('Örnek: 18').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3);
    if (mevcutBilgi?.yas) yasInput.setValue(`${mevcutBilgi.yas}`);

    const ignInput = new TextInputBuilder().setCustomId('ign').setLabel('Yeni IGN (Opsiyonel)')
      .setPlaceholder('MLBB nickini gir ya da boş bırak').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(64);
    if (mevcutBilgi?.ign) ignInput.setValue(mevcutBilgi.ign);

    const oyunIdInput = new TextInputBuilder().setCustomId('oyunId').setLabel('Yeni Oyun ID (Opsiyonel)')
      .setPlaceholder('Örnek: 123456789 (1234)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(32);
    if (mevcutBilgi?.oyunId) oyunIdInput.setValue(mevcutBilgi.oyunId);

    modal.addComponents(
      new ActionRowBuilder().addComponents(isimInput),
      new ActionRowBuilder().addComponents(yasInput),
      new ActionRowBuilder().addComponents(ignInput),
      new ActionRowBuilder().addComponents(oyunIdInput)
    );
    await interaction.showModal(modal);
  }

  // ─── KAYIT MODAL SUBMIT ───
  if (interaction.isModalSubmit() && interaction.customId === 'kayit_modal') {
    await interaction.deferReply({ ephemeral: true });

    const isim = interaction.fields.getTextInputValue('isim');
    const yas = interaction.fields.getTextInputValue('yas');
    const ign = interaction.fields.getTextInputValue('ign') || null;
    const oyunId = interaction.fields.getTextInputValue('oyunId') || null;
    const neredenDuydun = interaction.fields.getTextInputValue('nereden') || null;
    const yasNum = parseInt(yas);

    if (isNaN(yasNum) || yasNum < 1 || yasNum > 100) return interaction.editReply({ content: '❌ Geçerli bir yaş gir (1-100 arası).' });
    if (yasNum < 13) return interaction.editReply({ content: '❌ Sunucumuza katılmak için en az **13 yaşında** olman gerekiyor.' });

    const guild = interaction.guild;
    const member = interaction.member;
    const logKanal = guild.channels.cache.get(process.env.LOG_KANAL_ID);

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
      // Member'ı fresh fetch et — cache'deki eski veriyle rol sorunlarını önler
      const freshMember = await guild.members.fetch(member.id).catch(() => member);

      if (process.env.KAYITLI_ROL_ID) {
        await freshMember.roles.add(process.env.KAYITLI_ROL_ID).catch(err => {
          console.error('Kayıtlı rol eklenemedi:', err);
        });
      }
      if (process.env.KAYITSIZ_ROL_ID) {
        await freshMember.roles.remove(process.env.KAYITSIZ_ROL_ID).catch(err => {
          console.error('Kayıtsız rol alınamadı:', err);
        });
      }
      const nick = ign ? `${isim} (${ign}) | ${yasNum}` : `${isim} | ${yasNum}`;
      await freshMember.setNickname(nick).catch(() => {});

      kayitVerisi.set(member.id, { isim, yas: yasNum, ign, oyunId, neredenDuydun, tarih: Math.floor(Date.now() / 1000) });

      const arsivKanal = guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
      const kayitFields = [
        { name: '👤 İsim', value: isim, inline: true },
        { name: '🎂 Yaş', value: `${yasNum}`, inline: true },
        { name: '🎮 IGN', value: ign || 'Belirtilmedi', inline: true },
        { name: '🎯 Oyun ID', value: oyunId || 'Belirtilmedi', inline: true },
        { name: '📣 Nereden Duydun?', value: neredenDuydun || 'Belirtilmedi', inline: true },
        { name: '🆔 Discord', value: `<@${member.id}> (${member.user.tag})`, inline: false },
        { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      ];

      if (arsivKanal) {
        await arsivKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('📁 Yeni Kayıt').setColor(0x57F287)
          .addFields(kayitFields).setFooter({ text: `Kullanıcı ID: ${member.id}` }).setTimestamp()]
        });
      }
      if (logKanal) {
        await logKanal.send({ embeds: [new EmbedBuilder()
          .setTitle('✅ Yeni Kayıt').setColor(0x57F287)
          .addFields(kayitFields).setFooter({ text: `Kullanıcı ID: ${member.id}` }).setTimestamp()]
        });
      }

      await member.send({ embeds: [new EmbedBuilder()
        .setTitle('🎉 Sunucumuza Hoş Geldin!')
        .setDescription(
          `Merhaba **${isim}**! Artık ailemizin bir parçasısın. 🙌\n\n` +
          `🏆 **Haftalık Turnuva**\nHer **Cumartesi saat 20:00**'de ödüllü turnuvamız var!\n\n` +
          `💬 **Sohbet & Eğlence**\nKanallarımızda özgürce sohbet et!\n\n` +
          (!oyunId ? `⚠️ **Oyun ID Girilmedi!**\nÖdül almak için Oyun ID'ni girmen gerekiyor. Yönetici ile iletişime geç!\n\n` : '') +
          `İyi oyunlar! 🎮`
        )
        .setColor(0x5865F2).setFooter({ text: 'Kayıt Sistemi' }).setTimestamp()]
      }).catch(() => {});

      await interaction.editReply({
        content: `✅ **Kayıt başarılı!** Hoş geldin, **${isim}**! 🎉` +
          (!oyunId ? '\n\n⚠️ **Oyun ID girmedin!** Ödül almak için yöneticiye ulaş.' : '')
      });
    } catch (err) {
      console.error('Kayıt hatası:', err);
      await interaction.editReply({ content: '❌ Bir hata oluştu. Yönetici ile iletişime geç.' });
    }
  }

  // ─── GÜNCELLEME MODAL SUBMIT ───
  if (interaction.isModalSubmit() && interaction.customId.startsWith('guncelle_modal_')) {
    await interaction.deferReply({ ephemeral: true });
    const hedefId = interaction.customId.replace('guncelle_modal_', '');

    const isim = interaction.fields.getTextInputValue('isim');
    const yas = interaction.fields.getTextInputValue('yas');
    const ign = interaction.fields.getTextInputValue('ign') || null;
    const oyunId = interaction.fields.getTextInputValue('oyunId') || null;
    const yasNum = parseInt(yas);

    if (isNaN(yasNum) || yasNum < 1 || yasNum > 100) return interaction.editReply({ content: '❌ Geçerli bir yaş gir (1-100 arası).' });

    const guild = interaction.guild;
    const hedef = await guild.members.fetch(hedefId).catch(() => null);
    if (!hedef) return interaction.editReply({ content: '❌ Kullanıcı bulunamadı.' });

    const eskiBilgi = kayitVerisi.get(hedefId);
    kayitVerisi.set(hedefId, { isim, yas: yasNum, ign, oyunId, neredenDuydun: eskiBilgi?.neredenDuydun || null, tarih: eskiBilgi?.tarih || Math.floor(Date.now() / 1000) });

    const nick = ign ? `${isim} (${ign}) | ${yasNum}` : `${isim} | ${yasNum}`;
    await hedef.setNickname(nick).catch(() => {});

    const arsivKanal = guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
    if (arsivKanal) {
      await arsivKanal.send({ embeds: [new EmbedBuilder()
        .setTitle('✏️ Kayıt Güncellendi').setColor(0xFFA500)
        .addFields(
          { name: '👤 İsim', value: isim, inline: true },
          { name: '🎂 Yaş', value: `${yasNum}`, inline: true },
          { name: '🎮 IGN', value: ign || 'Belirtilmedi', inline: true },
          { name: '🎯 Oyun ID', value: oyunId || 'Belirtilmedi', inline: true },
          { name: '🆔 Discord', value: `<@${hedefId}> (${hedef.user.tag})`, inline: false },
          { name: '🛡️ Güncelleyen', value: `<@${interaction.user.id}>`, inline: false },
          { name: '📅 Güncelleme Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
        )
        .setFooter({ text: `Kullanıcı ID: ${hedefId}` }).setTimestamp()]
      });
    }

    const logKanal = guild.channels.cache.get(process.env.LOG_KANAL_ID);
    if (logKanal) {
      await logKanal.send({ embeds: [new EmbedBuilder()
        .setTitle('✏️ Kayıt Güncellendi').setColor(0xFFA500)
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
};