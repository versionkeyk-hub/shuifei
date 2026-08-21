interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | string | null, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
}

interface Env {
  DB: D1Database;
  PRODUCT_ASSETS: R2Bucket;
  ASSETS: { fetch(request: Request): Promise<Response> };
  ADMIN_BOOTSTRAP_USERNAME?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  role: string;
  status: string;
  password_hash: string;
  password_algorithm: string;
}

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const publicApiHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' };

function json(data: unknown, init: ResponseInit = {}, headers = jsonHeaders): Response {
  return new Response(JSON.stringify(data), { ...init, headers: { ...headers, ...(init.headers || {}) } });
}

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  let value = '';
  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });
  return btoa(value);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function pbkdf2(password: string, salt?: Uint8Array, iterations = 100_000): Promise<string> {
  const resolvedSalt = salt || crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: resolvedSalt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return 'pbkdf2_sha256$' + iterations + '$' + toBase64(resolvedSalt) + '$' + toBase64(new Uint8Array(bits));
}

async function verifyPassword(password: string, user: UserRow): Promise<{ valid: boolean; upgrade?: string }> {
  if (user.password_algorithm === 'legacy_sha256') {
    const legacyHash = await sha256('pq_salt_' + password);
    return { valid: legacyHash === user.password_hash, upgrade: legacyHash === user.password_hash ? await pbkdf2(password) : undefined };
  }

  const [algorithm, iterations, encodedSalt, encodedHash] = user.password_hash.split('$');
  const iterationCount = Number(iterations);
  if (algorithm !== 'pbkdf2_sha256' || !Number.isInteger(iterationCount) || iterationCount < 10_000 || iterationCount > 100_000 || !encodedSalt || !encodedHash) {
    return { valid: false };
  }
  const derived = await pbkdf2(password, fromBase64(encodedSalt), iterationCount);
  return { valid: derived === user.password_hash };
}

