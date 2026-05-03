const { getDarkSystemDatabase } = require('./darksystemSqlite');

function createRegistrationRepository() {
  return {
    listByGuild(guildId) {
      const db = requireDb();
      return db.prepare('SELECT * FROM registrations WHERE guild_id = ?').all(guildId);
    },
    upsert(guildId, userId, data) {
      const db = requireDb();
      db.prepare(`
        INSERT INTO registrations (
          guild_id, user_id, isim, yas, ign, oyun_id, nereden_duydun, rank, kayit_tarihi, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
          isim = excluded.isim,
          yas = excluded.yas,
          ign = excluded.ign,
          oyun_id = excluded.oyun_id,
          nereden_duydun = excluded.nereden_duydun,
          rank = excluded.rank,
          kayit_tarihi = excluded.kayit_tarihi,
          updated_at = excluded.updated_at
      `).run(
        guildId,
        userId,
        data.isim ?? null,
        data.yas ?? null,
        data.ign ?? null,
        data.oyunId ?? data.oyun_id ?? null,
        data.neredenDuydun ?? data.nereden_duydun ?? null,
        data.rank ?? null,
        data.tarih ?? data.kayit_tarihi ?? nowSeconds(),
        nowSeconds()
      );
    },
    delete(guildId, userId) {
      requireDb().prepare('DELETE FROM registrations WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
    },
  };
}

function createWarningRepository() {
  return {
    add(guildId, userId, moderatorId, sebep) {
      requireDb().prepare(`
        INSERT INTO warnings (guild_id, user_id, moderator_id, sebep, active, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(guildId, userId, moderatorId ?? null, sebep ?? null, nowSeconds());
    },
    list(guildId, userId) {
      return requireDb().prepare(`
        SELECT * FROM warnings
        WHERE guild_id = ? AND user_id = ? AND active = 1
        ORDER BY created_at ASC, id ASC
      `).all(guildId, userId);
    },
    removeByNumber(guildId, userId, number) {
      const rows = this.list(guildId, userId);
      const row = rows[number - 1];
      if (!row) return null;
      requireDb().prepare('UPDATE warnings SET active = 0 WHERE id = ?').run(row.id);
      return row;
    },
  };
}

function createInviteRepository() {
  return {
    loadUsers(guildId) {
      return requireDb().prepare('SELECT * FROM invite_users WHERE guild_id = ?').all(guildId);
    },
    loadMemberLinks(guildId) {
      return requireDb().prepare('SELECT * FROM invite_members WHERE guild_id = ?').all(guildId);
    },
    upsertUser(guildId, userId, realCount, fakeCount) {
      requireDb().prepare(`
        INSERT INTO invite_users (guild_id, user_id, real_count, fake_count, updated_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
          real_count = excluded.real_count,
          fake_count = excluded.fake_count,
          updated_at = excluded.updated_at
      `).run(guildId, userId, realCount || 0, fakeCount || 0, nowSeconds());
    },
    upsertMemberLink(guildId, memberId, link) {
      requireDb().prepare(`
        INSERT INTO invite_members (guild_id, member_id, inviter_id, invite_code, joined_at, left_at, is_fake)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, member_id) DO UPDATE SET
          inviter_id = excluded.inviter_id,
          invite_code = excluded.invite_code,
          joined_at = excluded.joined_at,
          left_at = excluded.left_at,
          is_fake = excluded.is_fake
      `).run(
        guildId,
        memberId,
        link.davetEdenId ?? link.inviter_id ?? null,
        link.kodId ?? link.invite_code ?? null,
        link.zaman ?? link.joined_at ?? null,
        link.leftAt ?? link.left_at ?? null,
        (link.sahte ?? link.is_fake) ? 1 : 0
      );
    },
  };
}

function createFunCounterRepository() {
  return {
    loadAll(guildId) {
      return requireDb().prepare('SELECT * FROM fun_counters WHERE guild_id = ?').all(guildId);
    },
    setCount(guildId, userId, commandName, targetUserId, count) {
      requireDb().prepare(`
        INSERT INTO fun_counters (guild_id, user_id, command_name, target_user_id, count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(guild_id, user_id, command_name, target_user_id) DO UPDATE SET
          count = excluded.count,
          updated_at = excluded.updated_at
      `).run(guildId, userId, commandName, targetUserId || '', count || 0, nowSeconds());
    },
  };
}

function createAiHistoryRepository() {
  return {
    get(userId, limit = 20) {
      return requireDb().prepare(`
        SELECT role, content FROM ai_history
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `).all(userId, limit).reverse();
    },
    replace(userId, history, limit = 20) {
      const db = requireDb();
      const recent = history.slice(-limit);
      const insert = db.prepare('INSERT INTO ai_history (user_id, role, content, created_at) VALUES (?, ?, ?, ?)');
      db.exec('BEGIN');
      try {
        db.prepare('DELETE FROM ai_history WHERE user_id = ?').run(userId);
        for (const item of recent) {
          if (!item?.role || !item?.content) continue;
          insert.run(userId, item.role, String(item.content).slice(0, 4000), nowSeconds());
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

function createReminderRepository() {
  return {
    upsert(guildId, commandName, data) {
      requireDb().prepare(`
        INSERT INTO reminders (guild_id, command_name, channel_id, minutes, started_by, started_at, message_id, active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(guild_id, command_name) DO UPDATE SET
          channel_id = excluded.channel_id,
          minutes = excluded.minutes,
          started_by = excluded.started_by,
          started_at = excluded.started_at,
          message_id = excluded.message_id,
          active = 1,
          updated_at = excluded.updated_at
      `).run(
        guildId,
        commandName,
        data.channelId,
        data.minutes,
        data.startedBy ?? null,
        data.startedAt ?? nowSeconds(),
        data.messageId ?? null,
        nowSeconds()
      );
    },
    deactivate(guildId, commandName) {
      requireDb().prepare(`
        UPDATE reminders SET active = 0, updated_at = ?
        WHERE guild_id = ? AND command_name = ?
      `).run(nowSeconds(), guildId, commandName);
    },
    listActive(guildId) {
      return requireDb().prepare(`
        SELECT * FROM reminders WHERE guild_id = ? AND active = 1 ORDER BY command_name ASC
      `).all(guildId);
    },
  };
}

function createPollRepository() {
  return {
    addVote(messageId, userId, choice) {
      const result = requireDb().prepare(`
        INSERT OR IGNORE INTO poll_votes (message_id, user_id, choice, created_at)
        VALUES (?, ?, ?, ?)
      `).run(messageId, userId, choice, nowSeconds());
      return result.changes > 0;
    },
    counts(messageId) {
      const rows = requireDb().prepare(`
        SELECT choice, COUNT(*) AS count FROM poll_votes WHERE message_id = ? GROUP BY choice
      `).all(messageId);
      return Object.fromEntries(rows.map((row) => [row.choice, row.count]));
    },
    voters(messageId) {
      return requireDb().prepare(`
        SELECT user_id, choice, created_at FROM poll_votes WHERE message_id = ? ORDER BY created_at ASC
      `).all(messageId);
    },
  };
}

function createGiveawayRepository() {
  return {
    create(data) {
      requireDb().prepare(`
        INSERT INTO giveaways (
          giveaway_id, message_id, guild_id, channel_id, prize, ends_at, created_by, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(
        data.giveawayId,
        data.messageId ?? null,
        data.guildId,
        data.channelId,
        data.prize,
        data.endsAt,
        data.createdBy ?? null,
        nowSeconds(),
        nowSeconds()
      );
    },
    addEntry(giveawayId, userId) {
      const result = requireDb().prepare(`
        INSERT OR IGNORE INTO giveaway_entries (giveaway_id, user_id, created_at)
        VALUES (?, ?, ?)
      `).run(giveawayId, userId, nowSeconds());
      return result.changes > 0;
    },
    get(giveawayId) {
      return requireDb().prepare('SELECT * FROM giveaways WHERE giveaway_id = ?').get(giveawayId);
    },
    entries(giveawayId) {
      return requireDb().prepare(`
        SELECT user_id FROM giveaway_entries WHERE giveaway_id = ? ORDER BY created_at ASC
      `).all(giveawayId).map((row) => row.user_id);
    },
    finish(giveawayId, winnerId = null) {
      requireDb().prepare(`
        UPDATE giveaways SET status = 'finished', winner_id = ?, updated_at = ?
        WHERE giveaway_id = ?
      `).run(winnerId, nowSeconds(), giveawayId);
    },
  };
}

function createSettingsRepository() {
  return {
    list(guildId) {
      return requireDb().prepare('SELECT key, value, updated_at FROM settings WHERE guild_id = ? ORDER BY key ASC').all(guildId);
    },
    get(guildId, key) {
      return requireDb().prepare('SELECT value FROM settings WHERE guild_id = ? AND key = ?').get(guildId, key)?.value ?? null;
    },
    set(guildId, key, value) {
      requireDb().prepare(`
        INSERT INTO settings (guild_id, key, value, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(guild_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(guildId, key, value, nowSeconds());
    },
  };
}

function createAuditRepository() {
  return {
    add(eventType, payload = {}) {
      requireDb().prepare(`
        INSERT INTO audit_log (event_type, guild_id, actor_id, target_id, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        eventType,
        payload.guildId ?? null,
        payload.actorId ?? null,
        payload.targetId ?? null,
        JSON.stringify(payload.details ?? {}),
        nowSeconds()
      );
    },
  };
}

function createDarkSystemRepositories() {
  return {
    registrations: createRegistrationRepository(),
    warnings: createWarningRepository(),
    invites: createInviteRepository(),
    funCounters: createFunCounterRepository(),
    aiHistory: createAiHistoryRepository(),
    reminders: createReminderRepository(),
    polls: createPollRepository(),
    giveaways: createGiveawayRepository(),
    settings: createSettingsRepository(),
    audit: createAuditRepository(),
  };
}

function requireDb() {
  const db = getDarkSystemDatabase();
  if (!db) throw new Error('DarkSystem database is not initialized.');
  return db;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

module.exports = {
  createDarkSystemRepositories,
  createRegistrationRepository,
  createWarningRepository,
  createInviteRepository,
  createFunCounterRepository,
  createAiHistoryRepository,
  createReminderRepository,
  createPollRepository,
  createGiveawayRepository,
  createSettingsRepository,
  createAuditRepository,
};
