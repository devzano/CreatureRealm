import { Pool } from "pg";

const DATABASE_URL = String(
  process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.RENDER_POSTGRES_URL ??
    ""
).trim();

if (!DATABASE_URL) {
  console.warn("[pokemontcg-digital-db] DATABASE_URL is not set. Digital packs require a Postgres database.");
}

const pool =
  DATABASE_URL
    ? new Pool({
        connectionString: DATABASE_URL,
        ssl:
          DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
            ? false
            : { rejectUnauthorized: false },
      })
    : null;

let schemaReadyPromise = null;

function requirePool() {
  if (!pool) {
    throw new Error("Missing DATABASE_URL for Pokemon TCG digital persistence.");
  }

  return pool;
}

async function ensureSchema(client = null) {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  const runner = async (db) => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS pokemon_tcg_digital_profiles (
        device_id TEXT PRIMARY KEY,
        window_key TEXT NOT NULL,
        opened_today INTEGER NOT NULL DEFAULT 0,
        remaining_today INTEGER NOT NULL DEFAULT 4,
        total_opened INTEGER NOT NULL DEFAULT 0,
        inventory JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pokemon_tcg_digital_history (
        id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES pokemon_tcg_digital_profiles(device_id) ON DELETE CASCADE,
        pack_id TEXT NOT NULL,
        set_id TEXT NOT NULL,
        set_name TEXT NOT NULL,
        opened_at TIMESTAMPTZ NOT NULL,
        cards JSONB NOT NULL DEFAULT '[]'::jsonb
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_pokemon_tcg_digital_history_device_opened_at
      ON pokemon_tcg_digital_history(device_id, opened_at DESC);
    `);
  };

  if (client) {
    schemaReadyPromise = runner(client);
    return schemaReadyPromise;
  }

  const db = requirePool();
  schemaReadyPromise = runner(db);
  return schemaReadyPromise;
}

export async function withDigitalProfileTransaction(fn) {
  const db = requirePool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await ensureSchema(client);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loadDigitalProfile(client, deviceId) {
  const result = await client.query(
    `
      SELECT device_id, window_key, opened_today, remaining_today, total_opened, inventory, created_at, updated_at
      FROM pokemon_tcg_digital_profiles
      WHERE device_id = $1
      LIMIT 1
    `,
    [deviceId]
  );

  return result.rows[0] ?? null;
}

export async function saveDigitalProfile(client, profile) {
  await client.query(
    `
      INSERT INTO pokemon_tcg_digital_profiles (
        device_id,
        window_key,
        opened_today,
        remaining_today,
        total_opened,
        inventory,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      ON CONFLICT (device_id) DO UPDATE SET
        window_key = EXCLUDED.window_key,
        opened_today = EXCLUDED.opened_today,
        remaining_today = EXCLUDED.remaining_today,
        total_opened = EXCLUDED.total_opened,
        inventory = EXCLUDED.inventory,
        updated_at = EXCLUDED.updated_at
    `,
    [
      profile.deviceId,
      profile.windowKey,
      profile.openedToday,
      profile.remainingToday,
      profile.totalOpened,
      JSON.stringify(profile.inventory ?? {}),
      profile.createdAt,
      profile.updatedAt,
    ]
  );
}

export async function insertDigitalHistoryEntry(client, deviceId, entry) {
  await client.query(
    `
      INSERT INTO pokemon_tcg_digital_history (
        id, device_id, pack_id, set_id, set_name, opened_at, cards
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      entry.id,
      deviceId,
      entry.packId,
      entry.setId,
      entry.setName,
      entry.openedAt,
      JSON.stringify(entry.cards ?? []),
    ]
  );
}

export async function trimDigitalHistory(client, deviceId, limit) {
  await client.query(
    `
      DELETE FROM pokemon_tcg_digital_history
      WHERE id IN (
        SELECT id
        FROM pokemon_tcg_digital_history
        WHERE device_id = $1
        ORDER BY opened_at DESC
        OFFSET $2
      )
    `,
    [deviceId, limit]
  );
}

export async function loadDigitalHistory(client, deviceId, limit) {
  const result = await client.query(
    `
      SELECT id, pack_id, set_id, set_name, opened_at, cards
      FROM pokemon_tcg_digital_history
      WHERE device_id = $1
      ORDER BY opened_at DESC
      LIMIT $2
    `,
    [deviceId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    packId: row.pack_id,
    setId: row.set_id,
    setName: row.set_name,
    openedAt: new Date(row.opened_at).toISOString(),
    cards: Array.isArray(row.cards) ? row.cards : [],
  }));
}