async function ensureBootstrapAdmin(env: Env): Promise<void> {
  const username = env.ADMIN_BOOTSTRAP_USERNAME?.trim();
  const password = env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!username || !password) return;

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first<{ id: string }>();
  if (existing) return;

  const timestamp = now();
  await env.DB.prepare(
    'INSERT INTO users (id, username, display_name, role, status, password_hash, password_algorithm, created_at, updated_at, migrated_from) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(newId(), username, username, 'super_admin', 'approved', await pbkdf2(password), 'pbkdf2_sha256', timestamp, timestamp, 'bootstrap-secret')
    .run();
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function requireUser(request: Request, env: Env, allowedRoles?: string[]): Promise<UserRow | Response> {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return json({ error: '请先登录' }, { status: 401 });

  const tokenHash = await sha256(token);
  const session = await env.DB.prepare(
    'SELECT users.id, users.username, users.display_name, users.role, users.status, users.password_hash, users.password_algorithm FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?',
  )
    .bind(tokenHash, now())
    .first<UserRow>();
  if (!session || session.status !== 'approved') return json({ error: '登录已失效' }, { status: 401 });
  if (allowedRoles && !allowedRoles.includes(session.role)) return json({ error: '没有此操作权限' }, { status: 403 });
  return session;
}

function isResponse(value: UserRow | Response): value is Response {
  return value instanceof Response;
}

async function login(request: Request, env: Env): Promise<Response> {
  await ensureBootstrapAdmin(env);
  const body = await readBody(request);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) return json({ error: '请输入账号和密码' }, { status: 400 });

  const user = await env.DB.prepare(
    'SELECT id, username, display_name, role, status, password_hash, password_algorithm FROM users WHERE username = ?',
  )
    .bind(username)
    .first<UserRow>();
  if (!user) return json({ error: '账号或密码错误' }, { status: 401 });
  if (user.status !== 'approved') return json({ error: '该账号当前不可登录' }, { status: 403 });

  const passwordCheck = await verifyPassword(password, user);
  if (!passwordCheck.valid) return json({ error: '账号或密码错误' }, { status: 401 });
  if (passwordCheck.upgrade) {
    await env.DB.prepare('UPDATE users SET password_hash = ?, password_algorithm = ?, updated_at = ? WHERE id = ?')
      .bind(passwordCheck.upgrade, 'pbkdf2_sha256', now(), user.id)
      .run();
  }

  const token = toBase64(crypto.getRandomValues(new Uint8Array(32)));
  const timestamp = now();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(newId(), user.id, await sha256(token), expiresAt, timestamp)
    .run();
  return json({ token, expires_at: expiresAt, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
}

async function register(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || username.length > 64 || !displayName || displayName.length > 100) {
    return json({ error: '请填写有效的账号和姓名' }, { status: 400 });
  }
  if (/[\u0000-\u001F\u007F]/.test(username)) return json({ error: '账号不能包含控制字符' }, { status: 400 });
  if (password.length < 8 || password.length > 256) return json({ error: '密码长度应为 8 到 256 位' }, { status: 400 });

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first<{ id: string }>();
  if (existing) return json({ error: '该账号已被使用' }, { status: 409 });

  const timestamp = now();
  await env.DB.prepare(
    'INSERT INTO users (id, username, display_name, role, status, password_hash, password_algorithm, created_at, updated_at, migrated_from) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(newId(), username, displayName, 'farmer', 'pending', await pbkdf2(password), 'pbkdf2_sha256', timestamp, timestamp, 'cloud-register')
    .run();
  return json({ status: 'pending' }, { status: 201 });
}

async function getCurrentUser(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  if (isResponse(user)) return user;
  return json({ user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role, status: user.status } });
}

async function getProducts(url: URL, env: Env): Promise<Response> {
  const query = url.searchParams.get('query')?.trim() || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '100'), 1), 200);
  const search = '%' + query + '%';
  const statement = query
    ? env.DB.prepare('SELECT * FROM products WHERE name LIKE ? OR brand LIKE ? OR ingredients_json LIKE ? ORDER BY brand, name LIMIT ?').bind(search, search, search, limit)
    : env.DB.prepare('SELECT * FROM products ORDER BY brand, name LIMIT ?').bind(limit);
  const { results } = await statement.all<Record<string, string | number>>();
  const skusByProduct = new Map<string, Record<string, unknown>[]>();
  if (results.length) {
    const { results: skus } = await env.DB.prepare('SELECT * FROM product_skus ORDER BY product_id, price, specification').all<Record<string, unknown>>();
    const selectedIds = new Set(results.map((product) => String(product.id)));
    skus.forEach((sku) => {
      const productId = String(sku.product_id);
      if (!selectedIds.has(productId)) return;
      skusByProduct.set(productId, [...(skusByProduct.get(productId) || []), { ...sku, source_ref: parseJson(sku.source_ref_json as string, {}) }]);
    });
  }
  const products = results.map((product) => ({
    ...product,
    ingredients: parseJson(product.ingredients_json as string, {}),
    source_refs: parseJson(product.source_refs_json as string, []),
    images: parseJson(product.images_json as string, []),
    legacy_details: parseJson(product.legacy_details_json as string, {}),
    mix_flags: parseJson(product.mix_flags_json as string, {}),
    skus: skusByProduct.get(String(product.id)) || [],
  }));
  return json({ products }, {}, publicApiHeaders);
}

async function getPesticides(url: URL, env: Env): Promise<Response> {
  const query = url.searchParams.get('query')?.trim() || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '100'), 1), 200);
  const search = '%' + query + '%';
  const statement = query
    ? env.DB.prepare('SELECT * FROM pesticides WHERE component LIKE ? OR aliases_json LIKE ? OR category LIKE ? ORDER BY component LIMIT ?').bind(search, search, search, limit)
    : env.DB.prepare('SELECT * FROM pesticides ORDER BY component LIMIT ?').bind(limit);
  const { results } = await statement.all<Record<string, string>>();
  const pesticides = results.map((pesticide) => ({
    ...pesticide,
    aliases: parseJson(pesticide.aliases_json, []),
    brands: parseJson(pesticide.brands_json, []),
    related: parseJson(pesticide.related_json, []),
    flags: parseJson(pesticide.flags_json, {}),
  }));
  return json({ pesticides }, {}, publicApiHeaders);
}

