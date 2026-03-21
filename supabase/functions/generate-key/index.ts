// KeyAuth Key Generator — with full debug logging
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function loadProfile(t: 'lag' | 'internal') {
  return t === 'lag'
    ? {
        appName: Deno.env.get('KA_LAG_APPNAME') ?? '',
        ownerid: Deno.env.get('KA_LAG_OWNERID') ?? '',
        version: Deno.env.get('KA_LAG_VERSION') ?? '1.0',
        secret:  Deno.env.get('KA_LAG_SECRET')  ?? '',
        label:   'Fake Lag',
      }
    : {
        appName: Deno.env.get('KA_INT_APPNAME') ?? '',
        ownerid: Deno.env.get('KA_INT_OWNERID') ?? '',
        version: Deno.env.get('KA_INT_VERSION') ?? '1.0',
        secret:  Deno.env.get('KA_INT_SECRET')  ?? '',
        label:   'Internal',
      };
}

async function kaInit(p: ReturnType<typeof loadProfile>): Promise<{ sid: string | null; raw: any }> {
  try {
    const url = `https://keyauth.win/api/1.3/?type=init&ver=${encodeURIComponent(p.version)}&name=${encodeURIComponent(p.appName)}&ownerid=${encodeURIComponent(p.ownerid)}`;
    const resp = await fetch(url);
    const raw  = await resp.json();
    console.log(`[kaInit][${p.label}] response:`, JSON.stringify(raw));
    return { sid: raw?.success ? raw.sessionid : null, raw };
  } catch (e) {
    console.error(`[kaInit][${p.label}] error:`, e);
    return { sid: null, raw: { error: String(e) } };
  }
}

async function kaGenerate(p: ReturnType<typeof loadProfile>, days: number, sessionid: string): Promise<{ key: string | null; raw: any }> {
  try {
    // KeyAuth addlicense API — generates a new key
    const url = `https://keyauth.win/api/1.3/?type=addlicense&sessionid=${encodeURIComponent(sessionid)}&name=${encodeURIComponent(p.appName)}&ownerid=${encodeURIComponent(p.ownerid)}&secret=${encodeURIComponent(p.secret)}&expiry=${days}&mask=XXXXXX-XXXXXX-XXXXXX-XXXXXX&level=1&amount=1`;
    const resp = await fetch(url);
    const raw  = await resp.json();
    console.log(`[kaGenerate][${p.label}] response:`, JSON.stringify(raw));
    // KeyAuth returns key in different fields depending on version
    const key = raw?.key ?? raw?.license ?? raw?.keys?.[0] ?? null;
    return { key: raw?.success ? key : null, raw };
  } catch (e) {
    console.error(`[kaGenerate][${p.label}] error:`, e);
    return { key: null, raw: { error: String(e) } };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const res = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  try {
    const body      = await req.json();
    const pt        = (body.panel_type ?? 'internal') as 'lag' | 'internal';
    const days      = Number(body.days ?? 3);
    const p         = loadProfile(pt);

    console.log(`[generate-key] panel=${pt} days=${days} appName="${p.appName}" ownerid="${p.ownerid}" hasSecret=${!!p.secret}`);

    // Validate config
    if (!p.appName) return res({ success: false, message: `${p.label}: KA_${pt.toUpperCase()}_APPNAME secret not set in Supabase` }, 400);
    if (!p.ownerid) return res({ success: false, message: `${p.label}: KA_${pt.toUpperCase()}_OWNERID secret not set in Supabase` }, 400);
    if (!p.secret)  return res({ success: false, message: `${p.label}: KA_${pt.toUpperCase()}_SECRET secret not set in Supabase` }, 400);

    // Step 1: Init session
    const { sid, raw: initRaw } = await kaInit(p);
    if (!sid) {
      return res({
        success: false,
        message: `KeyAuth init failed for ${p.label}`,
        debug: initRaw,
      }, 500);
    }

    // Step 2: Generate key
    const { key, raw: genRaw } = await kaGenerate(p, days, sid);
    if (!key) {
      return res({
        success: false,
        message: `KeyAuth key generation failed for ${p.label}: ${genRaw?.message ?? JSON.stringify(genRaw)}`,
        debug: genRaw,
      }, 500);
    }

    return res({ success: true, key, days, panel_type: pt, label: p.label });

  } catch (e) {
    console.error('[generate-key] fatal error:', e);
    return res({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
