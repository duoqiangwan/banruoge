// ===== 般若阁 共享布局 =====
// 在每个子页面中引入此文件，自动生成导航、背景、底部

function generateLayout() {
  // 顶部导航
  var header = '\
<header class="top-nav" id="topNav">\
<a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;">\
<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:36px;height:36px;color:var(--gold);filter:drop-shadow(0 0 8px rgba(201,160,94,0.4));">\
<path d="M32 6 C 22 6, 12 12, 10 22 C 8 32, 14 44, 24 50 C 28 53, 30 56, 31 60 L 32 62 L 33 60 C 34 56, 36 53, 40 50 C 50 44, 56 32, 54 22 C 52 12, 42 6, 32 6 Z" fill="currentColor" fill-opacity="0.12"/>\
<path d="M32 8 V 60" stroke-width="1.4"/>\
<path d="M32 16 C 26 18, 20 22, 16 28"/>\
<path d="M32 16 C 38 18, 44 22, 48 28"/>\
<path d="M32 28 C 24 30, 18 36, 16 42"/>\
<path d="M32 28 C 40 30, 46 36, 48 42"/>\
<path d="M32 42 C 28 46, 26 50, 26 54"/>\
<path d="M32 42 C 36 46, 38 50, 38 54"/>\
</svg>\
<span class="font-display gold-text-gradient" style="font-size:1.65rem;letter-spacing:0.12em;">般若阁</span>\
</a>\
<nav id="navLinks" style="display:none;gap:20px;"></nav>\
<div style="display:flex;align-items:center;gap:8px;">\
<button data-music-toggle title="开启禅修背景音乐" style="width:36px;height:36px;border-radius:50%;border:1px solid rgba(201,160,94,0.25);color:var(--paper-dark);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;">\
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>\
</button>\
<a href="/profile/" id="profileLink" style="display:none;">\
<span style="border:1px solid rgba(201,160,94,0.3);border-radius:999px;padding:6px 12px;font-size:0.875rem;color:var(--gold);text-decoration:none;">我的</span>\
</a>\
</div>\
<div class="gold-divider" style="position:absolute;bottom:0;left:0;right:0;opacity:0;transition:opacity 0.3s;"></div>\
</header>';

  var navItems = [
    {href:'/qifu/',text:'为家人祈福'},
    {href:'/almanac/',text:'今日黄历'},
    {href:'/lottery/',text:'求灵签'},
    {href:'/bazi/',text:'八字精批'},
    {href:'/dream/',text:'周公解梦'},
    {href:'/palmistry/',text:'手相 / 面相'},
    {href:'/naming/',text:'宝宝起名'},
    {href:'/divination/',text:'六爻占卜'},
    {href:'/meditation/',text:'静心禅坐'}
  ];

  // 底部导航
  var bottomBar = '\
<nav class="bottom-bar">\
<div style="display:grid;grid-template-columns:repeat(6,1fr);padding:8px 4px;padding-bottom:max(env(safe-area-inset-bottom),8px);">\
<a href="/" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;text-decoration:none;color:var(--ink-muted);font-size:0.75rem;" id="nav-home">\
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>\
<span style="font-size:11px;">首页</span>\
</a>\
<a href="/qifu/" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;text-decoration:none;color:var(--ink-muted);font-size:0.75rem;" id="nav-qifu">\
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>\
<span style="font-size:11px;">祈福</span>\
</a>\
<a href="/almanac/" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;text-decoration:none;color:var(--ink-muted);font-size:0.75rem;" id="nav-almanac">\
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>\
<span style="font-size:11px;">黄历</span>\
</a>\
<a href="/lottery/" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;text-decoration:none;color:var(--ink-muted);font-size:0.75rem;" id="nav-lottery">\
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg>\
<span style="font-size:11px;">灵签</span>\
</a>\
<a href="/profile/" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;text-decoration:none;color:var(--ink-muted);font-size:0.75rem;" id="nav-profile">\
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>\
<span style="font-size:11px;">我的</span>\
</a>\
<a href="/more/" style="display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 0;text-decoration:none;color:var(--ink-muted);font-size:0.75rem;" id="nav-more">\
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>\
<span style="font-size:11px;">更多</span>\
</a>\
</div>\
</nav>';

  // 背景层
  var bg = '\
<div class="bg-decoration bg-gradient-base"></div>\
<div class="bg-decoration bg-radial-overlay"></div>\
<div class="bg-decoration" style="position:fixed;top:0;left:0;right:0;height:128px;background:linear-gradient(to bottom,rgba(201,160,94,0.15),transparent);z-index:0;"></div>\
<div class="bg-decoration">\
<span class="animate-glow-rise" style="position:absolute;width:6px;height:6px;border-radius:50%;background:rgba(201,160,94,0.4);left:12%;top:20%;animation-delay:0s;animation-duration:5s;"></span>\
<span class="animate-glow-rise" style="position:absolute;width:6px;height:6px;border-radius:50%;background:rgba(201,160,94,0.4);left:32%;top:65%;animation-delay:1.2s;animation-duration:5s;"></span>\
<span class="animate-glow-rise" style="position:absolute;width:6px;height:6px;border-radius:50%;background:rgba(201,160,94,0.4);left:55%;top:38%;animation-delay:2.4s;animation-duration:5s;"></span>\
<span class="animate-glow-rise" style="position:absolute;width:6px;height:6px;border-radius:50%;background:rgba(201,160,94,0.4);left:72%;top:72%;animation-delay:0.8s;animation-duration:5s;"></span>\
<span class="animate-glow-rise" style="position:absolute;width:6px;height:6px;border-radius:50%;background:rgba(201,160,94,0.4);left:85%;top:28%;animation-delay:3.1s;animation-duration:5s;"></span>\
</div>';

  // 浮动按钮
  var fab = '<button class="fab" title="随喜功德" onclick="showDonation()">功</button>';

  // 插入到页面
  var body = document.body;
  body.insertAdjacentHTML('afterbegin', bg + header);
  body.insertAdjacentHTML('beforeend', fab + bottomBar);

  // 填充导航
  var navLinks = document.getElementById('navLinks');
  if (navLinks) {
    navItems.forEach(function(item) {
      var a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.text;
      a.className = 'nav-link';
      a.style.cssText = 'font-size:0.875rem;color:var(--paper-dark);text-decoration:none;transition:color 0.2s;';
      a.onmouseenter = function() { this.style.color = 'var(--gold)'; };
      a.onmouseleave = function() { this.style.color = 'var(--paper-dark)'; };
      navLinks.appendChild(a);
    });
  }

  // 显示桌面导航
  function checkNav() {
    var links = document.getElementById('navLinks');
    var profile = document.getElementById('profileLink');
    if (window.innerWidth >= 768) {
      if (links) links.style.display = 'flex';
      if (profile) profile.style.display = 'inline-block';
    } else {
      if (links) links.style.display = 'none';
      if (profile) profile.style.display = 'none';
    }
  }
  checkNav();
  window.addEventListener('resize', checkNav);

  // 高亮当前页
  var path = window.location.pathname.replace(/\/$/, '');
  var pageMap = {'':'home','/qifu':'qifu','/almanac':'almanac','/lottery':'lottery','/profile':'profile','/more':'more'};
  Object.keys(pageMap).forEach(function(key) {
    if (path === key) {
      var el = document.getElementById('nav-' + pageMap[key]);
      if (el) el.style.color = 'var(--gold)';
    }
  });

  // 底部留空间
  var main = document.querySelector('main');
  if (main) {
    main.style.paddingBottom = window.innerWidth < 768 ? '96px' : '32px';
  }
}

// 页面加载后生成布局
document.addEventListener('DOMContentLoaded', function() {
  generateLayout();
  initScrollReveal();
  audioPlayer.init();

  var musicBtn = document.querySelector('[data-music-toggle]');
  if (musicBtn) {
    musicBtn.addEventListener('click', function() { audioPlayer.toggle(); });
  }
});