async function getStats(env: Env): Promise<Response> {
  const [products, skus, pesticides, assets, audits] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS count FROM products').first<{ count: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM product_skus').first<{ count: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM pesticides').first<{ count: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM products WHERE images_json != ?').bind('[]').first<{ count: number }>(),
    env.DB.prepare('SELECT imported_at, record_counts_json FROM import_audits ORDER BY imported_at DESC LIMIT 1').first<{ imported_at: string; record_counts_json: string }>(),
  ]);
  return json({
    products: products?.count || 0,
    skus: skus?.count || 0,
    pesticides: pesticides?.count || 0,
    products_with_legacy_images: assets?.count || 0,
    last_import: audits ? { imported_at: audits.imported_at, record_counts: parseJson(audits.record_counts_json, {}) } : null,
  }, {}, publicApiHeaders);
}

async function getMixing(url: URL, env: Env): Promise<Response> {
  const component = url.searchParams.get('component')?.trim();
  if (!component) return json({ error: '请选择农药有效成分' }, { status: 400 });
  const pesticide = await env.DB.prepare('SELECT * FROM pesticides WHERE component = ?').bind(component).first<Record<string, string>>();
  if (!pesticide) return json({ error: '未找到该农药成分' }, { status: 404 });
  const { results: products } = await env.DB.prepare('SELECT id, name, brand, mix_flags_json FROM products ORDER BY brand, name').all<Record<string, string>>();
  const flags = parseJson<Record<string, boolean>>(pesticide.flags_json, {});
  const results = products.map((product) => {
    const productFlags = parseJson<Record<string, boolean>>(product.mix_flags_json, {});
    if (flags.is_copper || flags.is_heavy_metal || flags.is_herbicide || flags.is_strong_base || flags.is_strong_acid) {
      return { product, status: '禁混', interval: flags.is_strong_base || flags.is_strong_acid ? '至少7天' : '', reason: '该农药类别存在高风险混配禁忌，请分开使用并以标签为准。' };
    }
    if (flags.is_fungicide && productFlags.is_microbial) {
      return { product, status: '需间隔', interval: '3-5天', reason: '杀菌剂可能影响有益微生物活性，建议间隔使用。' };
    }
    if ((flags.has_calcium && productFlags.is_phosphorus) || (flags.has_phosphorus && productFlags.is_calcium)) {
      return { product, status: '需间隔', interval: '2-3天', reason: '钙、磷同时混配可能产生沉淀，建议分开施用。' };
    }
    return { product, status: '待核验', interval: '', reason: '基础规则未发现明确禁忌；请以产品标签、实际水质和小范围试验为准。' };
  });
  return json({ component, results }, {}, publicApiHeaders);
}

async function uploadAsset(request: Request, env: Env, key: string): Promise<Response> {
  const user = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(user)) return user;
  if (!request.body) return json({ error: '未提供文件内容' }, { status: 400 });
  const safeKey = key.replace(/^\/+/, '').replace(/\.\./g, '');
  if (!safeKey.startsWith('products/')) return json({ error: '仅允许上传产品图片' }, { status: 400 });
  await env.PRODUCT_ASSETS.put(safeKey, request.body, { httpMetadata: { contentType: request.headers.get('content-type') || 'application/octet-stream' } });
  return json({ key: safeKey, url: '/api/assets/' + safeKey }, { status: 201 });
}

async function getAsset(env: Env, key: string): Promise<Response> {
  const safeKey = key.replace(/^\/+/, '').replace(/\.\./g, '');
  const asset = await env.PRODUCT_ASSETS.get(safeKey);
  if (!asset) return new Response('Not found', { status: 404 });
  return new Response(asset.body, { headers: { 'content-type': asset.httpMetadata?.contentType || 'application/octet-stream', 'cache-control': 'public, max-age=86400' } });
}

async function listImportAudits(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(user)) return user;
  const { results } = await env.DB.prepare('SELECT * FROM import_audits ORDER BY imported_at DESC LIMIT 50').all<Record<string, string>>();
  return json({ audits: results.map((audit) => ({ ...audit, record_counts: parseJson(audit.record_counts_json, {}) })) });
}

