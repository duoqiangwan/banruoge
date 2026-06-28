// ===== 般若阁 共享 JavaScript =====

// 顶部导航滚动效果
window.addEventListener('scroll', function() {
  var nav = document.querySelector('.top-nav');
  if (nav) {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
      var divider = nav.querySelector('.gold-divider');
      if (divider) divider.style.opacity = '1';
    } else {
      nav.classList.remove('scrolled');
      var divider = nav.querySelector('.gold-divider');
      if (divider) divider.style.opacity = '0';
    }
  }
});

// 滚动渐入动画
function initScrollReveal() {
  var elements = document.querySelectorAll('[data-reveal]');
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var delay = entry.target.getAttribute('data-delay') || 0;
        setTimeout(function() {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, delay * 1000);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// 禅修音乐播放器
var audioPlayer = {
  audio: null,
  playing: false,
  init: function() {
    this.audio = document.querySelector('audio[data-bg-music]');
    if (this.audio) {
      this.audio.loop = true;
      this.audio.volume = 0.3;
    }
  },
  toggle: function() {
    if (!this.audio) return;
    if (this.playing) {
      this.audio.pause();
      this.playing = false;
    } else {
      this.audio.play().catch(function(){});
      this.playing = true;
    }
    var btn = document.querySelector('[data-music-toggle]');
    if (btn) {
      btn.style.color = this.playing ? 'var(--gold)' : '';
    }
  }
};

// 分享功能
function shareSite() {
  var shareData = {
    title: '般若阁 · 为家人祈福求灵签',
    text: '点一盏灯，留一份祝愿；求一支签，看一版参考。',
    url: window.location.origin
  };
  if (navigator.share) {
    navigator.share(shareData).catch(function(){});
  } else {
    // 复制链接
    var input = document.createElement('input');
    input.value = shareData.url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    alert('链接已复制，快去分享给家人吧！');
  }
}

// Toast 提示
function showToast(message, duration) {
  duration = duration || 2000;
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(26,20,16,0.95);color:#c9a05c;padding:16px 32px;border-radius:12px;border:1px solid rgba(201,160,94,0.3);z-index:9999;font-size:1rem;text-align:center;max-width:80vw;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(function() { document.body.removeChild(toast); }, 300);
  }, duration);
}

// 求签动画
function drawLottery(callback) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,20,16,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;';
  overlay.innerHTML = '<div style="font-size:3rem;animation:glow-rise 1s ease-in-out infinite;">🪷</div><p style="color:#c9a05c;font-size:1.25rem;">摇签中...</p>';
  document.body.appendChild(overlay);
  setTimeout(function() {
    overlay.remove();
    if (callback) callback();
  }, 2000);
}

// 供灯动画
function lightLamp(callback) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(26,20,16,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:20px;';
  overlay.innerHTML = '<div style="font-size:3rem;animation:glow-rise 1s ease-in-out infinite;">🪔</div><p style="color:#c9a05c;font-size:1.25rem;">点灯中...</p>';
  document.body.appendChild(overlay);
  setTimeout(function() {
    overlay.remove();
    if (callback) callback();
  }, 1500);
}

// 功德箱弹窗
function showDonation(onUnlock) {
  // 已存在则不重复创建
  if (document.getElementById('donationModal')) return;
  var overlay = document.createElement('div');
  overlay.id = 'donationModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';
  overlay.innerHTML = '\
<div style="background:linear-gradient(180deg,#221a14,#1a1410);border:1px solid rgba(201,160,94,0.4);border-radius:16px;padding:32px 24px;max-width:360px;width:100%;text-align:center;position:relative;">\
<button onclick="closeDonation()" style="position:absolute;top:12px;right:12px;width:28px;height:28px;border:none;background:transparent;color:rgba(232,213,176,0.5);font-size:1.5rem;cursor:pointer;">×</button>\
<p class="font-display" style="font-size:1.75rem;color:#c9a05c;letter-spacing:0.15em;margin:0 0 4px;">随喜功德</p>\
<div style="width:48px;height:1px;background:rgba(201,160,94,0.3);margin:8px auto 16px;"></div>\
<p style="font-size:0.8125rem;color:rgba(232,213,176,0.7);line-height:1.8;margin:0 0 20px;">一念随喜，功德无量。<br>您的支持是般若阁续灯续香的动力。</p>\
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">\
<div>\
<img src="/assets/wechat-qr.png" alt="微信收款码" style="width:120px;height:120px;border-radius:8px;border:1px solid rgba(201,160,94,0.2);background:#fff;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">\
<div style="display:none;width:120px;height:120px;border-radius:8px;border:1px dashed rgba(201,160,94,0.3);background:rgba(42,31,24,0.4);align-items:center;justify-content:center;font-size:0.75rem;color:rgba(232,213,176,0.4);">微信码待替换</div>\
<p style="font-size:0.75rem;color:#c9a05c;margin:8px 0 0;">微信扫码</p>\
</div>\
<div>\
<img src="/assets/alipay-qr.png" alt="支付宝收款码" style="width:120px;height:120px;border-radius:8px;border:1px solid rgba(201,160,94,0.2);background:#fff;" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">\
<div style="display:none;width:120px;height:120px;border-radius:8px;border:1px dashed rgba(201,160,94,0.3);background:rgba(42,31,24,0.4);align-items:center;justify-content:center;font-size:0.75rem;color:rgba(232,213,176,0.4);">支付宝码待替换</div>\
<p style="font-size:0.75rem;color:#c9a05c;margin:8px 0 0;">支付宝扫码</p>\
</div>\
</div>\
<p style="font-size:0.75rem;color:rgba(232,213,176,0.5);line-height:1.6;margin:0;">金额不限，心到即可。<br>愿您福慧双增，六时吉祥。</p>\
</div>';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) closeDonation(); });
  // 带 unlock 回调时，追加“我已随喜，解锁详批”按钮
  if (typeof onUnlock === 'function') {
    var _box = overlay.firstElementChild;
    var _ub = document.createElement('button');
    _ub.className = 'btn-ritual';
    _ub.textContent = '我已随喜，解锁详批';
    _ub.style.cssText = 'width:100%;margin-top:16px;font-size:1rem;';
    _ub.addEventListener('click', function(){ closeDonation(); onUnlock(); });
    if (_box) _box.appendChild(_ub);
  }
}
function closeDonation() {
  var m = document.getElementById('donationModal');
  if (m) m.remove();
}

