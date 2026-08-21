// ============================================================
// 用户认证模块 - 基于 Supabase 云数据库
// 全球任何人都可注册，管理员后台实时审核
// ============================================================

// Supabase 项目配置
var SUPABASE_URL = 'https://alqngmojtbsgzkgrlvuz.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_uzxo5YUZ5cvE5myb522D7g_BCo-RseE'; // 可发布密钥

var supaClient = null;
var SS_KEY_SESSION = 'pq_session_uid';

var USER_TYPES = {
  staff: '农小蛙',
  farmer: '农户',
  dealer: '经销商'
};

// ---- 初始化 Supabase 客户端 ----
function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase SDK 未加载，请检查<script>引用');
    return false;
  }
  if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
    console.error('Supabase URL 未配置');
    return false;
  }
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('Supabase anon key 未配置');
    return false;
  }
  supaClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

// ---- 密码哈希（SHA-256，用浏览器内置 Web Crypto API）----
async function hashPassword(password) {
  var encoder = new TextEncoder();
  var data = encoder.encode('pq_salt_' + password);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

// ---- 注册 ----
async function registerUser(name, type, password) {
  name = (name || '').trim();
  type = type || '';
  password = password || '';

  if (!name) return { ok: false, message: '请输入姓名' };
  if (!type) return { ok: false, message: '请选择用户类别' };
  if (!password || password.length < 4) return { ok: false, message: '密码至少4位' };
  if (!USER_TYPES[type]) return { ok: false, message: '用户类别无效' };

  if (!supaClient) {
    if (!initSupabase()) return { ok: false, message: '系统初始化失败，请联系管理员' };
  }

  var hashed = await hashPassword(password);

  var user = {
    id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
    name: name,
    type: type,
    password_hash: hashed,
    status: (type === 'staff') ? 'pending' : 'approved',
    created_at: new Date().toISOString()
  };

  var { data, error } = await supaClient
    .from('app_users')
    .insert([user])
    .select();

  if (error) {
    if (error.message && error.message.indexOf('duplicate') !== -1) {
      return { ok: false, message: '该姓名已注册，请换一个或联系管理员' };
    }
    return { ok: false, message: '注册失败：' + (error.message || '未知错误') };
  }

  // 农户/经销商直接登录
  if (user.status === 'approved') {
    sessionStorage.setItem(SS_KEY_SESSION, user.id);
    sessionStorage.setItem('pq_session_type', user.type);
    sessionStorage.setItem('pq_session_name', user.name);
    return { ok: true, user: user, autoLogin: true };
  }

  // 农小蛙等待审核
  return { ok: true, user: user, pending: true };
}

// ---- 登录 ----
async function loginUser(name, password) {
  name = (name || '').trim();
  password = password || '';

  if (!name || !password) return { ok: false, message: '请输入姓名和密码' };

  if (!supaClient) {
    if (!initSupabase()) return { ok: false, message: '系统初始化失败' };
  }

  var hashed = await hashPassword(password);

  var { data, error } = await supaClient
    .from('app_users')
    .select('*')
    .eq('name', name)
    .eq('password_hash', hashed);

  if (error) return { ok: false, message: '登录失败：' + (error.message || '未知错误') };
  if (!data || data.length === 0) return { ok: false, message: '姓名或密码错误' };

  var u = data[0];

  if (u.status === 'pending') {
    return { ok: false, message: '您的注册正在等待管理员审核，请耐心等待', pending: true };
  }
  if (u.status === 'rejected') {
    return { ok: false, message: '您的注册申请未通过审核，请联系管理员' };
  }
  if (u.status === 'approved') {
    sessionStorage.setItem(SS_KEY_SESSION, u.id);
    sessionStorage.setItem('pq_session_type', u.type);
    sessionStorage.setItem('pq_session_name', u.name);
    return { ok: true, user: u };
  }

  return { ok: false, message: '账号状态异常' };
}

// ---- 登出 ----
function logoutUser() {
  sessionStorage.removeItem(SS_KEY_SESSION);
  sessionStorage.removeItem('pq_session_type');
  sessionStorage.removeItem('pq_session_name');
}

// ---- 会话 ----
// 优先用 sessionStorage 缓存，Supabase 查询作为验证
function getCurrentUserSync() {
  var uid = sessionStorage.getItem(SS_KEY_SESSION);
  if (!uid) return null;
  return {
    id: uid,
    type: sessionStorage.getItem('pq_session_type'),
    name: sessionStorage.getItem('pq_session_name'),
    status: 'approved'
  };
}

async function getCurrentUser() {
  var uid = sessionStorage.getItem(SS_KEY_SESSION);
  if (!uid) return null;

  if (!supaClient) {
    if (!initSupabase()) {
      // SDK没加载但sessionStorage有缓存，返回缓存
      return getCurrentUserSync();
    }
  }

  var { data, error } = await supaClient
    .from('app_users')
    .select('*')
    .eq('id', uid)
    .single();

  if (error || !data) {
    // 查不到可能是被删了，清掉session
    logoutUser();
    return null;
  }

  return data;
}

function isLoggedIn() {
  return sessionStorage.getItem(SS_KEY_SESSION) !== null;
}

// ---- 权限判断 ----
function canSeeFullIngredients() {
  var user = getCurrentUserSync();
  if (!user) return false;
  return user.type === 'staff';
}

function isPendingApproval() {
  // 这个函数现在不太用了，因为pending用户根本登不进来
  return false;
}

// ============================================================
// 管理员操作（在 admin.html 中调用）
// ============================================================

async function getAllUsers() {
  if (!supaClient) {
    if (!initSupabase()) return [];
  }
  var { data, error } = await supaClient
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('获取用户列表失败', error); return []; }
  return data || [];
}

async function approveUser(id) {
  if (!supaClient) { if (!initSupabase()) return false; }
  var { error } = await supaClient
    .from('app_users')
    .update({ status: 'approved' })
    .eq('id', id);
  return !error;
}

async function rejectUser(id) {
  if (!supaClient) { if (!initSupabase()) return false; }
  var { error } = await supaClient
    .from('app_users')
    .update({ status: 'rejected' })
    .eq('id', id);
  return !error;
}

async function deleteUser(id) {
  if (!supaClient) { if (!initSupabase()) return false; }
  var { error } = await supaClient
    .from('app_users')
    .delete()
    .eq('id', id);
  return !error;
}

// 这些同步版本已废弃，保留兼容
function getPendingUsers() { return []; }
function getApprovedUsers() { return []; }
