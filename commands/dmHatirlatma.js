// commands/dmHatirlatma.js
// Yeni üye gelince 24 saat bekler, hala kayıtsızsa DM atar

const { EmbedBuilder } = require('discord.js');

const BEKLEME_SURESI = 24 * 60 * 60 * 1000; // 24 saat

module.exports = async function dmHatirlatmaBaşlat(member) {
  setTimeout(async () => {
    try {
      const guncelMember = await member.guild.members.fetch(member.id).catch(() => null);
      if (!guncelMember) return;

      const kayitliRolId = process.env.KAYITLI_ROL_ID;
      if (kayitliRolId && guncelMember.roles.cache.has(kayitliRolId)) return;

      await guncelMember.send({ embeds: [new EmbedBuilder()
        .setTitle('📋 Henüz Kayıt Olmadın!')
        .setColor(0xFFA500)
        .setDescription(
          `Merhaba! **${member.guild.name}** sunucusuna katıldın ama henüz kayıt olmadın.\n\n` +
          `Kayıt olmadan bazı kanallara erişemezsin.\n\n` +
          `✅ Hemen kayıt ol, sunucunun tüm özelliklerinden faydalan!\n\n` +
          `Kayıt kanalına git ve 📝 **Kayıt Ol** butonuna tıkla.`
        )
        .setFooter({ text: member.guild.name })
        .setTimestamp()]
      }).catch(() => {});

    } catch (err) {
      console.error('DM hatırlatma hatası:', err);
    }
  }, BEKLEME_SURESI);
};