// ===== 般若阁 全局认证模块 =====
// 管理用户登录状态、注册、登录、历史记录的统一入口
// 全局对象：BanruogeAuth
//
// localStorage 键名约定（layout.js 等其它模块可直接读取这两个键来判断登录态）：
//   banruoge_token
//   banruoge_username

var BanruogeAuth = (function () {
  var API_BASE = 'https://banroge-ai.duoqiang-wan.workers.dev';
  var TOKEN_KEY = 'banruoge_token';
  var USERNAME_KEY = 'banruoge_username';

  // 登录状态变化回调列表
  var authChangeCallbacks = [];

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function getUsername() {
    try { return localStorage.getItem(USERNAME_KEY) || ''; } catch (e) { return ''; }
  }

  function isLoggedIn() {
    return !!(getToken() && getUsername());
  }

  function setSession(token, username) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USERNAME_KEY, username);
    } catch (e) {}
    notifyAuthChange();
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USERNAME_KEY);
    } catch (e) {}
    notifyAuthChange();
  }

  function notifyAuthChange() {
    var state = { loggedIn: isLoggedIn(), username: getUsername() };
    authChangeCallbacks.forEach(function (cb) {
      try { cb(state); } catch (e) {}
    });
  }

  // 注册登录状态变化回调，返回取消注册的函数
  function onAuthChange(cb) {
    if (typeof cb === 'function') authChangeCallbacks.push(cb);
    return function () {
      var i = authChangeCallbacks.indexOf(cb);
      if (i >= 0) authChangeCallbacks.splice(i, 1);
    };
  }

  // 通用请求
  function request(path, method, body) {
    var url = API_BASE + path;
    var headers = { 'Content-Type': 'application/json' };
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    return fetch(url, {
      method: method || 'GET',
      headers: headers,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      return res.json().catch(function () { return { error: '响应解析失败' }; });
    });
  }

  // 登录：成功返回 {success, username}，失败返回 {success:false, error}
  function login(username, password) {
    if (!username || !password) {
      return Promise.resolve({ success: false, error: '请输入用户名和密码' });
    }
    return request('/api/login', 'POST', { username: username, password: password })
      .then(function (data) {
        if (data && data.success && data.token) {
          setSession(data.token, data.username || username);
          return { success: true, username: data.username || username };
        }
        return { success: false, error: (data && data.error) || '登录失败，请重试' };
      })
      .catch(function () {
        return { success: false, error: '网络异常，请稍后重试' };
      });
  }

  // 注册：成功返回 {success, username}，失败返回 {success:false, error}
  function register(username, password) {
    if (!username || !password) {
      return Promise.resolve({ success: false, error: '请输入用户名和密码' });
    }
    return request('/api/register', 'POST', { username: username, password: password })
      .then(function (data) {
        if (data && data.success && data.token) {
          setSession(data.token, data.username || username);
          return { success: true, username: data.username || username };
        }
        return { success: false, error: (data && data.error) || '注册失败，请重试' };
      })
      .catch(function () {
        return { success: false, error: '网络异常，请稍后重试' };
      });
  }

  // 退出登录
  function logout() {
    clearSession();
  }

  // 保存一条记录（已登录时调用）
  // record: { type, title, summary, detail? }
  function saveRecord(record) {
    if (!isLoggedIn()) {
      return Promise.resolve({ success: false, error: '未登录' });
    }
    var payload = {
      type: record.type,
      title: record.title,
      summary: record.summary
    };
    if (record.detail) payload.detail = record.detail;
    return request('/api/records', 'POST', payload).catch(function () {
      return { success: false, error: '网络异常，记录保存失败' };
    });
  }

  // 获取历史记录（已登录时调用）
  function getRecords() {
    if (!isLoggedIn()) {
      return Promise.resolve({ success: false, records: [], error: '未登录' });
    }
    return request('/api/records', 'GET').catch(function () {
      return { success: false, records: [], error: '网络异常' };
    });
  }

  // 验证当前 token 是否有效
  function verify() {
    if (!isLoggedIn()) return Promise.resolve({ valid: false });
    return request('/api/verify', 'GET').catch(function () { return { valid: false }; });
  }

  return {
    API_BASE: API_BASE,
    TOKEN_KEY: TOKEN_KEY,
    USERNAME_KEY: USERNAME_KEY,
    getToken: getToken,
    getUsername: getUsername,
    isLoggedIn: isLoggedIn,
    login: login,
    register: register,
    logout: logout,
    saveRecord: saveRecord,
    getRecords: getRecords,
    verify: verify,
    onAuthChange: onAuthChange
  };
})();