// ===== 付费墙 =====
var PAYWALL_MASK_CSS = 'position:absolute;inset:0;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);background:linear-gradient(180deg, transparent 0%, rgba(26,20,16,0.8) 30%, rgba(26,20,16,0.95) 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;border-radius:inherit;z-index:5;text-align:center;';

// 检查是否已付费（7天内有效）
function isPaid(pageKey){
  try {
    var ts = localStorage.getItem('banruoge_paid_' + pageKey);
    if(!ts) return false;
    var age = Date.now() - parseInt(ts, 10);
    return age > 0 && age < 7 * 24 * 3600 * 1000;
  } catch(e){ return false; }
}

// 记录付费状态
function markPaid(pageKey){
  try { localStorage.setItem('banruoge_paid_' + pageKey, String(Date.now())); } catch(e){}
}

// 给容器附加付费墙遮罩（已付费则跳过）
// opts: { btnText, pageKey, successMsg, buttonless }
function attachPaywall(container, opts){
  if(!container) return;
  if(isPaid(opts.pageKey)) return;
  if(!container.style.position || container.style.position === 'static'){
    container.style.position = 'relative';
  }
  var mask = document.createElement('div');
  mask.className = 'paywall-mask';
  mask.style.cssText = PAYWALL_MASK_CSS;
  if(!opts.buttonless){
    var tip = document.createElement('p');
    tip.style.cssText = 'color:rgba(232,213,176,0.85);font-size:0.82rem;line-height:1.7;margin:0;letter-spacing:0.04em;';
    tip.textContent = '🔒 完整内容已为您备好';
    var btn = document.createElement('button');
    btn.className = 'btn-ritual';
    btn.textContent = opts.btnText || '扫码随喜，解锁完整内容';
    btn.style.cssText = 'position:relative;z-index:6;padding:12px 28px;font-size:1rem;';
    btn.addEventListener('click', function(){
      showDonation(function(){
        markPaid(opts.pageKey);
        document.querySelectorAll('.paywall-mask').forEach(function(m){ m.remove(); });
        showToast(opts.successMsg || '已解锁完整内容，福慧双增 🙏', 2500);
      });
    });
    mask.appendChild(tip);
    mask.appendChild(btn);
  } else {
    var lock = document.createElement('p');
    lock.style.cssText = 'color:rgba(201,160,94,0.6);font-size:1.6rem;margin:0;';
    lock.textContent = '🔒';
    var tip2 = document.createElement('p');
    tip2.style.cssText = 'color:rgba(232,213,176,0.5);font-size:0.78rem;margin:0;';
    tip2.textContent = '随喜解锁后可见';
    mask.appendChild(lock);
    mask.appendChild(tip2);
  }
  container.appendChild(mask);
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  initScrollReveal();
  audioPlayer.init();

  // 音乐按钮
  var musicBtn = document.querySelector('[data-music-toggle]');
  if (musicBtn) {
    musicBtn.addEventListener('click', function() { audioPlayer.toggle(); });
  }

  // 分享按钮
  var shareBtns = document.querySelectorAll('[data-share-btn]');
  shareBtns.forEach(function(btn) {
    btn.addEventListener('click', shareSite);
  });

  // 功德箱按钮
  var donateBtns = document.querySelectorAll('[data-donate-btn]');
  donateBtns.forEach(function(btn) {
    btn.addEventListener('click', showDonation);
  });
});
