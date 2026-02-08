import { Handler } from '@netlify/functions';
import { query } from './_lib/db';
import { verifyToken } from './_lib/auth';

export const handler: Handler = async (event, context) => {
  // 1. Auth Guard
  const user = verifyToken(event.headers.authorization);
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  try {
    // 2. Query
    // Using simple SELECT. In prod, standard pagination (LIMIT/OFFSET) should apply.
    const result = await query(
      'SELECT * FROM trips ORDER BY created_at DESC LIMIT 50'
    );

    // 3. Response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result.rows),
    };
  } catch (error) {
    console.error('Db Error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};