const managedRoles = ['super_admin', 'admin', 'staff', 'dealer', 'farmer'];
const managedStatuses = ['pending', 'approved', 'rejected', 'disabled'];

async function listAdminUsers(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env, ['super_admin']);
  if (isResponse(user)) return user;
  const { results } = await env.DB.prepare(
    "SELECT id, username, display_name, role, status, created_at, updated_at, migrated_from FROM users ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 200",
  ).all<Record<string, unknown>>();
  return json({ users: results });
}

async function updateAdminUser(request: Request, env: Env, userId: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin']);
  if (isResponse(actor)) return actor;
  const body = await readBody(request);
  const target = await env.DB.prepare('SELECT id, username, role, status FROM users WHERE id = ?').bind(userId).first<{ id: string; username: string; role: string; status: string }>();
  if (!target) return json({ error: '未找到该用户' }, { status: 404 });

  const nextRole = typeof body.role === 'string' && managedRoles.includes(body.role) ? body.role : target.role;
  const nextStatus = typeof body.status === 'string' && managedStatuses.includes(body.status) ? body.status : target.status;
  const displayName = typeof body.display_name === 'string' && body.display_name.trim() ? body.display_name.trim().slice(0, 100) : null;
  if (target.id === actor.id && (nextRole !== target.role || nextStatus !== target.status)) {
    return json({ error: '不能通过当前会话修改自己的角色或登录状态' }, { status: 400 });
  }

  await env.DB.prepare('UPDATE users SET display_name = COALESCE(?, display_name), role = ?, status = ?, updated_at = ? WHERE id = ?')
    .bind(displayName, nextRole, nextStatus, now(), target.id)
    .run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, 'update', 'user', target.id, JSON.stringify({ username: target.username, role: nextRole, status: nextStatus }), now())
    .run();
  return json({ user: { id: target.id, username: target.username, display_name: displayName || undefined, role: nextRole, status: nextStatus } });
}

async function resetAdminUserPassword(request: Request, env: Env, userId: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin']);
  if (isResponse(actor)) return actor;
  const body = await readBody(request);
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 8 || password.length > 256) return json({ error: '密码长度应为 8 到 256 位' }, { status: 400 });
  const target = await env.DB.prepare('SELECT id, username FROM users WHERE id = ?').bind(userId).first<{ id: string; username: string }>();
  if (!target) return json({ error: '未找到该用户' }, { status: 404 });

  await env.DB.prepare('UPDATE users SET password_hash = ?, password_algorithm = ?, updated_at = ? WHERE id = ?')
    .bind(await pbkdf2(password), 'pbkdf2_sha256', now(), target.id)
    .run();
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(target.id).run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, 'reset_password', 'user', target.id, JSON.stringify({ username: target.username }), now())
    .run();
  return json({ status: 'updated' });
}

async function updateSkuPrice(request: Request, env: Env, skuId: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const body = await readBody(request);
  const price = finiteNumber(body.price);
  const priceTier = typeof body.price_tier === 'string' ? body.price_tier.trim().slice(0, 50) : '';
  if (price === null || price < 0 || price > 10_000_000) return json({ error: '请输入有效报价' }, { status: 400 });

  const sku = await env.DB.prepare(
    'SELECT product_skus.id, product_skus.price, product_skus.specification, products.name AS product_name FROM product_skus JOIN products ON products.id = product_skus.product_id WHERE product_skus.id = ?',
  ).bind(skuId).first<{ id: string; price: number | null; specification: string; product_name: string }>();
  if (!sku) return json({ error: '未找到该 SKU' }, { status: 404 });

  await env.DB.prepare('UPDATE product_skus SET price = ?, price_tier = ?, updated_at = ? WHERE id = ?')
    .bind(price, priceTier || '管理员报价', now(), sku.id)
    .run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, 'update_price', 'product_sku', sku.id, JSON.stringify({ product: sku.product_name, specification: sku.specification, before: sku.price, after: price, price_tier: priceTier || '管理员报价' }), now())
    .run();
  return json({ sku: { id: sku.id, price, price_tier: priceTier || '管理员报价' } });
}

