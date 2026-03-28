const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message]
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // !panel komutu
  if (message.content === '!panel' && message.member?.permissions.has('Administrator')) {
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

  // !kayitsil komutu
  if (message.content.startsWith('!kayitsil') && message.member?.permissions.has('Administrator')) {
    const hedef = message.mentions.members.first();
    if (!hedef) return message.reply('❌ Bir kullanıcı etiketle. Örnek: `!kayitsil @kullanıcı`');

    try {
      if (process.env.KAYITLI_ROL_ID) await hedef.roles.remove(process.env.KAYITLI_ROL_ID).catch(() => {});
      if (process.env.KAYITSIZ_ROL_ID) await hedef.roles.add(process.env.KAYITSIZ_ROL_ID).catch(() => {});
      await hedef.setNickname(null).catch(() => {});
      await message.reply(`✅ **${hedef.user.tag}** kullanıcısının kaydı sıfırlandı.`);

      const logKanal = message.guild.channels.cache.get(process.env.LOG_KANAL_ID);
      if (logKanal) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🗑️ Kayıt Silindi')
          .setColor(0xFF0000)
          .addFields(
            { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
            { name: '🛡️ İşlemi Yapan', value: `<@${message.author.id}>`, inline: false },
            { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `Kullanıcı ID: ${hedef.id}` });
        await logKanal.send({ embeds: [logEmbed] });
      }
    } catch (err) {
      console.error('Kayıt silme hatası:', err);
      await message.reply('❌ Bir hata oluştu.');
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'kayit_baslat') {
    if (interaction.member.roles.cache.has(process.env.KAYITLI_ROL_ID)) {
      return interaction.reply({ content: '✅ Zaten kayıtlısın!', ephemeral: true });
    }
    const modal = new ModalBuilder().setCustomId('kayit_modal').setTitle('Kayıt Formu');
    const isimInput = new TextInputBuilder().setCustomId('isim').setLabel('Adın').setPlaceholder('Örnek: Emre').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32);
    const yasInput = new TextInputBuilder().setCustomId('yas').setLabel('Yaşın').setPlaceholder('Örnek: 18').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3);
    const ignInput = new TextInputBuilder().setCustomId('ign').setLabel('Oyun Kullanıcı Adı (Opsiyonel)').setPlaceholder('MLBB nickini gir ya da boş bırak').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(64);
    modal.addComponents(
      new ActionRowBuilder().addComponents(isimInput),
      new ActionRowBuilder().addComponents(yasInput),
      new ActionRowBuilder().addComponents(ignInput)
    );
    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'kayit_modal') {
    await interaction.deferReply({ ephemeral: true });
    const isim = interaction.fields.getTextInputValue('isim');
    const yas = interaction.fields.getTextInputValue('yas');
    const ign = interaction.fields.getTextInputValue('ign') || null;
    const yasNum = parseInt(yas);
    if (isNaN(yasNum) || yasNum < 1 || yasNum > 100) {
      return interaction.editReply({ content: '❌ Geçerli bir yaş gir (1-100 arası).' });
    }
    const guild = interaction.guild;
    const member = interaction.member;
    try {
      if (process.env.KAYITLI_ROL_ID) await member.roles.add(process.env.KAYITLI_ROL_ID);
      if (process.env.KAYITSIZ_ROL_ID) await member.roles.remove(process.env.KAYITSIZ_ROL_ID).catch(() => {});
      const nick = ign ? `${isim} (${ign}) | ${yasNum}` : `${isim} | ${yasNum}`;
      await member.setNickname(nick).catch(() => {});

      // Arşiv kanalı
      const arsivKanal = guild.channels.cache.get(process.env.ARSIV_KANAL_ID);
      if (arsivKanal) {
        const arsivEmbed = new EmbedBuilder()
          .setTitle('📁 Yeni Kayıt')
          .setColor(0x57F287)
          .addFields(
            { name: '👤 İsim', value: isim, inline: true },
            { name: '🎂 Yaş', value: `${yasNum}`, inline: true },
            { name: '🎮 IGN', value: ign || 'Belirtilmedi', inline: true },
            { name: '🆔 Discord', value: `<@${member.id}> (${member.user.tag})`, inline: false },
            { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `Kullanıcı ID: ${member.id}` });
        await arsivKanal.send({ embeds: [arsivEmbed] });
      }

      // Log kanalı
      const logKanal = guild.channels.cache.get(process.env.LOG_KANAL_ID);
      if (logKanal) {
        const logEmbed = new EmbedBuilder()
          .setTitle('✅ Yeni Kayıt')
          .setColor(0x57F287)
          .addFields(
            { name: '👤 İsim', value: isim, inline: true },
            { name: '🎂 Yaş', value: `${yasNum}`, inline: true },
            { name: '🎮 IGN', value: ign || 'Belirtilmedi', inline: true },
            { name: '🆔 Discord', value: `<@${member.id}> (${member.user.tag})`, inline: false },
            { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
          )
          .setFooter({ text: `Kullanıcı ID: ${member.id}` });
        await logKanal.send({ embeds: [logEmbed] });
      }

      // Hoş geldin DM
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎉 Sunucumuza Hoş Geldin!')
            .setDescription(
              `Merhaba **${isim}**! Artık ailemizin bir parçasısın. Seni aramızda görmek harika! 🙌\n\n` +
              `🏆 **Haftalık Turnuva**\nHer **Cumartesi saat 20:00**'de ödüllü turnuvamız var! Katılmak için duyurularımızı takip et, fırsatı kaçırma!\n\n` +
              `💬 **Sohbet & Eğlence**\nKanallarımızda özgürce sohbet et, yeni arkadaşlar edin, birlikte oyna!\n\n` +
              `⚠️ **Hatırlatma**\nGerçek bilgilerinle kayıt olduğun için turnuvalarda ödül kazanabilirsin. Yanlış bilgi tespit edilirse etkinlik haklarını kaybedebilirsin.\n\n` +
              `Herhangi bir sorun olursa yöneticilere ulaşabilirsin. İyi oyunlar! 🎮`
            )
            .setColor(0x5865F2)
            .setFooter({ text: 'Kayıt Sistemi' })
            .setTimestamp()
        ]
      }).catch(() => {});

      await interaction.editReply({ content: `✅ **Kayıt başarılı!**\nHoş geldin, **${isim}**! Artık sunucunun tam üyesisin. 🎉` });
    } catch (err) {
      console.error('Kayıt hatası:', err);
      await interaction.editReply({ content: '❌ Bir hata oluştu. Yönetici ile iletişime geç.' });
    }
  }
});

client.on('guildMemberAdd', async (member) => {
  if (process.env.KAYITSIZ_ROL_ID) await member.roles.add(process.env.KAYITSIZ_ROL_ID).catch(console.error);
});

client.once('ready', () => { console.log(`Bot aktif: ${client.user.tag}`); });
client.login(process.env.BOT_TOKEN);
