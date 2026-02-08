import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Config in list-tenants");
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Server Configuration' }) };
  }

  // Usa a Service Key para ignorar RLS
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    };
  } catch (error: any) {
    console.error("List Tenants Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};