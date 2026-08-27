/** In-memory store matching the D1 schema. Used by tests and the local Node stand-in. */

function clone(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

export function createMemoryStore() {
  const accounts = [];
  const subscriptions = [];
  const magicLinks = [];
  const sessions = [];
  const webhookEvents = [];
  const attempts = new Map();

  return {
    kind: "memory",
    async getAccountByEmail(emailNormalized) {
      return clone(accounts.find((a) => a.email_normalized === emailNormalized) || null);
    },
    async getAccountById(id) {
      return clone(accounts.find((a) => a.id === id) || null);
    },
    async getAccountByCustomer(customerId) {
      return clone(accounts.find((a) => a.stripe_customer_id === customerId) || null);
    },
    async putAccount(row) {
      const i = accounts.findIndex((a) => a.id === row.id);
      if (i >= 0) accounts[i] = clone(row);
      else accounts.push(clone(row));
      return clone(row);
    },
    async getSubscription(accountId) {
      return clone(subscriptions.find((s) => s.account_id === accountId) || null);
    },
    async getSubscriptionByStripeId(subId) {
      return clone(subscriptions.find((s) => s.stripe_subscription_id === subId) || null);
    },
    async putSubscription(row) {
      const i = subscriptions.findIndex((s) => s.account_id === row.account_id);
      if (i >= 0) subscriptions[i] = clone(row);
      else subscriptions.push(clone(row));
      return clone(row);
    },
    async putMagicLink(row) {
      magicLinks.push(clone(row));
      return clone(row);
    },
    async getMagicLinkByHash(hash) {
      return clone(magicLinks.find((m) => m.token_hash === hash) || null);
    },
    async consumeMagicLink(id, consumedAt) {
      const row = magicLinks.find((m) => m.id === id);
      if (row) row.consumed_at = consumedAt;
      return clone(row || null);
    },
    async putSession(row) {
      sessions.push(clone(row));
      return clone(row);
    },
    async getSessionByHash(hash) {
      return clone(sessions.find((s) => s.token_hash === hash) || null);
    },
    async revokeSession(id, at) {
      const row = sessions.find((s) => s.id === id);
      if (row) row.revoked_at = at;
      return clone(row || null);
    },
    async revokeAccountSessions(accountId, at) {
      sessions.forEach((s) => {
        if (s.account_id === accountId && !s.revoked_at) s.revoked_at = at;
      });
    },
    async hasWebhookEvent(id) {
      return webhookEvents.some((e) => e.stripe_event_id === id);
    },
    async putWebhookEvent(row) {
      if (webhookEvents.some((e) => e.stripe_event_id === row.stripe_event_id)) {
        return { inserted: false, row: clone(row) };
      }
      webhookEvents.push(clone(row));
      return { inserted: true, row: clone(row) };
    },
    async deleteWebhookEvent(id) {
      const i = webhookEvents.findIndex((e) => e.stripe_event_id === id);
      if (i >= 0) webhookEvents.splice(i, 1);
    },
    async bumpAttempt(key, windowStart, nowIso, windowMs) {
      const cur = attempts.get(key);
      const now = Date.parse(nowIso);
      const start = Date.parse(windowStart);
      if (!cur || now - Date.parse(cur.window_start) > windowMs) {
        attempts.set(key, { key: key, count: 1, window_start: nowIso });
        return 1;
      }
      cur.count += 1;
      return cur.count;
      void start;
    },
    async dump() {
      return {
        accounts: clone(accounts),
        subscriptions: clone(subscriptions),
        magicLinks: clone(magicLinks),
        sessions: clone(sessions),
        webhookEvents: clone(webhookEvents)
      };
    }
  };
}

export function createD1Store(db) {
  function one(stmt) {
    return stmt.first();
  }
  return {
    kind: "d1",
    async getAccountByEmail(emailNormalized) {
      return db.prepare("SELECT * FROM accounts WHERE email_normalized = ?").bind(emailNormalized).first();
    },
    async getAccountById(id) {
      return db.prepare("SELECT * FROM accounts WHERE id = ?").bind(id).first();
    },
    async getAccountByCustomer(customerId) {
      return db.prepare("SELECT * FROM accounts WHERE stripe_customer_id = ?").bind(customerId).first();
    },
    async putAccount(row) {
      await db
        .prepare(
          "INSERT INTO accounts (id, email, email_normalized, stripe_customer_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET email=excluded.email, email_normalized=excluded.email_normalized, stripe_customer_id=excluded.stripe_customer_id, updated_at=excluded.updated_at"
        )
        .bind(row.id, row.email, row.email_normalized, row.stripe_customer_id || null, row.created_at, row.updated_at)
        .run();
      return row;
    },
    async getSubscription(accountId) {
      return db.prepare("SELECT * FROM subscriptions WHERE account_id = ?").bind(accountId).first();
    },
    async getSubscriptionByStripeId(subId) {
      return db.prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?").bind(subId).first();
    },
    async putSubscription(row) {
      await db
        .prepare(
          "INSERT INTO subscriptions (account_id, stripe_subscription_id, stripe_price_id, status, current_period_end, cancel_at_period_end, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET stripe_subscription_id=excluded.stripe_subscription_id, stripe_price_id=excluded.stripe_price_id, status=excluded.status, current_period_end=excluded.current_period_end, cancel_at_period_end=excluded.cancel_at_period_end, updated_at=excluded.updated_at"
        )
        .bind(
          row.account_id,
          row.stripe_subscription_id || null,
          row.stripe_price_id || null,
          row.status,
          row.current_period_end || null,
          row.cancel_at_period_end ? 1 : 0,
          row.updated_at
        )
        .run();
      return row;
    },
    async putMagicLink(row) {
      await db
        .prepare(
          "INSERT INTO magic_links (id, email_normalized, token_hash, expires_at, consumed_at, created_at, redirect_path) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(row.id, row.email_normalized, row.token_hash, row.expires_at, row.consumed_at || null, row.created_at, row.redirect_path || null)
        .run();
      return row;
    },
    async getMagicLinkByHash(hash) {
      return db.prepare("SELECT * FROM magic_links WHERE token_hash = ?").bind(hash).first();
    },
    async consumeMagicLink(id, consumedAt) {
      await db.prepare("UPDATE magic_links SET consumed_at = ? WHERE id = ?").bind(consumedAt, id).run();
      return db.prepare("SELECT * FROM magic_links WHERE id = ?").bind(id).first();
    },
    async putSession(row) {
      await db
        .prepare(
          "INSERT INTO sessions (id, account_id, token_hash, expires_at, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(row.id, row.account_id, row.token_hash, row.expires_at, row.created_at, row.revoked_at || null)
        .run();
      return row;
    },
    async getSessionByHash(hash) {
      return db.prepare("SELECT * FROM sessions WHERE token_hash = ?").bind(hash).first();
    },
    async revokeSession(id, at) {
      await db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").bind(at, id).run();
    },
    async revokeAccountSessions(accountId, at) {
      await db.prepare("UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL").bind(at, accountId).run();
    },
    async hasWebhookEvent(id) {
      const row = await one(db.prepare("SELECT stripe_event_id FROM webhook_events WHERE stripe_event_id = ?").bind(id));
      return !!(row && row.stripe_event_id);
    },
    async putWebhookEvent(row) {
      const result = await db
        .prepare("INSERT OR IGNORE INTO webhook_events (stripe_event_id, type, processed_at) VALUES (?, ?, ?)")
        .bind(row.stripe_event_id, row.type, row.processed_at)
        .run();
      const changes = result && result.meta ? Number(result.meta.changes || 0) : 0;
      return { inserted: changes > 0, row: row };
    },
    async deleteWebhookEvent(id) {
      await db.prepare("DELETE FROM webhook_events WHERE stripe_event_id = ?").bind(id).run();
    },
    async bumpAttempt(key, windowStart, nowIso, windowMs) {
      const cur = await db.prepare("SELECT * FROM auth_attempts WHERE key = ?").bind(key).first();
      const now = Date.parse(nowIso);
      if (!cur || now - Date.parse(cur.window_start) > windowMs) {
        await db
          .prepare(
            "INSERT INTO auth_attempts (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count=1, window_start=excluded.window_start"
          )
          .bind(key, nowIso)
          .run();
        return 1;
      }
      await db.prepare("UPDATE auth_attempts SET count = count + 1 WHERE key = ?").bind(key).run();
      return (cur.count || 0) + 1;
      void windowStart;
    }
  };
}
