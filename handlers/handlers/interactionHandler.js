// handlers/interactionHandler.js
// Buton ve modal interaction'larını yönetir

const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = async function interactionHandler(client, interaction) {
  const kayitVerisi = client.kayitVerisi;

  // ─── Kayıt başlat butonu ───
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

  // ─── Güncelleme butonu → modal aç ───
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

  // ─── Kayıt modal submit ───
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

  // ─── Güncelleme modal submit ───
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
};
