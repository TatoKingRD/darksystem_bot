// commands/rol.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function isMod(member) {
  return process.env.MODERATOR_ROL_ID
    ? member.roles.cache.has(process.env.MODERATOR_ROL_ID)
    : member.permissions.has('Administrator');
}

// ─── /rolver ───
const rolverData = new SlashCommandBuilder()
  .setName('rolver')
  .setDescription('Kullanıcıya rol verir [Moderatör]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
  .addRoleOption(opt => opt.setName('rol').setDescription('Verilecek rol').setRequired(true));

async function rolverExecute(interaction) {
  if (!isMod(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const hedef = interaction.options.getMember('kullanici');
  const rol = interaction.options.getRole('rol');

  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

  if (hedef.roles.cache.has(rol.id))
    return interaction.reply({ content: `**${hedef.user.tag}** zaten **${rol.name}** rolüne sahip.`, ephemeral: true });

  if (rol.position >= interaction.guild.members.me.roles.highest.position)
    return interaction.reply({ content: '❌ Bu rol botun rolünden yukarda, veremem.', ephemeral: true });

  if (rol.position >= interaction.member.roles.highest.position)
    return interaction.reply({ content: '❌ Kendi rolünden yüksek veya eşit bir rolü veremezsin.', ephemeral: true });

  if (interaction.member.roles.highest.position <= hedef.roles.highest.position)
    return interaction.reply({ content: '❌ Kendi rolünden yüksek veya eşit roldeki birine işlem yapamazsın.', ephemeral: true });

  await hedef.roles.add(rol);

  const logKanal = interaction.guild.channels.cache.get(process.env.LOG_KANAL_ID);
  if (logKanal) {
    await logKanal.send({ embeds: [new EmbedBuilder()
      .setTitle('✅ Rol Verildi')
      .setColor(0x57F287)
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
        { name: '🎭 Verilen Rol', value: `<@&${rol.id}>`, inline: true },
        { name: '🛡️ İşlem Yapan', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp()]
    });
  }

  await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
    .setTitle('✅ Rol Verildi')
    .setColor(0x57F287)
    .addFields(
      { name: '👤 Kullanıcı', value: `<@${hedef.id}>`, inline: true },
      { name: '🎭 Rol', value: `<@&${rol.id}>`, inline: true }
    )
    .setTimestamp()]
  });
}

// ─── /rolal ───
const rotalData = new SlashCommandBuilder()
  .setName('rolal')
  .setDescription('Kullanıcıdan rol alır [Moderatör]')
  .addUserOption(opt => opt.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
  .addRoleOption(opt => opt.setName('rol').setDescription('Alınacak rol').setRequired(true));

async function rotalExecute(interaction) {
  if (!isMod(interaction.member)) return interaction.reply({ content: '❌ Bu komutu kullanma yetkin yok.', ephemeral: true });

  const hedef = interaction.options.getMember('kullanici');
  const rol = interaction.options.getRole('rol');

  if (!hedef) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', ephemeral: true });

  if (!hedef.roles.cache.has(rol.id))
    return interaction.reply({ content: `**${hedef.user.tag}** zaten **${rol.name}** rolüne sahip değil.`, ephemeral: true });

  if (rol.position >= interaction.guild.members.me.roles.highest.position)
    return interaction.reply({ content: '❌ Bu rol botun rolünden yukarda, alamam.', ephemeral: true });

  if (interaction.member.roles.highest.position <= hedef.roles.highest.position)
    return interaction.reply({ content: '❌ Kendi rolünden yüksek veya eşit roldeki birinin rolünü alamazsın.', ephemeral: true });

  await hedef.roles.remove(rol);

  const logKanal = interaction.guild.channels.cache.get(process.env.LOG_KANAL_ID);
  if (logKanal) {
    await logKanal.send({ embeds: [new EmbedBuilder()
      .setTitle('❌ Rol Alındı')
      .setColor(0xFF0000)
      .addFields(
        { name: '👤 Kullanıcı', value: `<@${hedef.id}> (${hedef.user.tag})`, inline: false },
        { name: '🎭 Alınan Rol', value: `<@&${rol.id}>`, inline: true },
        { name: '🛡️ İşlem Yapan', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📅 Tarih', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setTimestamp()]
    });
  }

  await interaction.reply({ ephemeral: true, embeds: [new EmbedBuilder()
    .setTitle('❌ Rol Alındı')
    .setColor(0xFF0000)
    .addFields(
      { name: '👤 Kullanıcı', value: `<@${hedef.id}>`, inline: true },
      { name: '🎭 Rol', value: `<@&${rol.id}>`, inline: true }
    )
    .setTimestamp()]
  });
}

const commands = [
  { data: rolverData, execute: rolverExecute },
  { data: rotalData, execute: rotalExecute },
];

module.exports = { commands };
