// commands/rol.js
// !rolver @kullanici @rol — moderatore ozel
// !rolal @kullanici @rol — moderatore ozel

const { EmbedBuilder } = require('discord.js');

async function rolVer(message) {
  const hedef = message.mentions.members.first();
  const rol = message.mentions.roles.first();

  if (!hedef) return message.reply('Kullanici etiketle. Ornek: `!rolver @kullanici @rol`');
  if (!rol) return message.reply('Rol etiketle. Ornek: `!rolver @kullanici @rol`');

  if (hedef.roles.cache.has(rol.id)) {
    return message.reply(`**${hedef.user.tag}** zaten **${rol.name}** rolune sahip.`);
  }

  if (rol.position >= message.guild.members.me.roles.highest.position) {
    return message.reply('Bu rol botun rolunden yukarda, veremem.');
  }

  await hedef.roles.add(rol);

  const logKanal = message.guild.channels.cache.get(process.env.LOG_KANAL_ID);
  if (logKanal) {
    await logKanal.send({ embeds: [new EmbedBuilder()
      .setTitle('Rol Verildi')
      .setColor(0x57F287)
      .addFields(
        { name: 'Kullanici', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
        { name: 'Verilen Rol', value: `<@&${rol.id}>`, inline: true },
        { name: 'Islem Yapan', value: `<@${message.author.id}>`, inline: true },
        { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp()]
    });
  }

  await message.reply({ embeds: [new EmbedBuilder()
    .setTitle('Rol Verildi')
    .setColor(0x57F287)
    .addFields(
      { name: 'Kullanici', value: `<@${hedef.id}>`, inline: true },
      { name: 'Rol', value: `<@&${rol.id}>`, inline: true }
    )
    .setTimestamp()]
  });
}

async function rolAl(message) {
  const hedef = message.mentions.members.first();
  const rol = message.mentions.roles.first();

  if (!hedef) return message.reply('Kullanici etiketle. Ornek: `!rolal @kullanici @rol`');
  if (!rol) return message.reply('Rol etiketle. Ornek: `!rolal @kullanici @rol`');

  if (!hedef.roles.cache.has(rol.id)) {
    return message.reply(`**${hedef.user.tag}** zaten **${rol.name}** rolune sahip degil.`);
  }

  if (rol.position >= message.guild.members.me.roles.highest.position) {
    return message.reply('Bu rol botun rolunden yukarda, alamam.');
  }

  await hedef.roles.remove(rol);

  const logKanal = message.guild.channels.cache.get(process.env.LOG_KANAL_ID);
  if (logKanal) {
    await logKanal.send({ embeds: [new EmbedBuilder()
      .setTitle('Rol Alindi')
      .setColor(0xFF0000)
      .addFields(
        { name: 'Kullanici', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
        { name: 'Alinan Rol', value: `<@&${rol.id}>`, inline: true },
        { name: 'Islem Yapan', value: `<@${message.author.id}>`, inline: true },
        { name: 'Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp()]
    });
  }

  await message.reply({ embeds: [new EmbedBuilder()
    .setTitle('Rol Alindi')
    .setColor(0xFF0000)
    .addFields(
      { name: 'Kullanici', value: `<@${hedef.id}>`, inline: true },
      { name: 'Rol', value: `<@&${rol.id}>`, inline: true }
    )
    .setTimestamp()]
  });
}

module.exports = { rolVer, rolAl };
