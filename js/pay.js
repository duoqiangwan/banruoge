/**
 * 般若阁 微信支付前端模块
 * 封装支付弹窗、二维码展示、订单轮询、自动解锁
 *
 * 依赖：fetch（现代浏览器）。可选依赖 app.js 的 showToast（仅弹窗关闭后调用）。
 * 付费状态与 app.js 的 isPaid / markPaid 共用同一 localStorage key（banruoge_paid_<pageKey>），
 * 7 天内有效，向后兼容旧逻辑。
 *
 * 用法：
 *   BanruogePay.request({
 *     amount: 190,            // 单位：分，190 = 1.90 元
 *     subject: '八字详批',     // 商品描述
 *     pageKey: 'bazi',        // 解锁标识，与 app.js isPaid/markPaid 共用
 *     onSuccess: function () { /* 支付成功后执行 *\/ }
 *   });
 *
 *   BanruogePay.isPaid('bazi');   // 检查是否已付费（7 天内有效）
 *   BanruogePay.close();          // 主动关闭支付弹窗
 */
var BanruogePay = (function () {
  'use strict';

  // ===== 配置 =====
  var API_BASE = 'https://api.boruo.icu';
  var QR_API = 'https://api.qrserver.com/v1/create-qr-code/?data=';
  var POLL_INTERVAL = 2000;              // 轮询间隔 2 秒
  var TIMEOUT_MS = 10 * 60 * 1000;       // 10 分钟自动关闭
  var PAID_TTL = 7 * 24 * 3600 * 1000;   // 付费记录 7 天有效
  var PAID_PREFIX = 'banruoge_paid_';    // 与 app.js 保持一致，兼容旧逻辑

  // ===== 当前会话状态 =====
  var state = {
    overlay: null,
    pollTimer: null,
    timeoutTimer: null,
    orderId: null,
    pageKey: '',
    onSuccess: null,
    closed: false,
    lastOpts: null
  };

  /* ============================================================
   * 付费状态（与 app.js isPaid / markPaid 同存储格式，互相兼容）
   * ============================================================ */
  function isPaid(pageKey) {
    if (!pageKey) return false;
    try {
      var ts = localStorage.getItem(PAID_PREFIX + pageKey);
      if (!ts) return false;
      var age = Date.now() - parseInt(ts, 10);
      return age > 0 && age < PAID_TTL;
    } catch (e) {
      return false;
    }
  }

  function markPaid(pageKey) {
    if (!pageKey) return;
    try {
      localStorage.setItem(PAID_PREFIX + pageKey, String(Date.now()));
    } catch (e) {}
  }

  /* ============================================================
   * 工具函数
   * ============================================================ */
  function formatYuan(cents) {
    var n = Number(cents) || 0;
    return (n / 100).toFixed(2);
  }

  // 注入弹窗所需 keyframes（只注入一次）
  function ensureStyle() {
    if (document.getElementById('bp-style')) return;
    var s = document.createElement('style');
    s.id = 'bp-style';
    s.textContent =
      '@keyframes bp-spin{to{transform:rotate(360deg)}}' +
      '@keyframes bp-pop{0%{transform:scale(0.6);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}' +
      '@keyframes bp-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
    document.head.appendChild(s);
  }

  // 弹窗关闭后才用的轻提示（showToast z-index 低于弹窗，故仅在关闭后调用）
  function toast(msg, dur) {
    if (typeof window.showToast === 'function') {
      try { window.showToast(msg, dur); } catch (e) {}
    }
  }

  // 取弹窗内元素
  function el(id) {
    return state.overlay ? state.overlay.querySelector('#' + id) : null;
  }

  // 弹窗内联短闪提示（替代 toast，避免被遮罩盖住）
  function flash(msg) {
    var f = el('bpFlash');
    if (!f) return;
    f.textContent = msg;
    if (f._t) clearTimeout(f._t);
    f._t = setTimeout(function () { f.textContent = ''; }, 1600);
  }

  /* ============================================================
   * 弹窗构建（中式深色 + 金色风格，与 showDonation 一致）
   * ============================================================ */
  function buildModal() {
    ensureStyle();
    var overlay = document.createElement('div');
    overlay.id = 'banruogePayModal';
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10001;' +
      'display:flex;align-items:center;justify-content:center;padding:16px;' +
      'animation:bp-fade .25s ease-out;';

    overlay.innerHTML =
      '<div style="background:linear-gradient(180deg,#221a14,#1a1410);' +
        'border:1px solid rgba(201,160,94,0.4);border-radius:16px;' +
        'padding:32px 24px 24px;max-width:340px;width:100%;text-align:center;position:relative;' +
        'box-shadow:0 12px 40px rgba(0,0,0,0.5);">' +
        '<button id="bpClose" aria-label="关闭" style="position:absolute;top:8px;right:12px;width:28px;height:28px;' +
          'border:none;background:transparent;color:rgba(232,213,176,0.5);font-size:1.6rem;cursor:pointer;line-height:1;">×</button>' +
        '<p class="font-display" style="font-size:1.75rem;color:#c9a05c;letter-spacing:0.15em;margin:0 0 4px;">微信支付</p>' +
        '<div style="width:48px;height:1px;background:rgba(201,160,94,0.3);margin:8px auto 16px;"></div>' +
        '<div id="bpAmount" style="display:none;margin:0 0 6px;">' +
          '<span style="font-size:0.8125rem;color:rgba(232,213,176,0.5);">支付金额</span><br>' +
          '<span id="bpAmountVal" style="font-size:2.4rem;color:#c9a05c;font-weight:600;letter-spacing:0.02em;">¥0.00</span>' +
        '</div>' +
        '<p id="bpSubject" style="display:none;font-size:0.8125rem;color:rgba(232,213,176,0.6);margin:0 0 14px;"></p>' +
        '<div id="bpBody" style="min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;">' +
          '<div style="display:inline-block;width:34px;height:34px;border:3px solid rgba(201,160,94,0.2);' +
            'border-top-color:#c9a05c;border-radius:50%;animation:bp-spin .8s linear infinite;"></div>' +
          '<p id="bpStatus" style="color:#c9a05c;font-size:0.9rem;margin:0;">正在生成支付订单…</p>' +
        '</div>' +
        '<p id="bpFlash" style="font-size:0.75rem;color:rgba(232,213,176,0.55);line-height:1.5;margin:12px 0 0;min-height:1.1em;"></p>' +
        '<p id="bpHint" style="display:none;font-size:0.75rem;color:rgba(232,213,176,0.5);line-height:1.7;margin:8px 0 0;">' +
          '请用微信扫码支付<br>支付成功后自动解锁' +
        '</p>' +
      '</div>';

    document.body.appendChild(overlay);
    return overlay;
  }

  /* ============================================================
   * 状态视图切换
   * ============================================================ */
  // 展示二维码 + 金额，进入轮询等待
  function showQr(amount, subject, codeUrl) {
    var amountBox = el('bpAmount');
    var amountVal = el('bpAmountVal');
    var subj = el('bpSubject');
    var body = el('bpBody');
    var hint = el('bpHint');
    if (amountBox) amountBox.style.display = 'block';
    if (amountVal) amountVal.textContent = '¥' + formatYuan(amount);
    if (subj) { subj.style.display = 'block'; subj.textContent = subject || ''; }
    if (hint) hint.style.display = 'block';
    if (!body) return;

    var qrSrc = QR_API + encodeURIComponent(codeUrl) + '&size=240x240';
    body.innerHTML =
      '<div style="position:relative;width:240px;height:240px;border-radius:10px;' +
        'border:1px solid rgba(201,160,94,0.25);background:#fff;overflow:hidden;">' +
        '<img id="bpQr" src="' + qrSrc + '" alt="微信支付二维码" ' +
          'style="width:100%;height:100%;display:block;" ' +
          'onerror="this.style.display=\'none\';var e=document.getElementById(\'bpQrErr\');if(e)e.style.display=\'flex\';">' +
        '<div id="bpQrErr" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;' +
          'flex-direction:column;gap:6px;color:#8a7868;font-size:0.75rem;padding:12px;text-align:center;">' +
          '二维码加载失败<br>请检查网络后重试' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(201,160,94,0.2);' +
          'border-top-color:#c9a05c;border-radius:50%;animation:bp-spin .8s linear infinite;"></span>' +
        '<p style="color:rgba(232,213,176,0.7);font-size:0.8125rem;margin:0;">等待支付结果…</p>' +
      '</div>' +
      '<button id="bpManual" style="background:transparent;border:1px solid rgba(201,160,94,0.3);color:#c9a05c;' +
        'border-radius:6px;padding:6px 16px;font-size:0.78rem;cursor:pointer;">我已支付，刷新状态</button>';

    var manual = el('bpManual');
    if (manual) manual.addEventListener('click', function () { checkOnce(true); });
  }

  // 支付成功视图
  function showSuccess() {
    var body = el('bpBody');
    var hint = el('bpHint');
    var flashEl = el('bpFlash');
    if (hint) hint.style.display = 'none';
    if (flashEl) flashEl.style.display = 'none';
    if (!body) return;
    body.innerHTML =
      '<div style="font-size:3rem;animation:bp-pop .5s ease-out;">🪷</div>' +
      '<p style="color:#c9a05c;font-size:1.1rem;margin:0;letter-spacing:0.08em;">支付成功</p>' +
      '<p style="color:rgba(232,213,176,0.6);font-size:0.8125rem;margin:0;">正在为您解锁…</p>';
  }

  // 错误视图（可重试）
  function showError(msg, canRetry) {
    var body = el('bpBody');
    var hint = el('bpHint');
    if (hint) hint.style.display = 'none';
    if (!body) return;
    body.innerHTML =
      '<div style="font-size:2.4rem;">🙏</div>' +
      '<p style="color:rgba(232,213,176,0.7);font-size:0.875rem;margin:0;line-height:1.7;">' +
        (msg || '支付服务暂时不可用') + '</p>' +
      (canRetry
        ? '<button id="bpRetry" style="margin-top:6px;background:transparent;border:1px solid rgba(201,160,94,0.4);' +
          'color:#c9a05c;border-radius:6px;padding:8px 20px;font-size:0.85rem;cursor:pointer;">重新发起</button>'
        : '');
    bindRetry();
  }

  // 超时视图
  function showTimeout() {
    var body = el('bpBody');
    var hint = el('bpHint');
    if (hint) hint.style.display = 'none';
    if (!body) return;
    body.innerHTML =
      '<div style="font-size:2.4rem;">⏳</div>' +
      '<p style="color:rgba(232,213,176,0.7);font-size:0.875rem;margin:0;line-height:1.7;">' +
        '支付等待超时<br>请重新发起支付</p>' +
      '<button id="bpRetry" style="margin-top:6px;background:transparent;border:1px solid rgba(201,160,94,0.4);' +
        'color:#c9a05c;border-radius:6px;padding:8px 20px;font-size:0.85rem;cursor:pointer;">重新发起</button>';
    bindRetry();
  }

  // 绑定“重新发起”按钮
  function bindRetry() {
    var retry = el('bpRetry');
    if (!retry) return;
    retry.addEventListener('click', function () {
      if (state.lastOpts) {
        cleanup();
        request(state.lastOpts);
      }
    });
  }

  /* ============================================================
   * 生命周期 / 清理
   * ============================================================ */
  function stopPolling() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
    if (state.timeoutTimer) { clearTimeout(state.timeoutTimer); state.timeoutTimer = null; }
  }

  function cleanup() {
    stopPolling();
    if (state.overlay && state.overlay.parentNode) {
      state.overlay.parentNode.removeChild(state.overlay);
    }
    state.overlay = null;
    state.orderId = null;
    state.closed = true;
  }

  function close() {
    cleanup();
  }

  /* ============================================================
   * 后端交互
   * ============================================================ */
  // POST /api/pay/create -> { orderId, codeUrl }
  async function createOrder(opts) {
    var resp = await fetch(API_BASE + '/api/pay/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: opts.amount,
        subject: opts.subject || '般若阁·祈福服务',
        pageKey: opts.pageKey || ''
      })
    });
    if (!resp.ok) throw new Error('创建订单失败（' + resp.status + '）');
    var data = await resp.json();
    if (!data || !data.orderId || !data.codeUrl) {
      throw new Error(data && data.error ? data.error : '订单数据异常');
    }
    return data;
  }

  // GET /api/pay/status?orderId=xxx -> { paid, status }
  async function fetchStatus(orderId) {
    var resp = await fetch(
      API_BASE + '/api/pay/status?orderId=' + encodeURIComponent(orderId),
      { method: 'GET', headers: { 'Accept': 'application/json' } }
    );
    if (!resp.ok) throw new Error('查询状态失败（' + resp.status + '）');
    return resp.json();
  }

  // 单次状态查询
  function checkOnce(manual) {
    if (!state.orderId || state.closed) return;
    fetchStatus(state.orderId).then(function (data) {
      if (!data || state.closed) return;
      var paid = data.paid === true ||
                 data.status === 'paid' ||
                 data.status === 'SUCCESS' ||
                 data.status === 'success';
      if (paid) {
        onPaid();
      } else if (manual) {
        flash('暂未收到支付结果，请稍候…');
      }
    }).catch(function () {
      // 网络异常：静默继续轮询；手动触发则给个提示
      if (manual) flash('网络异常，正在重试…');
    });
  }

  // 启动轮询 + 超时
  function startPolling() {
    state.timeoutTimer = setTimeout(function () {
      if (state.closed) return;
      stopPolling();
      showTimeout();
    }, TIMEOUT_MS);

    state.pollTimer = setInterval(function () {
      if (state.closed) return;
      checkOnce(false);
    }, POLL_INTERVAL);

    // 立即查一次，加快响应
    checkOnce(false);
  }

  // 支付成功处理
  function onPaid() {
    if (state.closed) return;
    stopPolling();
    markPaid(state.pageKey);
    showSuccess();
    var cb = state.onSuccess;
    // 短暂展示成功态后关闭弹窗并回调
    setTimeout(function () {
      cleanup();
      if (typeof cb === 'function') {
        try { cb(); } catch (e) {}
      }
      toast('支付成功，已解锁 🙏', 2000);
    }, 1200);
  }

  /* ============================================================
   * 主入口
   * ============================================================ */
  async function _request(opts) {
    opts = opts || {};
    state.lastOpts = opts;
    state.pageKey = opts.pageKey || '';
    state.onSuccess = typeof opts.onSuccess === 'function' ? opts.onSuccess : null;

    // 已付费：直接回调，不弹窗
    if (state.pageKey && isPaid(state.pageKey)) {
      if (state.onSuccess) { try { state.onSuccess(); } catch (e) {} }
      return;
    }

    // 参数校验
    if (!(Number(opts.amount) > 0)) {
      state.closed = false;
      state.overlay = buildModal();
      bindClose();
      showError('支付金额无效，请重试', true);
      return;
    }

    // 若已有弹窗，先清理
    if (state.overlay) cleanup();
    state.closed = false;
    state.overlay = buildModal();
    bindClose();

    // 创建订单
    try {
      var order = await createOrder(opts);
      if (state.closed) return; // 用户已关闭
      state.orderId = order.orderId;
      showQr(opts.amount, opts.subject, order.codeUrl);
      startPolling();
    } catch (err) {
      if (state.closed) return;
      showError(err && err.message ? err.message : '创建订单失败', true);
    }
  }

  // 绑定关闭交互（× 与遮罩点击）
  function bindClose() {
    var closeBtn = el('bpClose');
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (state.overlay) {
      state.overlay.addEventListener('click', function (e) {
        if (e.target === state.overlay) close();
      });
    }
  }

  // 公开入口（包一层，避免未捕获异常）
  function request(opts) {
    return _request(opts).catch(function () {
      if (!state.closed) showError('创建订单失败，请重试', true);
    });
  }

  /* ============================================================
   * 导出
   * ============================================================ */
  return {
    request: request,
    isPaid: isPaid,
    markPaid: markPaid,
    close: close,
    API_BASE: API_BASE
  };
})();
