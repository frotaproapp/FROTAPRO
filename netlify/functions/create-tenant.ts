
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const handler: Handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle Preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };
  
  if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase Config for create-tenant");
      return { 
          statusCode: 500, 
          headers,
          body: JSON.stringify({ error: 'Server misconfiguration: Missing Service Key' }) 
      };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const body = JSON.parse(event.body || '{}');
  const { name, email, password, adminName, plan, days } = body;

  if (!name || !email || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  try {
      // 1. Create Auth User
      // Fix: Access admin via any to bypass incorrect type inference
      const { data: userData, error: userError } = await (supabase.auth as any).admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: adminName }
      });
      if (userError) throw userError;

      const userId = userData.user.id;

      // 2. Create Organization
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (days || 365));

      const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert([{ 
              name, 
              license_plan: plan || 'PRO',
              active: true,
              license_expires_at: expiresAt.toISOString(),
              owner_id: userId
          }])
          .select()
          .single();
          
      if (orgError) {
          // Rollback user if org creation fails
          // Fix: Access admin via any to bypass incorrect type inference
          await (supabase.auth as any).admin.deleteUser(userId);
          throw orgError;
      }

      // 3. Create Admin Member in 'members' table
      const { error: memberError } = await supabase
          .from('members')
          .insert([{
              id: userId, // Link to Auth ID
              organization_id: org.id,
              name: adminName || name + ' Admin',
              email: email,
              role: 'ORG_ADMIN',
              active: true
          }]);
          
      if (memberError) {
          console.warn("Failed to create admin member record:", memberError);
          // Don't rollback org, but this is a partial failure state
      }

      return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, org, user: userData.user })
      };

  } catch (err: any) {
      console.error("Create Tenant Error:", err);
      return { 
          statusCode: 400, 
          headers,
          body: JSON.stringify({ success: false, error: err.message || 'Unknown error' }) 
      };
  }
};
