// This file runs in Node.js environment on Netlify
import { Pool } from 'pg';

let pool: Pool;

export const getDb = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Often required for managed DBs like Neon/Supabase
      },
      max: 10, // Limit connections in serverless
      idleTimeoutMillis: 30000
    });
  }
  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const client = await getDb().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
};