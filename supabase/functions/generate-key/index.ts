// ============================================================
//  KeyAuth Key Generator Edge Function
//  POST body: { panel_type: "lag"|"internal", days: number }
//  Deploy: supabase functions deploy generate-key
// ============================================================
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function loadProfile(t: 'lag'|'internal') {
  return t === 'lag'
    ? { appName:Deno.env.get('KA_LAG_APPNAME')??'', ownerid:Deno.env.get('KA_LAG_OWNERID')??'', version:Deno.env.get('KA_LAG_VERSION')??'1.0', secret:Deno.env.get('KA_LAG_SECRET')??'', label:'Fake Lag' }
    : { appName:Deno.env.get('KA_INT_APPNAME')??'', ownerid:Deno.env.get('KA_INT_OWNERID')??'', version:Deno.env.get('KA_INT_VERSION')??'1.0', secret:Deno.env.get('KA_INT_SECRET')??'', label:'Internal' };
}

async function kaInit(p: ReturnType<typeof loadProfile>): Promise<string|null> {
  try {
    const u = new URL('https://keyauth.win/api/1.3/');
    u.searchParams.set('type','init'); u.searchParams.set('ver',p.version);
    u.searchParams.set('name',p.appName); u.searchParams.set('ownerid',p.ownerid);
    const d = await (await fetch(u.toString())).json();
    return d?.success ? d.sessionid : null;
  } catch { return null; }
}

async function kaGenerate(p: ReturnType<typeof loadProfile>, days: number, sessionid: string): Promise<string|null> {
  try {
    const u = new URL('https://keyauth.win/api/1.3/');
    u.searchParams.set('type','addlicense'); u.searchParams.set('sessionid',sessionid);
    u.searchParams.set('name',p.appName); u.searchParams.set('ownerid',p.ownerid);
    u.searchParams.set('secret',p.secret); u.searchParams.set('expiry',String(days));
    u.searchParams.set('mask','XXXXXX-XXXXXX-XXXXXX-XXXXXX');
    const d = await (await fetch(u.toString())).json();
    return d?.success ? (d.key ?? d.license ?? null) : null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const res = (data: unknown, s=200) => new Response(JSON.stringify(data), { status:s, headers:{...cors,'Content-Type':'application/json'} });
  try {
    const body = await req.json();
    const pt   = (body.panel_type ?? 'internal') as 'lag'|'internal';
    const days = Number(body.days ?? 3);
    const p    = loadProfile(pt);
    if (!p.appName || !p.ownerid) return res({ success:false, message:`${p.label} not configured` }, 400);
    const sid = await kaInit(p);
    if (!sid) return res({ success:false, message:`Init failed for ${p.label}` }, 500);
    const key = await kaGenerate(p, days, sid);
    if (!key) return res({ success:false, message:`Key generation failed for ${p.label}` }, 500);
    return res({ success:true, key, days, panel_type:pt, label:p.label });
  } catch(e) { return res({ success:false, message:'Server error: '+String(e) }, 500); }
});
