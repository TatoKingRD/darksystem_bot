function createDarkSystemCooldowns(defaultCooldownMs) {
  const userCooldowns = new Map();

  function check(userId, cooldownMs = defaultCooldownMs) {
    const now = Date.now();
    const lastUsedAt = userCooldowns.get(userId) || 0;
    const remainingMs = cooldownMs - (now - lastUsedAt);
    if (remainingMs > 0) return { allowed: false, remainingMs };
    userCooldowns.set(userId, now);
    return { allowed: true, remainingMs: 0 };
  }

  function prune(maxAgeMs = 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [userId, lastUsedAt] of userCooldowns.entries()) {
      if (lastUsedAt < cutoff) userCooldowns.delete(userId);
    }
  }

  return { check, prune, size: () => userCooldowns.size };
}

module.exports = { createDarkSystemCooldowns };