interface PlanRequestItem {
  product_sku_id?: unknown;
  dose_per_mu?: unknown;
  dose_unit?: unknown;
  quoted_price?: unknown;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function savePlan(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  if (isResponse(user)) return user;

  const body = await readBody(request);
  const cropName = typeof body.crop_name === 'string' ? body.crop_name.trim().slice(0, 100) : '';
  const target = typeof body.target === 'string' ? body.target.trim().slice(0, 100) : '';
  const tier = body.tier === 'high' || body.tier === 'middle' || body.tier === 'low' ? body.tier : '';
  const usageCount = finiteNumber(body.usage_count);
  const interval = typeof body.usage_interval === 'string' ? body.usage_interval.trim().slice(0, 200) : '';
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : '';
  const items = Array.isArray(body.items) ? body.items as PlanRequestItem[] : [];

  if (!cropName || !target || !items.length) return json({ error: '作物、目标和至少一个产品 SKU 为必填项' }, { status: 400 });
  if (items.length > 20) return json({ error: '单个方案最多保存 20 个产品' }, { status: 400 });

  const timestamp = now();
  const planId = newId();
  const crop = await env.DB.prepare('SELECT id FROM crops WHERE name = ?').bind(cropName).first<{ id: string }>();
  const planTitle = cropName + ' · ' + target + (tier ? ' · ' + (tier === 'high' ? '高端配置' : tier === 'middle' ? '中端配置' : '低端配置') : '');
  const validatedItems: Array<{
    skuId: string;
    productName: string;
    sourceType: string;
    specification: string;
    sourceReference: string;
    doseValue: number | null;
    doseUnit: string;
    quotedPrice: number | null;
  }> = [];

  for (const item of items) {
    const skuId = typeof item.product_sku_id === 'string' ? item.product_sku_id.trim() : '';
    const doseValue = finiteNumber(item.dose_per_mu);
    const doseUnit = typeof item.dose_unit === 'string' ? item.dose_unit.trim().slice(0, 50) : '';
    const quotedPrice = finiteNumber(item.quoted_price);
    if (!skuId || !doseUnit) return json({ error: '每个产品都必须选择真实 SKU 并填写用量单位' }, { status: 400 });
    if (doseValue !== null && doseValue < 0) return json({ error: '产品用量不能为负数' }, { status: 400 });
    if (quotedPrice !== null && quotedPrice < 0) return json({ error: '产品报价不能为负数' }, { status: 400 });

    const sku = await env.DB.prepare(
      'SELECT product_skus.id AS sku_id, product_skus.specification, product_skus.source_ref_json, products.name AS product_name, products.source_type FROM product_skus JOIN products ON products.id = product_skus.product_id WHERE product_skus.id = ?',
    )
      .bind(skuId)
      .first<{ sku_id: string; specification: string; source_ref_json: string; product_name: string; source_type: string }>();
    if (!sku) return json({ error: '方案中包含不存在的产品 SKU，请刷新产品库后重新选择' }, { status: 400 });
    validatedItems.push({
      skuId: sku.sku_id,
      productName: sku.product_name,
      sourceType: sku.source_type,
      specification: sku.specification,
      sourceReference: sku.source_ref_json,
      doseValue,
      doseUnit,
      quotedPrice,
    });
  }

  await env.DB.prepare(
    'INSERT INTO fertilizer_plans (id, crop_id, owner_user_id, source_plan_id, title, target, plan_type, tier, is_official, usage_count, usage_interval, description, function_tags_json, notices, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(planId, crop?.id || null, user.id, planTitle, target, 'target_stage', tier, usageCount, interval, description, JSON.stringify([target]), '使用前请以产品标签、登记信息、混配试验和现场农艺判断为准。', timestamp, timestamp)
    .run();

  for (let index = 0; index < validatedItems.length; index += 1) {
    const item = validatedItems[index];
    await env.DB.prepare(
      'INSERT INTO fertilizer_plan_items (id, plan_id, product_sku_id, product_name_snapshot, source_type, application_method, dose_value, dose_unit, usage_count, usage_interval, sort_order, notes, product_sku_specification, quoted_price, source_ref_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)',
    )
      .bind(newId(), planId, item.skuId, item.productName, item.sourceType, '', item.doseValue, item.doseUnit, interval, index, '', item.specification, item.quotedPrice, item.sourceReference)
      .run();
  }

  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), user.id, 'create', 'fertilizer_plan', planId, JSON.stringify({ title: planTitle, item_count: items.length }), timestamp)
    .run();

