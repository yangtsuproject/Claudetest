import { neon } from '@neondatabase/serverless';

export const getDb = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(databaseUrl);
};

// Initialize database tables
export const initializeDatabase = async () => {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS app_data (
      id SERIAL PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      data_type TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_app_data_user_type
    ON app_data(user_id, data_type)
  `;

  // Create a single row for all app data if it doesn't exist
  const existing = await sql`
    SELECT id FROM app_data WHERE user_id = 'default' AND data_type = 'full_data'
  `;

  if (existing.length === 0) {
    await sql`
      INSERT INTO app_data (user_id, data_type, data)
      VALUES ('default', 'full_data', '{}')
    `;
  }
};

// Get all app data
export const getAppData = async () => {
  const sql = getDb();

  const result = await sql`
    SELECT data FROM app_data
    WHERE user_id = 'default' AND data_type = 'full_data'
    LIMIT 1
  `;

  return result[0]?.data || null;
};

// Save all app data
export const saveAppData = async (data: unknown) => {
  const sql = getDb();

  await sql`
    UPDATE app_data
    SET data = ${JSON.stringify(data)}::jsonb, updated_at = NOW()
    WHERE user_id = 'default' AND data_type = 'full_data'
  `;
};
