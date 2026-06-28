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

    // ===== health =====
    if (path === '/api/health') {
      return json({ ok: true, service: 'banruoge-ai', kv: DB ? 'connected' : 'not-bound' }, 200, corsHeaders);
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
};
