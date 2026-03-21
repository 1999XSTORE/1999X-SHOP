// ============================================================
//  Supabase Edge Function — Admin / Support Login
//  Validates username+password against env secrets
//  Returns role: 'admin' | 'support' | null
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(JSON.stringify({ success: false, message: 'Username and password required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    // ── Admin credentials ──────────────────────────────────
    const ADMIN_USER = Deno.env.get('ADMIN_USERNAME') ?? '';
    const ADMIN_PASS = Deno.env.get('ADMIN_PASSWORD') ?? '';

    // ── Support credentials (supports multiple, comma-separated) ──
    // Format: "user1:pass1,user2:pass2"
    const SUPPORT_CREDS = Deno.env.get('SUPPORT_CREDENTIALS') ?? '';

    // Check admin
    if (ADMIN_USER && ADMIN_PASS && username === ADMIN_USER && password === ADMIN_PASS) {
      return new Response(JSON.stringify({
        success: true,
        role: 'admin',
        name: 'Admin',
        message: 'Welcome back, Admin',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check support accounts
    if (SUPPORT_CREDS) {
      const accounts = SUPPORT_CREDS.split(',').map(s => s.trim());
      for (const acc of accounts) {
        const [u, p] = acc.split(':');
        if (u && p && username === u && password === p) {
          return new Response(JSON.stringify({
            success: true,
            role: 'support',
            name: username,
            message: 'Welcome, Support',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    // No match
    return new Response(JSON.stringify({ success: false, message: 'Invalid username or password' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Server error: ' + String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
