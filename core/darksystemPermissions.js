function isOwner(userId, config) {
  return Boolean(userId && config?.ownerIds?.includes(userId));
}

function isModerator(member) {
  if (!member) return false;
  if (process.env.MODERATOR_ROL_ID && member.roles?.cache?.has(process.env.MODERATOR_ROL_ID)) {
    return true;
  }
  return Boolean(member.permissions?.has?.('Administrator'));
}

function isAssistant(member) {
  if (!member || !process.env.ASISTAN_ROL_ID) return false;
  return Boolean(member.roles?.cache?.has(process.env.ASISTAN_ROL_ID));
}

function isStaff(member, config) {
  return isOwner(member?.id || member?.user?.id, config) || isModerator(member) || isAssistant(member);
}

function requireStaff(interaction, config) {
  if (isStaff(interaction.member, config)) return true;
  return false;
}

module.exports = {
  isOwner,
  isModerator,
  isAssistant,
  isStaff,
  requireStaff,
};