  return json({ plan: { id: planId, title: planTitle, created_at: timestamp } }, { status: 201 });
}

async function listMyPlans(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  if (isResponse(user)) return user;
  const { results: plans } = await env.DB.prepare(
    'SELECT id, title, target, plan_type, tier, usage_count, usage_interval, description, created_at, updated_at FROM fertilizer_plans WHERE owner_user_id = ? ORDER BY updated_at DESC LIMIT 50',
  )
    .bind(user.id)
    .all<Record<string, unknown>>();

  const ids = plans.map((plan) => String(plan.id));
  const itemsByPlan = new Map<string, Record<string, unknown>[]>();
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(', ');
    const { results: planItems } = await env.DB.prepare(
      'SELECT plan_id, product_name_snapshot, source_type, dose_value, dose_unit, usage_count, usage_interval, product_sku_specification, quoted_price, source_ref_json FROM fertilizer_plan_items WHERE plan_id IN (' + placeholders + ') ORDER BY sort_order',
    )
      .bind(...ids)
      .all<Record<string, unknown>>();
    planItems.forEach((item) => {
      const planId = String(item.plan_id);
      itemsByPlan.set(planId, [...(itemsByPlan.get(planId) || []), { ...item, source_ref: parseJson(String(item.source_ref_json || ''), {}) }]);
    });
  }
  return json({ plans: plans.map((plan) => ({ ...plan, items: itemsByPlan.get(String(plan.id)) || [] })) });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204 });

    try {
      if (url.pathname === '/api/health') return json({ status: 'ok', time: now() }, {}, publicApiHeaders);
      if (url.pathname === '/api/auth/login' && request.method === 'POST') return login(request, env);
      if (url.pathname === '/api/auth/register' && request.method === 'POST') return register(request, env);
      if (url.pathname === '/api/auth/me' && request.method === 'GET') return getCurrentUser(request, env);
      if (url.pathname === '/api/catalog/stats' && request.method === 'GET') return getStats(env);
      if (url.pathname === '/api/products' && request.method === 'GET') return getProducts(url, env);
      if (url.pathname === '/api/pesticides' && request.method === 'GET') return getPesticides(url, env);
      if (url.pathname === '/api/mixing' && request.method === 'GET') return getMixing(url, env);
      if (url.pathname === '/api/plans' && request.method === 'POST') return savePlan(request, env);
      if (url.pathname === '/api/plans' && request.method === 'GET') return listMyPlans(request, env);
      if (url.pathname === '/api/admin/import-audits' && request.method === 'GET') return listImportAudits(request, env);
      if (url.pathname === '/api/admin/users' && request.method === 'GET') return listAdminUsers(request, env);
      if (url.pathname.startsWith('/api/admin/users/') && url.pathname.endsWith('/password') && request.method === 'POST') return resetAdminUserPassword(request, env, decodeURIComponent(url.pathname.slice('/api/admin/users/'.length, -'/password'.length)));
      if (url.pathname.startsWith('/api/admin/users/') && request.method === 'PATCH') return updateAdminUser(request, env, decodeURIComponent(url.pathname.slice('/api/admin/users/'.length)));
      if (url.pathname.startsWith('/api/admin/skus/') && request.method === 'PATCH') return updateSkuPrice(request, env, decodeURIComponent(url.pathname.slice('/api/admin/skus/'.length)));
      if (url.pathname.startsWith('/api/assets/') && request.method === 'GET') return getAsset(env, decodeURIComponent(url.pathname.slice('/api/assets/'.length)));
      if (url.pathname.startsWith('/api/admin/assets/') && request.method === 'PUT') return uploadAsset(request, env, decodeURIComponent(url.pathname.slice('/api/admin/assets/'.length)));
      if (url.pathname.startsWith('/api/')) return json({ error: '未找到接口' }, { status: 404 });
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: '服务处理失败，请稍后重试' }, { status: 500 });
    }
  },
};
