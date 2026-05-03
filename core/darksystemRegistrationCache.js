const { createRegistrationRepository } = require('../data/darksystemRepositories');

function createDarkSystemRegistrationCache(guildId, logger = console) {
  const map = new Map();
  const repository = createRegistrationRepository();

  try {
    for (const row of repository.listByGuild(guildId)) {
      map.set(row.user_id, {
        isim: row.isim,
        yas: row.yas,
        ign: row.ign,
        oyunId: row.oyun_id,
        neredenDuydun: row.nereden_duydun,
        rank: row.rank,
        tarih: row.kayit_tarihi,
      });
    }
    logger.info?.('registration_cache_loaded', { count: map.size });
  } catch (error) {
    logger.warn?.('registration_cache_load_failed', { error });
  }

  const originalSet = map.set.bind(map);
  const originalDelete = map.delete.bind(map);

  map.set = (userId, value) => {
    originalSet(userId, value);
    try {
      repository.upsert(guildId, userId, value || {});
    } catch (error) {
      logger.error?.('registration_persist_failed', { userId, error });
    }
    return map;
  };

  map.delete = (userId) => {
    const deleted = originalDelete(userId);
    try {
      repository.delete(guildId, userId);
    } catch (error) {
      logger.error?.('registration_delete_failed', { userId, error });
    }
    return deleted;
  };

  return map;
}

module.exports = { createDarkSystemRegistrationCache };
