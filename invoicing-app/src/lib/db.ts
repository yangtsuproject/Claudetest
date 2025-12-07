import { neon } from '@neondatabase/serverless';

export const getDb = () => {
  // Check multiple possible environment variable names
  const databaseUrl = process.env.POSTGRES_URL ||
                      process.env.DATABASE_URL ||
                      process.env.STORAGE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Database URL environment variable is not set (checked POSTGRES_URL, DATABASE_URL, STORAGE_DATABASE_URL)');
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
