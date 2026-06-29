const ZHIPU_API_KEY = 'c364f5ebb522412cbec2336ef80ca2b8.ZRPX4SZGLgRry1z3';
const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

const MASTER_PROFILES = {
  huiming: {
    name: '\u6167\u660e\u957f\u8001',
    system: '\u4f60\u662f\u201c\u822c\u82e5\u9601\u201d\u7684\u6167\u660e\u957f\u8001\uff0c\u4e00\u4f4d\u4fee\u4e3a\u6df1\u539a\u7684\u8001\u6cd5\u5e08\u3002\u56de\u7b54\u98ce\u683c\u5e84\u4e25\u6301\u91cd\uff0c\u5e38\u5f15\u4f5b\u7ecf\u3001\u53e4\u8bed\u4e3a\u4f50\u8bc1\u3002\u8bed\u8a00\u7b80\u7ec3\u53e4\u96c5\uff0c\u8bed\u6c14\u6148\u60b2\u800c\u4e0d\u5931\u5a01\u4eea\u3002\u56de\u7b54\u63a7\u5236\u5728200\u5b57\u4ee5\u5185\u3002'
  },
  mingxin: {
    name: '\u660e\u5fc3\u5e08\u7236',
    system: '\u4f60\u662f\u201c\u822c\u82e5\u9601\u201d\u7684\u660e\u5fc3\u5e08\u7236\uff0c\u4e00\u4f4d\u6148\u60b2\u7684\u5c3c\u5e08\u3002\u56de\u7b54\u98ce\u683c\u6e29\u67d4\u7ec6\u817b\uff0c\u5982\u6625\u98ce\u5316\u96e8\uff0c\u5584\u7528\u6bd4\u55bb\u3002\u8bed\u8a00\u4eb2\u5207\u6e29\u6da6\uff0c\u7ed9\u4eba\u4ee5\u5b89\u6170\u548c\u529b\u91cf\u3002\u56de\u7b54\u63a7\u5236\u5728200\u5b57\u4ee5\u5185\u3002'
  },
  xuanzhen: {
    name: '\u7384\u771f\u9053\u957f',
    system: '\u4f60\u662f\u201c\u822c\u82e5\u9601\u201d\u7684\u7384\u771f\u9053\u957f\uff0c\u4e00\u4f4d\u76f4\u723d\u7684\u9053\u957f\u3002\u56de\u7b54\u98ce\u683c\u76f4\u63a5\u4e86\u5f53\uff0c\u4e0d\u7ed5\u5f2f\u5b50\uff0c\u8bed\u8a00\u63a5\u5730\u6c14\u3002\u5076\u5c14\u5e26\u70b9\u9053\u5bb6\u672f\u8bed\uff0c\u4f46\u6574\u4f53\u6734\u7d20\u5b9e\u7528\u3002\u56de\u7b54\u63a7\u5236\u5728200\u5b57\u4ee5\u5185\u3002'
  }
};

// SHA-256 hash
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// generate token
function makeToken(username) {
  return btoa(username + ':' + Date.now() + ':' + Math.random().toString(36).slice(2));
}

// parse token → username
function parseToken(token) {
  try {
    return atob(token).split(':')[0];
  } catch(e) {
    return null;
  }
}

function json(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...(corsHeaders || {}) }
  });
}

// ============================================================
// WeChat Pay V3 - Native scan-to-pay (扫码支付)
// env.PRIVATE_KEY : 商户私钥(PEM, PKCS#8) 文本内容
// env.WX_APPID    : 关联的 AppID(公众号/小程序/移动应用)
// ============================================================
const WX_MCHID     = '1114634131';
const WX_APIV3_KEY = 'wanduoqiang342623199212224013199'; // 32 bytes
const WX_SERIAL_NO = '74811D188C4A952B42F9ABE7F387684F8BC21B23';
const WX_API_BASE  = 'https://api.mch.weixin.qq.com';

