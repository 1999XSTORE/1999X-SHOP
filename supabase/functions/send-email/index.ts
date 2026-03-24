import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@example.com';
    const body = await req.json();

    if (!resendKey) return json({ success: false, message: 'RESEND_API_KEY is missing' }, 500);

    let recipients: string[] = body.to ?? [];

    if ((body.mode ?? 'single') === 'broadcast') {
      const admin = createClient(supabaseUrl, serviceRole);
      const { data, error } = await admin.auth.admin.listUsers();
      if (error) return json({ success: false, message: error.message }, 500);
      recipients = (data.users ?? []).map((user) => user.email ?? '').filter(Boolean);
    }

    if (!recipients.length) return json({ success: true, sent: 0 });

    await Promise.all(recipients.map((email) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: body.subject,
          html: body.html,
        }),
      }),
    ));

    return json({ success: true, sent: recipients.length });
  } catch (error) {
    return json({ success: false, message: String(error) }, 500);
  }
});
