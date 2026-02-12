import {
    createClient
} from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    try {
        const {
            email,
            password,
            name,
            role,
            organization_id,
            secretaria_id,
            active = true
        } = req.body;

        if (!email || !password || !name || !organization_id) {
            return res.status(400).json({
                error: 'Missing required fields: email, password, name, organization_id'
            });
        }

        // Create Supabase client with service role for admin operations
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // First, create the user in Supabase Auth
        const {
            data: authData,
            error: authError
        } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                name: name.toUpperCase(),
                role,
                organization_id,
                secretaria_id: secretaria_id || null
            }
        });

        if (authError) {
            console.error('Auth creation error:', authError);
            return res.status(400).json({
                error: `Failed to create auth user: ${authError.message}`
            });
        }

        if (!authData.user) {
            return res.status(400).json({
                error: 'Failed to create auth user'
            });
        }

        // Then, create the member record
        const {
            data: memberData,
            error: memberError
        } = await supabase
            .from('members')
            .insert([{
                id: authData.user.id,
                name: name.toUpperCase(),
                email,
                role,
                organization_id,
                secretaria_id: secretaria_id || null,
                active
            }])
            .select()
            .single();

        if (memberError) {
            console.error('Member creation error:', memberError);
            // If member creation fails, we should clean up the auth user
            await supabase.auth.admin.deleteUser(authData.user.id);
            return res.status(400).json({
                error: `Failed to create member record: ${memberError.message}`
            });
        }

        return res.status(200).json({
            success: true,
            uid: authData.user.id,
            user: memberData
        });

    } catch (error) {
        console.error('User creation error:', error);
        return res.status(500).json({
            error: `Internal server error: ${error.message}`
        });
    }
}