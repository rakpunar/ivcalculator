/* Liste paylaşım servisi (Cloudflare Worker + KV).
   GET    /api/lists/:code            -> { data, t }
   POST   /api/lists  {code?, data}   -> { code, key }   (code yoksa rastgele üretilir)
   PUT    /api/lists/:code  (X-Key)   -> { ok }
   DELETE /api/lists/:code  (X-Key)   -> { ok }
   data = istemcinin sıkıştırdığı metin; sunucu içeriğini yorumlamaz. Düzenleme anahtarı yalnızca SHA-256 özeti olarak saklanır. */
const MAX_DATA = 1_500_000;           // karakter
const TTL = 60 * 60 * 24 * 400;       // 400 gün; her güncellemede yenilenir
const CODE_RE = /^[a-z0-9][a-z0-9-]{3,23}$/;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const ORIGIN_OK = o => o === 'https://rakpunar.github.io' || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);

const rand = (n, a) => { const b = crypto.getRandomValues(new Uint8Array(n)); return [...b].map(x => a[x % a.length]).join(''); };
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

export default {
  async fetch(req, env){
    const origin = req.headers.get('Origin') || '';
    const cors = ORIGIN_OK(origin) ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
    const send = (obj, status = 200) => new Response(JSON.stringify(obj), { status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors } });
    if(req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE', 'Access-Control-Allow-Headers': 'Content-Type,X-Key', 'Access-Control-Max-Age': '86400' } });
    if(origin && !cors['Access-Control-Allow-Origin']) return send({ error: 'origin' }, 403);

    const m = new URL(req.url).pathname.match(/^\/api\/lists(?:\/([^/]+))?$/);
    if(!m) return send({ error: 'not found' }, 404);
    const code = m[1]?.toLowerCase();
    const kv = c => 'l:' + c;

    if(req.method === 'GET' && code){
      if(!CODE_RE.test(code)) return send({ error: 'bad code' }, 400);
      const v = await env.LISTS.get(kv(code), 'json');
      return v ? send({ data: v.data, t: v.t }) : send({ error: 'not found' }, 404);
    }

    let body = {};
    if(req.method === 'POST' || req.method === 'PUT'){
      try{ body = await req.json(); }catch(e){ return send({ error: 'bad json' }, 400); }
      if(typeof body.data !== 'string' || !body.data || body.data.length > MAX_DATA) return send({ error: 'bad data' }, 400);
    }

    if(req.method === 'POST' && !code){
      let c = body.code ? String(body.code).toLowerCase() : '';
      if(c){
        if(!CODE_RE.test(c)) return send({ error: 'Code must be 4-24 characters: a-z, 0-9, "-".' }, 400);
        if(await env.LISTS.get(kv(c))) return send({ error: 'taken' }, 409);
      }else{
        do c = rand(10, ALPHABET); while(await env.LISTS.get(kv(c)));
      }
      const key = rand(24, ALPHABET);
      await env.LISTS.put(kv(c), JSON.stringify({ h: await sha(key), data: body.data, t: Date.now() }), { expirationTtl: TTL });
      return send({ code: c, key }, 201);
    }

    if((req.method === 'PUT' || req.method === 'DELETE') && code){
      if(!CODE_RE.test(code)) return send({ error: 'bad code' }, 400);
      const v = await env.LISTS.get(kv(code), 'json');
      if(!v) return send({ error: 'not found' }, 404);
      if(await sha(req.headers.get('X-Key') || '') !== v.h) return send({ error: 'forbidden' }, 403);
      if(req.method === 'DELETE'){ await env.LISTS.delete(kv(code)); return send({ ok: true }); }
      await env.LISTS.put(kv(code), JSON.stringify({ h: v.h, data: body.data, t: Date.now() }), { expirationTtl: TTL });
      return send({ ok: true });
    }
    return send({ error: 'method' }, 405);
  },
};