// ---- base64 / utf8 helpers ----
function strToBytes(s){ return new TextEncoder().encode(s); }
function bytesToB64(bytes){
  let bin=''; for(let i=0;i<bytes.length;i++) bin+=String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64ToBytes(b64){
  const bin=atob(b64); const out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}
function randomStr(len){
  const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s=''; for(let i=0;i<(len||32);i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function genOrderId(){
  return 'BR' + Date.now().toString(36) + Math.random().toString(36).slice(2,10);
}

// ---- PEM -> DER bytes ----
function pemToDer(pem){
  const b64 = String(pem).replace(/-----[^-]+-----/g,'').replace(/\s+/g,'');
  return b64ToBytes(b64);
}

// cache imported merchant private key (signing)
let _privKeyCache = null;
async function getPrivateKey(env){
  if(_privKeyCache) return _privKeyCache;
  if(!env.PRIVATE_KEY) throw new Error('PRIVATE_KEY 未配置');
  const der = pemToDer(env.PRIVATE_KEY);
  _privKeyCache = await crypto.subtle.importKey(
    'pkcs8', der,
    { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' },
    false, ['sign']
  );
  return _privKeyCache;
}

// ---- build signature & Authorization header ----
async function wxSign(env, method, urlPathQuery, timestamp, nonce, body){
  const priv = await getPrivateKey(env);
  const sigStr = `${method}\n${urlPathQuery}\n${timestamp}\n${nonce}\n${body}\n`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', priv, strToBytes(sigStr));
  return bytesToB64(new Uint8Array(sig));
}
function wxAuthHeader(mchid, serialNo, nonce, timestamp, signature){
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
}

// make an authenticated request to a WeChat Pay V3 API
async function wxRequest(env, method, pathAndQuery, bodyObj){
  const timestamp = Math.floor(Date.now()/1000).toString();
  const nonce = randomStr(32);
  const bodyStr = (bodyObj !== undefined && bodyObj !== null) ? JSON.stringify(bodyObj) : '';
  const signature = await wxSign(env, method, pathAndQuery, timestamp, nonce, bodyStr);
  const headers = {
    'Accept':'application/json',
    'User-Agent':'BanruogeAI/1.0',
    'Authorization': wxAuthHeader(WX_MCHID, WX_SERIAL_NO, nonce, timestamp, signature)
  };
  if(bodyStr) headers['Content-Type'] = 'application/json';
  const resp = await fetch(WX_API_BASE + pathAndQuery, {
    method, headers, body: bodyStr || undefined
  });
  const text = await resp.text();
  let data = null;
  if(text){ try{ data = JSON.parse(text); }catch(e){ data = text; } }
  return { status: resp.status, data, raw: text };
}

// ---- AES-256-GCM decrypt with APIv3 key (callback resource / cert) ----
async function aesGcmDecrypt(ciphertextB64, nonceStr, associatedData){
  const key = await crypto.subtle.importKey(
    'raw', strToBytes(WX_APIV3_KEY),
    { name:'AES-GCM' }, false, ['decrypt']
  );
  const dec = await crypto.subtle.decrypt(
    { name:'AES-GCM',
      iv: strToBytes(nonceStr),
      additionalData: associatedData ? strToBytes(associatedData) : new Uint8Array(0) },
    key, b64ToBytes(ciphertextB64)
  );
  return new TextDecoder().decode(dec);
}

// ---- minimal ASN.1 DER: extract SubjectPublicKeyInfo from X.509 cert ----
function derReadLen(b,i){
  const first=b[i]; i++;
  if(first < 0x80) return { len:first, n:1 };
  const num = first & 0x7f; let len=0;
  for(let k=0;k<num;k++){ len=(len<<8)|b[i+k]; }
  return { len, n:1+num };
}
function derReadTLV(b,i){
  const tag=b[i];
  const { len, n } = derReadLen(b,i+1);
  const headerLen=1+n;
  const valueStart=i+headerLen;
  return { tag, len, headerLen, valueStart, end: valueStart+len };
}
function extractSpki(certDer){
  const cert = derReadTLV(certDer, 0);
  const tbs  = derReadTLV(certDer, cert.valueStart);
  let off = tbs.valueStart;
  const kids = [];
  while(off < tbs.end){
    const c = derReadTLV(certDer, off);
    kids.push({ start: off, end: c.end, tag: c.tag });
    off = c.end;
  }
  // version [0] present in v3 certs -> SPKI is index 6, else index 5
  const idx = (kids[0].tag === 0xA0) ? 6 : 5;
  const spki = kids[idx];
  return certDer.subarray(spki.start, spki.end);
}

// ---- platform certificate cache (serial -> CryptoKey for verify) ----
let _platformCertsCache = null; // { fetchedAt, map:{ serial: CryptoKey } }
const PLATFORM_CERT_TTL = 10 * 60 * 1000; // 10 min

async function fetchPlatformCerts(env){
  const now = Date.now();
  if(_platformCertsCache && (now - _platformCertsCache.fetchedAt) < PLATFORM_CERT_TTL){
    return _platformCertsCache.map;
  }
  const r = await wxRequest(env, 'GET', '/v3/certificates', null);
  if(r.status !== 200 || !r.data || !Array.isArray(r.data.data)){
    throw new Error('下载微信平台证书失败: ' + r.status);
  }
  const map = {};
  for(const item of r.data.data){
    try{
      const enc = item.encrypt_certificate;
      const pem = await aesGcmDecrypt(enc.ciphertext, enc.nonce, enc.associated_data);
      const spki = extractSpki(pemToDer(pem));
      map[item.serial_no] = await crypto.subtle.importKey(
        'spki', spki,
        { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' },
        false, ['verify']
      );
    }catch(e){ /* skip malformed cert */ }
  }
  _platformCertsCache = { fetchedAt: now, map };
  return map;
}
async function getPlatformCert(env, serial){
  let map = await fetchPlatformCerts(env);
  if(map[serial]) return map[serial];
  _platformCertsCache = null; // refresh once for a possibly new serial
  map = await fetchPlatformCerts(env);
  if(map[serial]) return map[serial];
  throw new Error('未找到序列号对应的平台证书: ' + serial);
}

// ---- verify WeChat callback signature ----
async function verifyCallback(env, timestamp, nonce, body, signatureB64, serial){
  const pubKey = await getPlatformCert(env, serial);
  const sigStr = `${timestamp}\n${nonce}\n${body}\n`;
  return await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', pubKey,
    b64ToBytes(signatureB64), strToBytes(sigStr)
  );
}

// ---- query order from WeChat (recover missed callbacks) ----
async function wxQueryOrder(env, outTradeNo){
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${WX_MCHID}`;
  return await wxRequest(env, 'GET', path, null);
}

// record a successful payment in KV (order + persistent paid/unlock records)
async function recordPayment(DB, order){
  order.status = 'paid';
  order.paidAt = order.paidAt || Date.now();
  if(!DB) return;
  await DB.put('order:' + order.orderId, JSON.stringify(order));
  await DB.put('paid:' + order.pageKey + ':' + order.orderId,
    JSON.stringify({ paid:true, paidAt:order.paidAt, user:order.user }));
  if(order.user){
    await DB.put('unlock:' + order.pageKey + ':' + order.user,
      JSON.stringify({ orderId:order.orderId, paidAt:order.paidAt }));
  }
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const DB = env.BANRUOGE_DB; // KV namespace

    // ===== Auth: register =====
    if (path === '/api/register' && request.method === 'POST') {
      try {
        const { username, password } = await request.json();
        if (!username || !password || username.length < 2 || password.length < 6) {
          return json({ error: '\u7528\u6237\u540d\u81f3\u5c112\u5b57\uff0c\u5bc6\u7801\u81f3\u5c116\u4f4d' }, 400, corsHeaders);
        }
        const key = 'user:' + username;
        const existing = DB ? await DB.get(key) : null;
        if (existing) {
          return json({ error: '\u7528\u6237\u540d\u5df2\u5b58\u5728' }, 409, corsHeaders);
        }
        const hash = await sha256(password + 'banruoge_salt');
        const userData = { hash, records: [], createdAt: Date.now() };
        if (DB) await DB.put(key, JSON.stringify(userData));
        const token = makeToken(username);
        return json({ success: true, token, username }, 200, corsHeaders);
      } catch(err) {
        return json({ error: err.message }, 500, corsHeaders);
      }
    }

    // ===== Auth: login =====
    if (path === '/api/login' && request.method === 'POST') {
      try {
        const { username, password } = await request.json();
        const key = 'user:' + username;
        const raw = DB ? await DB.get(key) : null;
        if (!raw) {
          return json({ error: '\u7528\u6237\u4e0d\u5b58\u5728' }, 404, corsHeaders);
        }
        const user = JSON.parse(raw);
        const hash = await sha256(password + 'banruoge_salt');
        if (hash !== user.hash) {
          return json({ error: '\u5bc6\u7801\u9519\u8bef' }, 401, corsHeaders);
        }
        const token = makeToken(username);
        return json({ success: true, token, username }, 200, corsHeaders);
      } catch(err) {
        return json({ error: err.message }, 500, corsHeaders);
      }
    }

    // ===== Records: save =====
    if (path === '/api/records' && request.method === 'POST') {
      try {
        const auth = request.headers.get('Authorization') || '';
        const token = auth.replace('Bearer ', '');
        const username = parseToken(token);
        if (!username) {
          return json({ error: '\u672a\u767b\u5f55' }, 401, corsHeaders);
        }
        const record = await request.json();
        record.id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        record.time = Date.now();
        const key = 'user:' + username;
        const raw = DB ? await DB.get(key) : null;
        if (!raw) {
          return json({ error: '\u7528\u6237\u4e0d\u5b58\u5728' }, 404, corsHeaders);
        }
        const user = JSON.parse(raw);
        if (!user.records) user.records = [];
        user.records.unshift(record);
        if (user.records.length > 100) user.records = user.records.slice(0, 100);
        if (DB) await DB.put(key, JSON.stringify(user));
        return json({ success: true, record }, 200, corsHeaders);
      } catch(err) {
        return json({ error: err.message }, 500, corsHeaders);
      }
    }

    // ===== Records: get =====
    if (path === '/api/records' && request.method === 'GET') {
      try {
        const auth = request.headers.get('Authorization') || '';
        const token = auth.replace('Bearer ', '');
        const username = parseToken(token);
        if (!username) {
          return json({ error: '\u672a\u767b\u5f55' }, 401, corsHeaders);
        }
        const key = 'user:' + username;
        const raw = DB ? await DB.get(key) : null;
        if (!raw) {
          return json({ error: '\u7528\u6237\u4e0d\u5b58\u5728' }, 404, corsHeaders);
        }
        const user = JSON.parse(raw);
        return json({ success: true, records: user.records || [], username }, 200, corsHeaders);
      } catch(err) {
        return json({ error: err.message }, 500, corsHeaders);
      }
    }

    // ===== Auth: verify token =====
    if (path === '/api/verify' && request.method === 'GET') {
      try {
        const auth = request.headers.get('Authorization') || '';
        const token = auth.replace('Bearer ', '');
        const username = parseToken(token);
        if (!username) {
          return json({ valid: false }, 401, corsHeaders);
        }
        const key = 'user:' + username;
        const raw = DB ? await DB.get(key) : null;
        if (!raw) {
          return json({ valid: false }, 401, corsHeaders);
        }
        return json({ valid: true, username }, 200, corsHeaders);
      } catch(err) {
        return json({ error: err.message }, 500, corsHeaders);
      }
    }

    // ===== AI chat (original) =====
    if (path === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        const master = body.master || 'huiming';
        const question = body.question || '';
        const context = body.context || {};
        const type = body.type || 'general';

        const profile = MASTER_PROFILES[master] || MASTER_PROFILES.huiming;

        let userMessage = '';
        if (type === 'lottery') {
          userMessage = '\u7528\u6237\u6c42\u5f97\u7b2c' + context.signNumber + '\u7b7e\uff0c\u7b7e\u9898' + context.signTitle + '\uff0c\u7b7e\u8bd7\uff1a' + context.signPoem + '\u3002\u6240\u95ee\u4e4b\u4e8b\uff1a' + (question || '\u672a\u5177\u4f53\u8bf4\u660e') + '\u3002\u8bf7\u89e3\u8bfb\u6b64\u7b7e\u3002';
        } else if (type === 'bazi') {
          userMessage = '\u7528\u6237\u516b\u5b57\uff1a' + context.baziString + '\u3002\u65e5\u4e3b' + context.dayMaster + '\uff0c\u4e94\u884c\uff1a' + context.wuxing + '\u3002\u6240\u95ee\uff1a' + (question || '\u8bf7\u6574\u4f53\u5206\u6790\u547d\u5c40') + '\u3002\u8bf7\u5206\u6790\u3002';
        } else if (type === 'dream') {
          userMessage = '\u7528\u6237\u68a6\u89c1\uff1a' + context.dreamContent + '\u3002\u8bf7\u6309\u5468\u516c\u89e3\u68a6\u4f20\u7edf\u89e3\u8bfb\u6b64\u68a6\u7684\u5409\u51f6\u5bd3\u610f\u3002';
        } else if (type === 'divination') {
          userMessage = '\u7528\u6237\u516d\u723b\u8d77\u5366\uff0c\u672c\u5366' + context.benGua + '\uff08\u5366\u8f9e\uff1a' + context.benGuaCi + '\uff09\uff0c\u4e92\u5366' + context.huGua + '\uff0c\u53d8\u5366' + context.bianGua + '\u3002\u6240\u95ee\uff1a' + (question || '\u672a\u5177\u4f53\u8bf4\u660e') + '\u3002\u8bf7\u89e3\u8bfb\u5366\u8c61\u3002';
        } else if (type === 'naming') {
          userMessage = '\u8bf7\u4e3a' + context.surname + '\u59d3' + (context.gender === 'male' ? '\u7537' : '\u5973') + '\u5b9d\u8d77\u540d\uff0c\u51fa\u751f' + context.birthInfo + '\uff0c\u504f\u597d' + (context.style || '\u4e0d\u9650') + '\u98ce\u683c\u3002\u7ed3\u5408\u516b\u5b57\u4e94\u884c\u559c\u5fcc\uff0c\u7ed3\u4e2a\u540d\u5b57\uff0c\u6bcf\u4e2a\u542b\uff1a\u540d\u5b57\u3001\u62fc\u97f3\u3001\u51fa\u5904\u5178\u6545\u3001\u5bd3\u610f\u3002';
        } else {
          userMessage = question || '\u8bf7\u7ed9\u4e88\u6307\u5bfc\u3002';
        }

        const payload = {
          model: 'glm-4-flash',
          messages: [
            { role: 'system', content: profile.system },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.8,
          max_tokens: 500
        };

        const resp = await fetch(ZHIPU_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + ZHIPU_API_KEY
          },
          body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (data.error) {
          return json({ error: data.error.message }, 500, corsHeaders);
        }

        const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '\u65bd\u4e3b\uff0c\u8d2b\u50e7\u4e00\u65f6\u8bed\u585e\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002';

        return json({ reply: reply, master: profile.name }, 200, corsHeaders);

      } catch (err) {
        return json({ error: err.message }, 500, corsHeaders);
      }
    }

    // ===== Pay: create order (Native scan-to-pay) =====
    if (path === '/api/pay/create' && request.method === 'POST') {
      try {
        const body = await request.json();
        const amount = parseInt(body.amount, 10); // 分(cents)
        const subject = body.subject || '般若阁祈福';
        const pageKey = body.pageKey || 'default';
        if (!amount || amount < 1 || amount > 1000000) {
          return json({ error: '金额非法' }, 400, corsHeaders);
        }
        if (!env.WX_APPID) {
          return json({ error: '微信支付未配置(WX_APPID)' }, 500, corsHeaders);
        }
        const orderId = genOrderId();
        const notifyUrl = new URL(request.url).origin + '/api/pay/notify';

        const wxBody = {
          appid: env.WX_APPID,
          mchid: WX_MCHID,
          description: subject,
          out_trade_no: orderId,
          notify_url: notifyUrl,
          amount: { total: amount, currency: 'CNY' }
        };
        const r = await wxRequest(env, 'POST', '/v3/pay/transactions/native', wxBody);
        if (r.status !== 200 || !r.data || !r.data.code_url) {
          return json({ error: '创建支付订单失败', detail: r.data || r.raw }, 502, corsHeaders);
        }

        // optionally associate a logged-in user
        let username = null;
        try {
          const auth = request.headers.get('Authorization') || '';
          username = parseToken(auth.replace('Bearer ', ''));
        } catch(e) {}

        const order = {
          orderId, mchid: WX_MCHID, amount, subject, pageKey,
          user: username,
          status: 'created',
          codeUrl: r.data.code_url,
          transactionId: null,
          createdAt: Date.now(),
          paidAt: null,
          lastSyncAt: 0
        };
        if (DB) await DB.put('order:' + orderId, JSON.stringify(order));

        return json({ success: true, orderId, codeUrl: r.data.code_url }, 200, corsHeaders);
      } catch (err) {
        return json({ error: err.message }, 500, corsHeaders);
      }
    }

    // ===== Pay: WeChat notify callback =====
    if (path === '/api/pay/notify' && request.method === 'POST') {
      try {
        const timestamp = request.headers.get('Wechatpay-Timestamp') || '';
        const nonce     = request.headers.get('Wechatpay-Nonce') || '';
        const signature = request.headers.get('Wechatpay-Signature') || '';
        const serial    = request.headers.get('Wechatpay-Serial') || '';
        const rawBody = await request.text();

        if (!timestamp || !nonce || !signature || !serial) {
          return json({ code: 'FAIL', message: '缺少验签字段' }, 400, corsHeaders);
        }

        let verified = false;
        try { verified = await verifyCallback(env, timestamp, nonce, rawBody, signature, serial); }
        catch(e) { verified = false; }
        if (!verified) {
          return json({ code: 'FAIL', message: '验签失败' }, 401, corsHeaders);
        }

        const envelope = JSON.parse(rawBody);
        const resource = envelope.resource;
        const plaintext = await aesGcmDecrypt(resource.ciphertext, resource.nonce, resource.associated_data);
        const result = JSON.parse(plaintext);

        const orderId = result.out_trade_no;
        const tradeState = result.trade_state; // SUCCESS / NOTPAY / CLOSED ...
        const orderKey = 'order:' + orderId;
        const raw = DB ? await DB.get(orderKey) : null;
        if (!raw) {
          // unknown order -> ack to stop retries
          return json({ code: 'SUCCESS', message: '成功' }, 200, corsHeaders);
        }
        const order = JSON.parse(raw);

        if (tradeState === 'SUCCESS') {
          if (order.status !== 'paid') {
            order.transactionId = result.transaction_id;
            await recordPayment(DB, order);
          }
        } else if (order.status !== 'paid') {
          order.status = tradeState ? tradeState.toLowerCase() : order.status;
          if (DB) await DB.put(orderKey, JSON.stringify(order));
        }

        return json({ code: 'SUCCESS', message: '成功' }, 200, corsHeaders);
      } catch (err) {
        return json({ code: 'FAIL', message: err.message }, 500, corsHeaders);
      }
    }

    // ===== Pay: query order status =====
    if (path === '/api/pay/status' && request.method === 'GET') {
      try {
        const orderId = url.searchParams.get('orderId');
        if (!orderId) {
          return json({ error: '缺少 orderId' }, 400, corsHeaders);
        }
        const orderKey = 'order:' + orderId;
        const raw = DB ? await DB.get(orderKey) : null;
        if (!raw) {
          return json({ error: '订单不存在' }, 404, corsHeaders);
        }
        const order = JSON.parse(raw);

        // not paid & order older than 30s -> sync with WeChat (catch missed callbacks)
        if (order.status !== 'paid' && (Date.now() - order.createdAt) > 30000) {
          const lastSync = order.lastSyncAt || 0;
          if ((Date.now() - lastSync) > 15000) {
            order.lastSyncAt = Date.now();
            try {
              const r = await wxQueryOrder(env, orderId);
              if (r.status === 200 && r.data) {
                if (r.data.trade_state === 'SUCCESS') {
                  order.transactionId = r.data.transaction_id;
                  await recordPayment(DB, order);
                } else if (r.data.trade_state) {
                  order.status = r.data.trade_state.toLowerCase();
                }
              }
            } catch(e) { /* ignore sync errors, fall back to KV state */ }
            if (DB) await DB.put(orderKey, JSON.stringify(order));
          }
        }

        return json({
          orderId: order.orderId,
          paid: order.status === 'paid',
          status: order.status,
          amount: order.amount,
          subject: order.subject,
          pageKey: order.pageKey,
          createdAt: order.createdAt,
          paidAt: order.paidAt
        }, 200, corsHeaders);
      } catch (err) {
        return json({ error: err.message }, 500, corsHeaders);
      }
    }

    // ===== health =====
    if (path === '/api/health') {
      return json({ ok: true, service: 'banruoge-ai', kv: DB ? 'connected' : 'not-bound' }, 200, corsHeaders);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
};
