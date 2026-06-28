/**
 * 般若阁 AI 代理 — Cloudflare Worker
 * 隐藏智谱 API Key，前端调用 /api/chat
 */

const ZHIPU_API_KEY = 'c364f5ebb522412cbec2336ef80ca2b8.ZRPX4SZGLgRry1z3';
const ZHIPU_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 系统提示词 — 三位大师人格
const MASTER_PROFILES = {
  huiming: {
    name: '慧明长老',
    desc: '庄严持重，引经据典',
    system: '你是"般若阁"的慧明长老，一位修为深厚的老法师。回答风格庄严持重，常引佛经、古语为佐证。语言简练古雅，语气慈悲而不失威仪。回答控制在200字以内。'
  },
  mingxin: {
    name: '明心师父',
    desc: '慈悲为怀，温润如玉',
    system: '你是"般若阁"的明心师父，一位慈悲的尼师。回答风格温柔细腻，如春风化雨，善用比喻。语言亲切温润，给人以安慰和力量。回答控制在200字以内。'
  },
  xuanzhen: {
    name: '玄真道长',
    desc: '直言不讳，道法自然',
    system: '你是"般若阁"的玄真道长，一位直爽的道长。回答风格直接了当，不绕弯子，语言接地气。偶尔带点道家术语，但整体朴素实用。回答控制在200字以内。'
  }
};

export default {
  async fetch(request, env) {
    // CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { master, question, context, type } = body;

        // 选择大师
        const profile = MASTER_PROFILES[master] || MASTER_PROFILES.huiming;

        // 构建用户消息
        let userMessage = '';
        if (type === 'lottery') {
          userMessage = `用户求得第${context.signNumber}签，签题"${context.signTitle}"，签诗：${context.signPoem}。所问之事：${question || '未具体说明'}。请解读此签。`;
        } else if (type === 'bazi') {
          userMessage = `用户八字：${context.baziString}。日主${context.dayMaster}，五行：${context.wuxing}。所问：${question || '请整体分析命局'}。请分析。`;
        } else if (type === 'dream') {
          userMessage = `用户梦见：${context.dreamContent}。请按周公解梦传统解读此梦的吉凶寓意。`;
        } else if (type === 'divination') {
          userMessage = `用户六爻起卦，本卦${context.benGua}（卦辞：${context.benGuaCi}），互卦${context.huGua}，变卦${context.bianGua}。所问：${question || '未具体说明'}。请解读卦象。`;
        } else if (type === 'naming') {
          userMessage = `请为${context.surname}姓${context.gender === 'male' ? '男' : '女'}宝起名，出生${context.birthInfo}，偏好${context.style || '不限'}风格。给3个名字，每个含：名字、拼音、出处典故、寓意。用JSON数组格式返回。`;
        } else {
          userMessage = question || context?.message || '请给予指导。';
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
            'Authorization': `Bearer ${ZHIPU_API_KEY}`
          },
          body: JSON.stringify(payload)
        });

        const data = await resp.json();

        if (data.error) {
          return new Response(JSON.stringify({ error: data.error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        const reply = data.choices?.[0]?.message?.content || '施主，贫僧一时语塞，请稍后再试。';

        return new Response(JSON.stringify({ reply, master: profile.name }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // 健康检查
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ ok: true, service: 'banruoge-ai' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  }
};
