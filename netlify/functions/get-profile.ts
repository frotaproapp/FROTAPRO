import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method Not Allowed' };

  const authHeader = event.headers.authorization;
  if (!authHeader) return { statusCode: 401, body: 'Missing Authorization Header' };

  if (!supabaseUrl || !supabaseServiceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing Server Configuration' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.replace('Bearer ', '');

  try {
    // 1. Validar Token
    // Fix: Access getUser via any to bypass incorrect type inference
    const { data: { user }, error: authError } = await (supabase.auth as any).getUser(token);
    if (authError || !user) return { statusCode: 401, body: 'Invalid Token' };

    // 2. Buscar Perfil na tabela members (Bypass RLS)
    const { data: profile, error: dbError } = await supabase
      .from('members')
      .select('*')
      .eq('id', user.id)
      .single();

    // Se perfil não existe (novo usuário), retorna null sem erro
    if (dbError && dbError.code === 'PGRST116') {
         return {
            statusCode: 200,
            body: JSON.stringify({ user: null })
        };
    }

    if (dbError) throw dbError;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: profile })
    };
  } catch (error: any) {
    console.error("Get Profile Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};