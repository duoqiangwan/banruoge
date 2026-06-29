/**
 * 般若阁 AI 调用封装
 * 所有页面共用，通过 /api/chat 调用 Cloudflare Worker
 */
var BanruogeAI = (function() {

  // 大师ID映射
  var MASTERS = {
    0: 'huiming',
    1: 'mingxin',
    2: 'xuanzhen'
  };

  /**
   * 调用AI
   * @param {Object} opts - { master:0|1|2, question:'', context:{}, type:'lottery|bazi|dream|divination|naming' }
   * @returns {Promise<{reply:string, master:string}>}
   */
  async function chat(opts) {
    try {
      var payload = {
        master: MASTERS[opts.master] || 'huiming',
        question: opts.question || '',
        context: opts.context || {},
        type: opts.type || 'general'
      };

      var resp = await fetch('https://api.boruo.icu/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        throw new Error('AI服务暂时不可用 (' + resp.status + ')');
      }

      var data = await resp.json();
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      // 降级：返回通用文案
      return {
        reply: getFallback(opts.type, opts.master),
        master: ['慧明长老', '明心师父', '玄真道长'][opts.master || 0],
        fallback: true
      };
    }
  }

  // 降级文案
  function getFallback(type, master) {
    var fallbacks = [
      '施主，缘起缘灭，一切皆有定数。当下所遇，皆是修行。静心感悟，答案自现。',
      '阿弥陀佛，世事如云，聚散有时。施主但行善事，莫问前程，自有福报。',
      '卦象已出，吉凶在天，事在人为。该来的挡不住，该走的留不了。顺其自然便好。'
    ];
    return fallbacks[master || 0];
  }

  // 显示"AI解读中"loading
  function showLoading(container, masterName) {
    if (!container) return;
    container.innerHTML = '\
      <div style="text-align:center;padding:24px;">\
        <div style="display:inline-block;width:32px;height:32px;border:3px solid rgba(201,160,94,0.2);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;"></div>\
        <p style="margin:12px 0 0;color:var(--gold);font-size:0.875rem;">' + (masterName || '大师') + '正在为您解读...</p>\
      </div>\
      <style>@keyframes spin{to{transform:rotate(360deg);}}</style>';
    container.style.display = 'block';
  }

  return {
    chat: chat,
    showLoading: showLoading,
    MASTERS: MASTERS
  };
})();
