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
  AI?: { run(model: string, input: unknown): Promise<unknown> };
  AI_MODEL?: string;
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
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '100'), 1), 10000);
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
  const [legacyProducts, legacySpecs, modernProducts, modernSkus, pesticides, assets, audits] = await Promise.all([
    env.DB.prepare('SELECT id, name, payload_json FROM legacy_products').all<Record<string, unknown>>(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM legacy_product_specs').first<{ count: number }>(),
    env.DB.prepare('SELECT id, name FROM products').all<Record<string, unknown>>(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM product_skus').first<{ count: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS count FROM legacy_pesticides').first<{ count: number }>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM legacy_products WHERE payload_json LIKE '%\"images\"%'").first<{ count: number }>(),
    env.DB.prepare('SELECT imported_at, record_counts_json FROM import_audits ORDER BY imported_at DESC LIMIT 1').first<{ imported_at: string; record_counts_json: string }>(),
  ]);
  const unmatchedModernProducts = modernProducts.results.filter((modernProduct) => !legacyProducts.results.some((legacyProduct) => modernProductMatchesNative(legacyProduct, modernProduct))).length;
  return json({
    products: legacyProducts.results.length + unmatchedModernProducts,
    skus: (legacySpecs?.count || 0) + (modernSkus?.count || 0),
    source_products: modernProducts.results.length,
    source_skus: modernSkus?.count || 0,
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
    return { product, status: '可混（需小试）', interval: '', reason: '基础规则未发现明确拮抗；仍需按产品标签、实际水质并经过小范围试验确认。' };
  });
  return json({ component, results }, {}, publicApiHeaders);
}

function parseNativePayload<T>(value: string | null | undefined, fallback: T): T {
  return parseJson(value, fallback);
}

type NativePayload = Record<string, any>;

function mergePesticideExtras(component: string, related: unknown, extraMap: Map<string, NativePayload>): NativePayload | null {
  const names = [component, ...(Array.isArray(related) ? related.map(String) : [])];
  const entries = names.map((name) => extraMap.get(name)).filter((value): value is NativePayload => Boolean(value));
  if (!entries.length) return null;
  const merged = entries.reduce<NativePayload>((result, entry) => ({ ...result, ...entry }), {});
  const phValues = [...new Set(entries.map((entry) => String(entry.ph_diluted_250 ?? entry.ph ?? '')).filter(Boolean))];
  const contraindications = [...new Set(entries.map((entry) => String(entry.contraindications || '')).filter(Boolean))];
  return {
    ...merged,
    component,
    ...(phValues.length ? { ph: phValues.join(' / ') } : {}),
    ...(contraindications.length ? { contraindications: contraindications.join('\n\n') } : {}),
  };
}

function pesticidePHView(extra: NativePayload | null): NativePayload | null {
  if (!extra) return null;
  const diluted = parsePH(extra.ph_diluted_250 ?? extra.ph);
  if (diluted === null) return { ...extra, ph: null, ph_diluted_250: null, ph_general_use: null, ph_note: '' };
  const generalUse = roundPH(diluted + (7 - diluted) * 0.8);
  return { ...extra, ph: diluted, ph_diluted_250: diluted, ph_general_use: generalUse, ph_note: '农药统一按登记/资料中的 1:250 倍稀释 pH 展示；一般使用浓度为向中性值估算的参考值' };
}

async function getViewerRole(request: Request, env: Env): Promise<string> {
  if (!request.headers.get('authorization')) return 'farmer';
  const user = await requireUser(request, env);
  return isResponse(user) ? 'farmer' : user.role;
}

function canSeeTechnicalDetails(role: string): boolean {
  return ['super_admin', 'admin', 'staff', 'expert'].includes(role);
}

function parsePH(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numbers = String(value).match(/\d+\.?\d*/g)?.map(Number) || [];
  if (!numbers.length) return null;
  return numbers.reduce((sum, item) => sum + item, 0) / numbers.length;
}

function roundPH(value: number): number {
  return Math.round(value * 100) / 100;
}

function displayPH(value: unknown, role: string): number | null {
  const original = parsePH(value);
  if (original === null) return null;
  if (canSeeTechnicalDetails(role)) return roundPH(original);
  return roundPH(original + (7 - original) * 0.8);
}

function sanitizeProductPayload(payload: NativePayload, role: string): NativePayload {
  const next = { ...payload };
  const profile = payload.mix_profile && typeof payload.mix_profile === 'object' ? { ...payload.mix_profile } : null;
  if (profile) {
    const diluted = parsePH(profile.ph_diluted_250 ?? profile.ph);
    const afterMix = parsePH(profile.ph_after_fertilizer) ?? (diluted === null ? null : roundPH(diluted + (7 - diluted) * 0.8));
    const labelRange = String(profile.ph_label_range || profile.ph_packaging || profile.ph_label || '').trim();
    if (canSeeTechnicalDetails(role)) {
      profile.ph = diluted === null ? '' : String(roundPH(diluted));
      profile.ph_diluted_250 = diluted === null ? '' : roundPH(diluted);
      profile.ph_after_fertilizer = afterMix === null ? '' : roundPH(afterMix);
      profile.ph_label_range = labelRange;
      profile.ph_display_note = '技术视图：按 1:250 倍稀释测试值展示；用户配肥后值按管理员设定或 80% 向中性值估算';
    } else {
      profile.ph = labelRange;
      delete profile.ph_diluted_250;
      delete profile.ph_after_fertilizer;
      profile.ph_display_note = '农户/经销商视图：显示包装标注 pH 范围';
    }
    next.mix_profile = profile;
  }
  return next;
}

function augmentNativeSpecification(row: Record<string, unknown>): Record<string, unknown> {
  const payload = parseNativePayload<NativePayload>(String(row.payload_json || ''), {});
  const packageData = {
    unit_name: payload.unit_name || payload.package_unit || payload.inner_pack_unit || row.unit || '',
    inner_pack_count: finiteNumber(payload.inner_pack_count) ?? finiteNumber(row.inner_pack_count),
    inner_pack_unit: payload.inner_pack_unit || payload.unit_name || row.unit || '',
    case_price: finiteNumber(payload.case_price),
    unit_price: finiteNumber(payload.unit_price) ?? finiteNumber(payload.price),
    coverage_per_package: finiteNumber(payload.coverage_per_package),
    coverage_unit: payload.coverage_unit || '亩',
    dose_value: finiteNumber(payload.dose_value),
    dose_unit: payload.dose_unit || '',
    price: finiteNumber(payload.price) ?? finiteNumber(payload.unit_price),
    price_tier: payload.price_tier || '标准价',
  };
  return { ...row, payload, package: packageData };
}

function normalizeCatalogName(value: unknown): string {
  return String(value || '').toLowerCase().replace(/[\s·.。()（）_-]/g, '');
}

function modernProductMatchesNative(nativeProduct: Record<string, unknown>, modernProduct: Record<string, unknown>): boolean {
  const nativeName = normalizeCatalogName(nativeProduct.name);
  const nativePayload = parseNativePayload<NativePayload>(String(nativeProduct.payload_json || ''), {});
  const aliases = [nativeName, ...(Array.isArray(nativePayload.aliases) ? nativePayload.aliases.map(normalizeCatalogName) : [])].filter(Boolean);
  const candidate = normalizeCatalogName(modernProduct.name);
  return aliases.some((alias) => alias === candidate || alias.includes(candidate) || candidate.includes(alias));
}

function mergeUnifiedSpecifications(
  nativeProduct: Record<string, unknown>,
  legacySpecifications: Record<string, unknown>[],
  modernProducts: Record<string, unknown>[],
  modernSkus: Record<string, unknown>[],
  modernProductOwners?: Map<string, string>,
): Record<string, unknown>[] {
  const nativeName = normalizeCatalogName(nativeProduct.name);
  const nativePayload = parseNativePayload<NativePayload>(String(nativeProduct.payload_json || ''), {});
  const aliases = [nativeName, ...(Array.isArray(nativePayload.aliases) ? nativePayload.aliases.map(normalizeCatalogName) : [])].filter(Boolean);
  const matches = modernProducts.filter((product) => {
    const candidate = normalizeCatalogName(product.name);
    const matched = aliases.some((alias) => alias === candidate || alias.includes(candidate) || candidate.includes(alias));
    const owner = modernProductOwners?.get(String(product.id));
    return matched && (!modernProductOwners || owner === String(nativeProduct.id) || !owner);
  });
  const matchedIds = new Set(matches.map((product) => String(product.id)));
  const modernRows = modernSkus.filter((sku) => matchedIds.has(String(sku.product_id))).map((sku) => {
    const source = parseJson<Record<string, unknown>>(String(sku.source_ref_json || ''), {});
    const packCount = finiteNumber(sku.inner_pack_count);
    const casePrice = finiteNumber(sku.price);
    const unitPrice = casePrice !== null && packCount && packCount > 1 ? roundPH(casePrice / packCount) : casePrice;
    const payload = {
      sku: sku.sku || '',
      specification: sku.specification || '',
      unit: sku.unit || '',
      inner_pack_count: sku.inner_pack_count ?? null,
      price: casePrice,
      unit_price: unitPrice,
      case_price: casePrice,
      price_tier: sku.price_tier || '标准价',
      product_type: sku.product_type || '',
      source_ref: source,
      source_model: 'product_skus',
      modern_product_id: sku.product_id,
      modern_sku_id: sku.id,
    };
    const specificationText = String(sku.specification || '');
    const capacityMatch = specificationText.match(/^(.+?)[*xX×](\d+)$/);
    const capacity = capacityMatch ? capacityMatch[1].trim() : specificationText;
    return {
      id: String(sku.id),
      product_id: nativeProduct.id,
      name: specificationText,
      capacity,
      form: sku.product_type || '',
      payload,
      package: {
        unit_name: sku.unit || '',
        inner_pack_count: packCount,
        inner_pack_unit: sku.unit || '',
        unit_price: unitPrice,
        case_price: casePrice,
        price: casePrice,
        price_tier: sku.price_tier || '标准价',
        sku: sku.sku || '',
        source_ref: source,
      },
      source: 'product_skus',
      editable: false,
      native: false,
    };
  });
  const legacyRows = legacySpecifications.map((specification) => ({ ...specification, source: 'legacy_product_specs', editable: true, native: true }));
  return [...legacyRows, ...modernRows];
}

function pesticideFlags(payload: NativePayload): NativePayload {
  const name = String(payload.component || '');
  const flags: NativePayload = { ...(payload.flags || {}) };
  const has = (pattern: RegExp) => pattern.test(name) || Boolean(payload.related?.some((item: unknown) => pattern.test(String(item))));
  flags.is_copper ||= has(/铜|波尔多/);
  flags.is_inorganic_copper ||= has(/波尔多|硫酸铜|氢氧化铜|氧化亚铜|王铜|氧氯化铜|碱式硫酸铜/) && !has(/有机铜|松脂酸铜|琥胶肥酸铜|喹菌铜|噻菌铜|腐植酸铜/);
  flags.is_organic_copper ||= has(/松脂酸铜|琥胶肥酸铜|喹菌铜|噻菌铜|腐植酸铜/);
  flags.is_dithiocarbamate ||= has(/代森/);
  flags.is_sulfur ||= has(/石硫|硫磺|硫悬|胶体硫|可湿性硫/);
  flags.is_thiram ||= has(/福美双|福美锌|福美砷/);
  flags.is_benzimidazole ||= has(/多菌灵|甲基硫菌灵|甲基托布津|甲托/);
  flags.is_chloroisobromine ||= has(/氯溴异氰尿酸/);
  flags.has_calcium ||= has(/钙/);
  flags.has_phosphorus ||= has(/磷酸|磷酸盐|磷酸二氢|磷酸氢二/);
  flags.has_humic_acid ||= has(/腐殖酸|黄腐酸|腐植酸/);
  flags.is_fungicide ||= /杀菌剂/.test(String(payload.category || ''));
  flags.is_insecticide ||= /杀虫剂/.test(String(payload.category || ''));
  flags.is_acaricide ||= /杀螨剂/.test(String(payload.category || ''));
  flags.is_herbicide ||= /除草剂/.test(String(payload.category || ''));
  flags.has_calcium ||= Boolean(flags.is_calcium);
  flags.has_phosphorus ||= Boolean(flags.is_phosphorus);
  flags.has_humic_acid ||= Boolean(flags.is_humic_acid);
  flags.has_heavy_metal ||= Boolean(flags.is_heavy_metal);
  flags.is_strong_base ||= Boolean(flags.is_strong_base);
  flags.is_strong_acid ||= Boolean(flags.is_strong_acid);
  return flags;
}

function classifyPH(value: number | null): string {
  if (value === null) return 'unknown';
  if (value < 4) return 'strong_acid';
  if (value < 6.5) return 'acidic';
  if (value <= 7.5) return 'neutral';
  if (value <= 10) return 'basic';
  return 'strong_base';
}

function nativeMixingRule(pesticide: NativePayload, product: NativePayload, extra: NativePayload | null): { status: string; interval: string; reason: string; level: number } {
  const pf = pesticideFlags(pesticide);
  const pp = (product.mix_profile || {}) as NativePayload;
  const productPH = parsePH(pp.ph);
  const pesticidePH = parsePH(extra?.ph);
  const productPHClass = classifyPH(productPH);
  const pesticidePHClass = classifyPH(pesticidePH);
  const forbidden = (reason: string, interval = '7天') => ({ status: '禁混', interval, reason, level: 3 });
  const caution = (reason: string) => ({ status: '需谨慎', interval: '', reason, level: 2 });
  const separate = (reason: string, interval = '2-3天') => ({ status: '需间隔', interval, reason, level: 2 });
  const alone = (reason: string) => ({ status: '建议单用', interval: '3-5天', reason, level: 2 });

  if (pf.is_herbicide) return forbidden('除草剂不建议与肥料混配，易产生药害', '');
  if (pf.has_heavy_metal) return forbidden('含重金属农药，不建议与肥料混用', '');
  if (pp.has_microbe && (pf.is_fungicide || pf.is_copper)) return forbidden('杀菌剂或铜制剂会影响有益微生物活性，建议先用农药，间隔 3-5 天再用菌剂', '3-5天');
  if (pp.has_amino_acid && pf.is_copper) return forbidden('氨基酸与铜离子可能发生络合，降低双方效果');
  if (pp.has_humic_acid && pf.is_copper) return forbidden('腐殖酸或黄腐酸与铜离子可能络合并产生沉淀');
  if (pp.has_copper && pp.copper_level !== 'trace' && pf.is_copper) return forbidden('产品含铜，与铜制剂叠加可能导致铜离子过量并产生药害');
  if (pf.is_chloroisobromine && (pp.has_amino_acid || pp.has_humic_acid || pf.has_phosphorus)) return forbidden('氯溴异氰尿酸与氨基酸、腐殖酸或磷酸盐可能产生沉淀并失效');
  if (pf.suggest_alone) return alone('该农药性质特殊，与肥料混配可能降低效果，建议单独使用');
  if (pf.is_strong_base && pp.has_amino_acid) return forbidden('强碱性农药会使氨基酸分解失效');
  if (pf.is_strong_base && pp.has_humic_acid) return forbidden('强碱性条件下腐殖酸结构可能被破坏');
  if (pp.has_copper && pf.is_dithiocarbamate) return caution('产品含铜，与代森类农药混配可能降低药效，建议先小试');
  if (pp.has_copper && pf.is_sulfur) return caution('产品含铜，与硫制剂混配可能产生反应，建议先小试');
  if (pp.has_copper && pf.is_thiram) return caution('产品含铜，与福美双系列混配可能降低药效，建议先试验');
  if (pp.has_copper && pp.copper_level === 'trace' && pf.is_copper) return caution('产品含微量铜，与铜制剂叠加可能增加铜离子浓度');
  if (pp.has_copper && pf.is_benzimidazole) return caution('铜与多菌灵或甲基硫菌灵混配可能产生沉淀');
  if (!pp.has_copper && pf.is_inorganic_copper) return caution('无机铜制剂杀菌性强，一般不建议与肥料混配');
  if (!pp.has_copper && pf.is_organic_copper) return caution('有机铜制剂混配性较好，但仍建议先小试');
  if (pp.has_calcium && pf.has_phosphorus) return separate('磷酸根与钙离子反应可能生成磷酸钙沉淀');
  if (pp.has_phosphorus && pf.has_calcium) return separate('磷酸根与钙离子反应可能生成磷酸钙沉淀');
  if (pp.has_humic_acid && pf.has_calcium) return separate('腐殖酸与钙离子反应可能产生絮凝沉淀');
  if (pp.has_calcium && pf.has_humic_acid) return separate('钙离子与腐殖酸反应可能产生絮凝沉淀');
  if (pf.is_strong_base) return separate('强碱性农药性质活泼，建议与肥料间隔使用', '7天');
  if (pf.is_strong_acid) return separate('强酸性农药性质活泼，建议与肥料间隔使用', '7天');
  if (productPHClass === 'strong_acid' && ['basic', 'strong_base'].includes(pesticidePHClass)) return separate('产品为强酸性，与碱性农药可能发生酸碱中和', '3-7天');
  if (productPHClass === 'strong_base' && ['acidic', 'strong_acid'].includes(pesticidePHClass)) return separate('产品为强碱性，与酸性农药可能发生酸碱中和', '3-7天');
  if (pf.no_alkali_mix && productPH !== null && productPH > 7.5) return separate('该农药标注不能与碱性物质混用，当前产品偏碱性', '3-7天');
  return { status: '可混', interval: '', reason: '成分间未发现原站规则中的明确拮抗反应，建议先小范围试用并以产品标签为准。', level: 0 };
}

async function getNativeProducts(url: URL, env: Env, request?: Request): Promise<Response> {
  const query = url.searchParams.get('query')?.trim() || '';
  const productId = url.searchParams.get('id')?.trim() || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '100'), 1), 200);
  const pattern = '%' + query + '%';
  const statement = productId
    ? env.DB.prepare('SELECT * FROM legacy_products WHERE id = ?').bind(productId)
    : query
      ? env.DB.prepare('SELECT * FROM legacy_products WHERE name LIKE ? OR category LIKE ? OR payload_json LIKE ? ORDER BY name LIMIT ?').bind(pattern, pattern, pattern, limit)
      : env.DB.prepare('SELECT * FROM legacy_products ORDER BY name LIMIT ?').bind(limit);
  const { results } = await statement.all<Record<string, string>>();
  const modernProducts = await env.DB.prepare('SELECT * FROM products').all<Record<string, unknown>>();
  const modernSkus = await env.DB.prepare('SELECT * FROM product_skus ORDER BY product_id, specification').all<Record<string, unknown>>();
  const viewerRole = await getViewerRole(request || new Request(url.toString()), env);
  const ids = results.map((item) => item.id);
  const modernProductOwners = new Map<string, string>();
  for (const row of results) {
    for (const modernProduct of modernProducts.results) {
      if (modernProductMatchesNative(row, modernProduct) && !modernProductOwners.has(String(modernProduct.id))) {
        modernProductOwners.set(String(modernProduct.id), String(row.id));
      }
    }
  }
  const specsByProduct = new Map<string, Record<string, unknown>[]>();
  const compatibilityByProduct = new Map<string, Record<string, unknown>[]>();
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const [specs, compatibility] = await Promise.all([
      env.DB.prepare('SELECT * FROM legacy_product_specs WHERE product_id IN (' + placeholders + ') ORDER BY product_id, sort_order').bind(...ids).all<Record<string, unknown>>(),
      env.DB.prepare('SELECT * FROM legacy_product_compatibility WHERE product_id IN (' + placeholders + ') ORDER BY product_id').bind(...ids).all<Record<string, unknown>>(),
    ]);
    for (const item of specs.results) {
      const productKey = String(item.product_id);
      specsByProduct.set(productKey, [...(specsByProduct.get(productKey) || []), augmentNativeSpecification(item)]);
    }
    for (const item of compatibility.results) {
      const productKey = String(item.product_id);
      compatibilityByProduct.set(productKey, [...(compatibilityByProduct.get(productKey) || []), item]);
    }
  }
  const assignedModernSkuIds = new Set<string>();
  const products = results.map((row) => {
    const specifications = mergeUnifiedSpecifications(row, specsByProduct.get(row.id) || [], modernProducts.results, modernSkus.results, modernProductOwners)
      .filter((specification) => {
        if (specification.source !== 'product_skus') return true;
        const skuId = String(specification.id || '');
        if (assignedModernSkuIds.has(skuId)) return false;
        assignedModernSkuIds.add(skuId);
        return true;
      });
    return {
      ...sanitizeProductPayload(parseNativePayload<Record<string, unknown>>(row.payload_json, {}), viewerRole),
      id: row.id,
      name: row.name,
      category: row.category,
      specifications,
      sku_count: specifications.length,
      pesticide_compat: compatibilityByProduct.get(row.id) || [],
    };
  });
  const visibleModernProducts = modernProducts.results.filter((product) => {
    if (productId) return false;
    if (!query) return true;
    const text = [product.name, product.brand, product.ingredients_json, product.legacy_details_json].map((value) => String(value || '')).join(' ');
    return text.toLowerCase().includes(query.toLowerCase());
  });
  const matchedModernIds = new Set(results.flatMap((row) => modernProducts.results.filter((product) => modernProductMatchesNative(row, product)).map((product) => String(product.id))));
  const syntheticProducts = visibleModernProducts.filter((product) => !matchedModernIds.has(String(product.id))).map((product) => {
    const payload = {
      id: product.id,
      name: product.name,
      brand: product.brand,
      source_type: product.source_type,
      form: product.form,
      usage: product.usage,
      plain_usage: product.plain_usage,
      ingredients: parseJson(product.ingredients_json as string, {}),
      legacy_details: parseJson(product.legacy_details_json as string, {}),
      images: parseJson(product.images_json as string, []),
      mix_flags: parseJson(product.mix_flags_json as string, {}),
      needs_verification: Boolean(product.needs_verification),
    };
    const syntheticRow = { id: String(product.id), name: String(product.name || ''), category: String(product.form || product.brand || ''), payload_json: JSON.stringify(payload) };
    const specifications = mergeUnifiedSpecifications(syntheticRow, [], modernProducts.results, modernSkus.results, modernProductOwners)
      .filter((specification) => {
        if (specification.source !== 'product_skus') return true;
        const skuId = String(specification.id || '');
        if (assignedModernSkuIds.has(skuId)) return false;
        assignedModernSkuIds.add(skuId);
        return true;
      });
    return { ...sanitizeProductPayload(payload, viewerRole), id: syntheticRow.id, name: syntheticRow.name, category: syntheticRow.category, brand: product.brand, source_type: product.source_type, specifications, sku_count: specifications.length, pesticide_compat: [] };
  });
  return json({ products: [...products, ...syntheticProducts].slice(0, limit) }, {}, publicApiHeaders);
}

async function getNativePesticides(url: URL, env: Env, request?: Request): Promise<Response> {
  const query = url.searchParams.get('query')?.trim() || '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '100'), 1), 10000);
  const pattern = '%' + query + '%';
  const statement = query
    ? env.DB.prepare('SELECT p.component, p.payload_json FROM legacy_pesticides p LEFT JOIN pesticide_search_stats s ON s.component = p.component WHERE p.component LIKE ? OR p.payload_json LIKE ? ORDER BY COALESCE(s.search_count, 0) DESC, COALESCE(s.select_count, 0) DESC, p.component LIMIT ?').bind(pattern, pattern, limit)
    : env.DB.prepare('SELECT p.component, p.payload_json FROM legacy_pesticides p LEFT JOIN pesticide_search_stats s ON s.component = p.component ORDER BY COALESCE(s.search_count, 0) DESC, COALESCE(s.select_count, 0) DESC, COALESCE(s.last_selected_at, "") DESC, p.component LIMIT ?').bind(limit);
  const { results } = await statement.all<{ component: string; payload_json: string }>();
  if (query && results.length) {
    const timestamp = now();
    await Promise.all(results.slice(0, 100).map((item) => env.DB.prepare('INSERT INTO pesticide_search_stats (component, search_count, last_searched_at) VALUES (?, 1, ?) ON CONFLICT(component) DO UPDATE SET search_count = search_count + 1, last_searched_at = excluded.last_searched_at').bind(item.component, timestamp).run()));
  }
  const extras = await env.DB.prepare('SELECT component, payload_json FROM legacy_pesticide_extras').all<{ component: string; payload_json: string }>();
  const extraMap = new Map<string, NativePayload>(extras.results.map((item) => [item.component, parseNativePayload<NativePayload>(item.payload_json, {})]));
  const viewerRole = await getViewerRole(request || new Request(url.toString()), env);
  return json({ pesticides: results.map((item) => {
    const payload = parseNativePayload<Record<string, unknown>>(item.payload_json, {});
    const extra = mergePesticideExtras(item.component, payload.related, extraMap);
    return { ...payload, component: item.component, extra: pesticidePHView(extra) };
  }) }, {}, publicApiHeaders);
}

async function getNativeMixing(url: URL, env: Env, request?: Request): Promise<Response> {
  const component = url.searchParams.get('component')?.trim() || '';
  if (!component) return json({ error: '请选择农药有效成分' }, { status: 400 });
  await env.DB.prepare('INSERT INTO pesticide_search_stats (component, select_count, last_selected_at) VALUES (?, 1, ?) ON CONFLICT(component) DO UPDATE SET select_count = select_count + 1, last_selected_at = excluded.last_selected_at').bind(component, now()).run();
  const pesticide = await env.DB.prepare('SELECT component, payload_json FROM legacy_pesticides WHERE component = ?').bind(component).first<{ component: string; payload_json: string }>();
  if (!pesticide) return json({ error: '未找到该农药成分' }, { status: 404 });
  const [products, compatibility, extras] = await Promise.all([
    env.DB.prepare('SELECT id, name, category, payload_json FROM legacy_products ORDER BY name').all<Record<string, string>>(),
    env.DB.prepare('SELECT product_id, pesticide_name, status, reason FROM legacy_product_compatibility').all<Record<string, string>>(),
    env.DB.prepare('SELECT component, payload_json FROM legacy_pesticide_extras').all<{ component: string; payload_json: string }>(),
  ]);
  const pesticideComponents = [component, ...((payloadFromRow(pesticide.payload_json).related || []) as unknown[]).map(String)];
  const rules = new Map(compatibility.results.filter((item) => pesticideComponents.some((name) => item.pesticide_name === name || item.pesticide_name.includes(name))).map((item) => [item.product_id, item]));
  const payload = parseNativePayload<Record<string, unknown>>(pesticide.payload_json, {});
  const extraMap = new Map<string, NativePayload>(extras.results.map((item) => [item.component, parseNativePayload<NativePayload>(item.payload_json, {})]));
  const extra = mergePesticideExtras(component, payload.related, extraMap);
  const viewerRole = await getViewerRole(request || new Request(url.toString()), env);
  const results = products.results.map((product) => {
    const productPayload = parseNativePayload<Record<string, unknown>>(product.payload_json, {});
    const productInfo = { ...sanitizeProductPayload(productPayload, viewerRole), id: product.id, name: product.name, category: product.category };
    const explicit = rules.get(product.id);
    if (explicit) {
      const explicitStatus = explicit.status === 'forbidden' ? '禁混' : explicit.status === 'caution' ? '需谨慎' : explicit.status === 'separate' ? '需间隔' : explicit.status === 'alone' ? '建议单用' : explicit.status === 'unnecessary' ? '可混但无必要' : '可混';
      return { product: productInfo, status: explicitStatus, interval: explicit.status === 'caution' ? '至少3天' : '', reason: explicit.reason || '后台手动维护的混配规则' };
    }
    const rule = nativeMixingRule({ ...payload, component }, productPayload, extra);
    return { product: productInfo, ...rule };
  });
  return json({ component, pesticide: { ...payload, component, extra: pesticidePHView(extra) }, results }, {}, publicApiHeaders);
}

function payloadFromRow(value: string): NativePayload {
  return parseNativePayload<Record<string, unknown>>(value, {});
}

async function updateNativePesticide(request: Request, env: Env, component: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const existing = await env.DB.prepare('SELECT payload_json FROM legacy_pesticides WHERE component = ?').bind(component).first<{ payload_json: string }>();
  if (!existing) return json({ error: '农药成分不存在' }, { status: 404 });
  const body = await readBody(request);
  const patch = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : body;
  const current = parseNativePayload<Record<string, unknown>>(existing.payload_json, {});
  const next = { ...current, ...patch, component };
  await env.DB.prepare('UPDATE legacy_pesticides SET payload_json = ?, updated_at = ? WHERE component = ?').bind(JSON.stringify(next), now(), component).run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, 'update', 'legacy_pesticide', component, JSON.stringify({ fields: Object.keys(patch) }), now()).run();
  return json({ pesticide: next });
}

async function createNativePesticide(request: Request, env: Env): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const body = await readBody(request);
  const component = typeof body.component === 'string' ? body.component.trim().slice(0, 200) : '';
  if (!component) return json({ error: '农药名称不能为空' }, { status: 400 });
  const exists = await env.DB.prepare('SELECT component FROM legacy_pesticides WHERE component = ?').bind(component).first();
  if (exists) return json({ error: '该农药已存在' }, { status: 409 });
  const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : body;
  const next = { ...payload, component };
  await env.DB.prepare('INSERT INTO legacy_pesticides (component, payload_json, updated_at) VALUES (?, ?, ?)').bind(component, JSON.stringify(next), now()).run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId(), actor.id, 'create', 'legacy_pesticide', component, JSON.stringify({ fields: Object.keys(next) }), now()).run();
  return json({ pesticide: next }, { status: 201 });
}

async function updateNativeCompatibility(request: Request, env: Env, productId: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const product = await env.DB.prepare('SELECT id FROM legacy_products WHERE id = ?').bind(productId).first<{ id: string }>();
  if (!product) return json({ error: '产品不存在' }, { status: 404 });
  const body = await readBody(request);
  const pesticideName = typeof body.pesticide_name === 'string' ? body.pesticide_name.trim().slice(0, 200) : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : '';
  const allowedStatuses = ['forbidden', 'caution', 'separate', 'alone', 'unnecessary', 'mixable', 'default'];
  if (!pesticideName || !allowedStatuses.includes(status)) return json({ error: '请填写有效的农药名称和混配状态' }, { status: 400 });
  if (status === 'default') {
    await env.DB.prepare('DELETE FROM legacy_product_compatibility WHERE product_id = ? AND pesticide_name = ?').bind(productId, pesticideName).run();
  } else {
    const existing = await env.DB.prepare('SELECT id FROM legacy_product_compatibility WHERE product_id = ? AND pesticide_name = ?').bind(productId, pesticideName).first<{ id: string }>();
    if (existing) {
      await env.DB.prepare('UPDATE legacy_product_compatibility SET status = ?, reason = ? WHERE id = ?').bind(status, reason, existing.id).run();
    } else {
      await env.DB.prepare('INSERT INTO legacy_product_compatibility (id, product_id, pesticide_name, status, reason) VALUES (?, ?, ?, ?, ?)').bind(newId(), productId, pesticideName, status, reason).run();
    }
  }
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, status === 'default' ? 'delete' : 'update', 'legacy_product_compatibility', productId, JSON.stringify({ pesticide_name: pesticideName, status }), now()).run();
  return json({ status: 'updated', product_id: productId, pesticide_name: pesticideName, rule_status: status });
}

async function updateNativeProduct(request: Request, env: Env, productId: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const existing = await env.DB.prepare('SELECT payload_json FROM legacy_products WHERE id = ?').bind(productId).first<{ payload_json: string }>();
  const body = await readBody(request);
  const patch = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : body;
  if (!existing) {
    const modern = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first<Record<string, unknown>>();
    if (!modern) return json({ error: '产品不存在' }, { status: 404 });
    const current = {
      id: modern.id,
      name: modern.name,
      brand: modern.brand,
      source_type: modern.source_type,
      form: modern.form,
      usage: modern.usage,
      plain_usage: modern.plain_usage,
      ingredients: parseJson(modern.ingredients_json as string, {}),
      legacy_details: parseJson(modern.legacy_details_json as string, {}),
      images: parseJson(modern.images_json as string, []),
      mix_flags: parseJson(modern.mix_flags_json as string, {}),
    } as Record<string, unknown>;
    const next = { ...current, ...patch };
    const name = typeof next.name === 'string' ? next.name.trim().slice(0, 200) : String(modern.name || '');
    const ingredients = next.ingredients && typeof next.ingredients === 'object' ? next.ingredients : {};
    const images = Array.isArray(next.images) ? next.images : [];
    const mixFlags = next.mix_flags && typeof next.mix_flags === 'object' ? next.mix_flags : {};
    await env.DB.prepare('UPDATE products SET name = ?, form = ?, usage = ?, plain_usage = ?, ingredients_json = ?, images_json = ?, mix_flags_json = ?, legacy_details_json = ?, updated_at = ? WHERE id = ?')
      .bind(name, String(next.form || modern.form || ''), String(next.usage || modern.usage || ''), String(next.plain_usage || modern.plain_usage || ''), JSON.stringify(ingredients), JSON.stringify(images), JSON.stringify(mixFlags), JSON.stringify(next.legacy_details || {}), now(), productId).run();
    await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(newId(), actor.id, 'update', 'product', productId, JSON.stringify({ fields: Object.keys(patch) }), now()).run();
    return json({ product: { ...next, name, images } });
  }
  const current = parseNativePayload<Record<string, unknown>>(existing.payload_json, {});
  const next: Record<string, unknown> = { ...current, ...patch, id: productId };
  const name = typeof next.name === 'string' ? next.name.trim().slice(0, 200) : '';
  const category = typeof next.category === 'string' ? next.category.trim().slice(0, 200) : '';
  if (!name) return json({ error: '产品名称不能为空' }, { status: 400 });
  await env.DB.prepare('UPDATE legacy_products SET name = ?, category = ?, payload_json = ?, updated_at = ? WHERE id = ?')
    .bind(name, category, JSON.stringify(next), now(), productId).run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, 'update', 'legacy_product', productId, JSON.stringify({ fields: Object.keys(patch) }), now()).run();
  return getNativeProducts(new URL(request.url + '?id=' + encodeURIComponent(productId)), env, request);
}

async function createNativeSpecification(request: Request, env: Env, productId: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const product = await env.DB.prepare('SELECT id, name, category FROM legacy_products WHERE id = ?').bind(productId).first<{ id: string; name: string; category: string }>();
  if (!product) return json({ error: '产品不存在' }, { status: 404 });
  const body = await readBody(request);
  const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : body;
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : typeof payload.name === 'string' ? String(payload.name).trim().slice(0, 100) : '';
  const capacity = typeof body.capacity === 'string' ? body.capacity.trim().slice(0, 100) : typeof payload.capacity === 'string' ? String(payload.capacity).trim().slice(0, 100) : '';
  const form = typeof body.form === 'string' ? body.form.trim().slice(0, 100) : typeof payload.form === 'string' ? String(payload.form).trim().slice(0, 100) : '';
  if (!name && !capacity) return json({ error: '规格名称或容量至少填写一项' }, { status: 400 });
  const specificationId = newId();
  const sort = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS sort_order FROM legacy_product_specs WHERE product_id = ?').bind(productId).first<{ sort_order: number }>();
  await env.DB.prepare('INSERT INTO legacy_product_specs (id, product_id, name, capacity, form, payload_json, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(specificationId, productId, name || capacity, capacity, form, JSON.stringify({ ...payload, name: name || capacity, capacity, form }), sort?.sort_order || 0).run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, 'create', 'legacy_product_spec', specificationId, JSON.stringify({ product_id: productId }), now()).run();
  return json({ id: specificationId, product_id: productId, name: name || capacity, capacity, form }, { status: 201 });
}

async function updateNativeSpecification(request: Request, env: Env, specificationId: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const existing = await env.DB.prepare('SELECT * FROM legacy_product_specs WHERE id = ?').bind(specificationId).first<Record<string, unknown>>();
  if (!existing) return json({ error: '规格不存在' }, { status: 404 });
  const body = await readBody(request);
  const current = parseNativePayload<Record<string, unknown>>(String(existing.payload_json || ''), {});
  const payload = body.payload && typeof body.payload === 'object' ? body.payload as Record<string, unknown> : body;
  const next = { ...current, ...payload };
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : String(existing.name || '');
  const capacity = typeof body.capacity === 'string' ? body.capacity.trim().slice(0, 100) : String(existing.capacity || '');
  const form = typeof body.form === 'string' ? body.form.trim().slice(0, 100) : String(existing.form || '');
  await env.DB.prepare('UPDATE legacy_product_specs SET name = ?, capacity = ?, form = ?, payload_json = ? WHERE id = ?')
    .bind(name || capacity, capacity, form, JSON.stringify({ ...next, name: name || capacity, capacity, form }), specificationId).run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, 'update', 'legacy_product_spec', specificationId, JSON.stringify({ product_id: existing.product_id }), now()).run();
  return json({ id: specificationId, product_id: existing.product_id, name: name || capacity, capacity, form });
}

async function deleteNativeSpecification(request: Request, env: Env, specificationId: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const existing = await env.DB.prepare('SELECT product_id FROM legacy_product_specs WHERE id = ?').bind(specificationId).first<{ product_id: string }>();
  if (!existing) return json({ error: '规格不存在' }, { status: 404 });
  await env.DB.prepare('DELETE FROM legacy_product_specs WHERE id = ?').bind(specificationId).run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, 'delete', 'legacy_product_spec', specificationId, JSON.stringify({ product_id: existing.product_id }), now()).run();
  return json({ deleted: true, id: specificationId });
}

async function listNativePriceProfiles(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env);
  if (isResponse(user)) return user;
  const { results: profiles } = await env.DB.prepare('SELECT id, name, created_at, updated_at FROM native_price_profiles WHERE user_id = ? ORDER BY updated_at DESC').bind(user.id).all<Record<string, unknown>>();
  const ids = profiles.map((profile) => String(profile.id));
  const entriesByProfile = new Map<string, Record<string, unknown>[]>();
  if (ids.length) {
    const placeholders = ids.map(() => '?').join(',');
    const { results: entries } = await env.DB.prepare('SELECT native_price_entries.id, native_price_entries.profile_id, native_price_entries.specification_id, native_price_entries.price, legacy_product_specs.product_id, legacy_product_specs.name AS specification, legacy_products.name AS product_name FROM native_price_entries JOIN legacy_product_specs ON legacy_product_specs.id = native_price_entries.specification_id JOIN legacy_products ON legacy_products.id = legacy_product_specs.product_id WHERE native_price_entries.profile_id IN (' + placeholders + ')').bind(...ids).all<Record<string, unknown>>();
    entries.forEach((entry) => {
      const profileId = String(entry.profile_id);
      entriesByProfile.set(profileId, [...(entriesByProfile.get(profileId) || []), entry]);
    });
  }
  return json({ profiles: profiles.map((profile) => ({ ...profile, entries: entriesByProfile.get(String(profile.id)) || [] })) });
}

async function createNativePriceProfile(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env, ['super_admin', 'admin', 'staff', 'expert', 'dealer']);
  if (isResponse(user)) return user;
  const body = await readBody(request);
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  if (!name) return json({ error: '报价档案名称不能为空' }, { status: 400 });
  const profileId = newId();
  const timestamp = now();
  await env.DB.prepare('INSERT INTO native_price_profiles (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(profileId, user.id, name, timestamp, timestamp).run();
  const entries = Array.isArray(body.entries) ? body.entries : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const specificationId = typeof row.specification_id === 'string' ? row.specification_id : '';
    const price = finiteNumber(row.price);
    if (!specificationId || price === null || price < 0) continue;
    const specification = await env.DB.prepare('SELECT id FROM legacy_product_specs WHERE id = ?').bind(specificationId).first<{ id: string }>();
    if (!specification) continue;
    await env.DB.prepare('INSERT INTO native_price_entries (id, profile_id, specification_id, price, updated_at) VALUES (?, ?, ?, ?, ?)').bind(newId(), profileId, specificationId, price, timestamp).run();
  }
  return listNativePriceProfiles(request, env);
}

async function updateNativePriceProfile(request: Request, env: Env, profileId: string): Promise<Response> {
  const user = await requireUser(request, env, ['super_admin', 'admin', 'staff', 'expert', 'dealer']);
  if (isResponse(user)) return user;
  const profile = await env.DB.prepare('SELECT id FROM native_price_profiles WHERE id = ? AND user_id = ?').bind(profileId, user.id).first<{ id: string }>();
  if (!profile) return json({ error: '报价档案不存在或无权访问' }, { status: 404 });
  const body = await readBody(request);
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
  const timestamp = now();
  if (name) await env.DB.prepare('UPDATE native_price_profiles SET name = ?, updated_at = ? WHERE id = ?').bind(name, timestamp, profileId).run();
  if (Array.isArray(body.entries)) {
    for (const entry of body.entries) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const specificationId = typeof row.specification_id === 'string' ? row.specification_id : '';
      const price = finiteNumber(row.price);
      if (!specificationId || price === null || price < 0) continue;
      const specification = await env.DB.prepare('SELECT id FROM legacy_product_specs WHERE id = ?').bind(specificationId).first<{ id: string }>();
      if (!specification) continue;
      await env.DB.prepare('INSERT INTO native_price_entries (id, profile_id, specification_id, price, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(profile_id, specification_id) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at').bind(newId(), profileId, specificationId, price, timestamp).run();
    }
  }
  return listNativePriceProfiles(request, env);
}

async function deleteNativePriceProfile(request: Request, env: Env, profileId: string): Promise<Response> {
  const user = await requireUser(request, env, ['super_admin', 'admin', 'staff', 'expert', 'dealer']);
  if (isResponse(user)) return user;
  await env.DB.prepare('DELETE FROM native_price_profiles WHERE id = ? AND user_id = ?').bind(profileId, user.id).run();
  return json({ deleted: true, id: profileId });
}

async function analyzeNativeMixing(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  const pesticides = Array.isArray(body.pesticides) ? body.pesticides.map(String).filter(Boolean).slice(0, 10) : [];
  const products = Array.isArray(body.products) ? body.products.map((item) => typeof item === 'object' && item ? item as Record<string, unknown> : { name: String(item) }).slice(0, 10) : [];
  if (!pesticides.length || !products.length) return json({ error: '至少选择一个农药和一个产品' }, { status: 400 });
  const productText = products.map((product) => String(product.name || '产品') + '（' + String(product.ingredients || product.ingredient || '成分资料未录入') + '）').join('、');
  const prompt = '请问' + pesticides.join('、') + '可以和' + productText + '一起混配吗？请简要回复：结论、主要依据、风险、建议的小试与间隔时间。不要替代产品标签和当地农艺师判断。';
  if (!env.AI) return json({ prompt, analysis: '当前未连接外部 AI 模型，已先按登记资料与常见混配规则生成保守建议：请分别核对每个农药和产品标签；先做小桶相容性试验，若出现絮凝、沉淀、分层、发热或明显气味变化，不要使用。杀菌剂、铜制剂、强酸强碱制剂及微生物产品尤其不建议未经小试直接混配。', source: 'rule_fallback', message: '这是规则化辅助建议，不替代产品标签、登记要求和农艺师判断。' });
  try {
    const model = env.AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';
    const response = await env.AI.run(model, { messages: [{ role: 'system', content: '你是农业投入品混配风险辅助分析器。不得臆造登记资料，资料不足时明确说资料不足。' }, { role: 'user', content: prompt }] });
    return json({ prompt, analysis: response, source: 'workers_ai' });
  } catch (error) {
    console.error(error);
    return json({ prompt, analysis: 'AI 服务暂时不可用，已返回保守规则建议：请按产品标签分别使用，先做小范围相容性试验；出现沉淀、分层、絮凝、发热或药害风险时立即停止混配。', source: 'rule_fallback', message: '当前为规则化辅助建议，不替代产品标签、登记要求和农艺师判断。' });
  }
}

async function getSiteSettings(env: Env): Promise<Response> {
  const row = await env.DB.prepare('SELECT payload_json, updated_at FROM site_settings WHERE id = ?').bind('global').first<{ payload_json: string; updated_at: string }>();
  return json({ settings: row ? parseJson(row.payload_json, {} as Record<string, unknown>) : {}, updated_at: row?.updated_at || null }, {}, publicApiHeaders);
}

async function updateSiteSettings(request: Request, env: Env): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const body = await readBody(request);
  const settings = body.settings && typeof body.settings === 'object' ? body.settings as Record<string, unknown> : body;
  const timestamp = now();
  await env.DB.prepare('INSERT INTO site_settings (id, payload_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at').bind('global', JSON.stringify(settings), timestamp).run();
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId(), actor.id, 'update', 'site_settings', 'global', JSON.stringify({ keys: Object.keys(settings) }), timestamp).run();
  return json({ settings, updated_at: timestamp });
}

async function getNavigation(request: Request, env: Env): Promise<Response> {
  let isAdmin = false;
  const authorization = request.headers.get('authorization') || '';
  if (authorization) {
    const session = await requireUser(request, env);
    isAdmin = !isResponse(session) && ['super_admin', 'admin'].includes(session.role);
  }
  const query = isAdmin
    ? 'SELECT * FROM navigation_items ORDER BY sort_order, group_name'
    : 'SELECT * FROM navigation_items WHERE enabled = 1 AND admin_only = 0 ORDER BY sort_order, group_name';
  const { results } = await env.DB.prepare(query).all<Record<string, unknown>>();
  return json({ items: results }, {}, publicApiHeaders);
}

async function updateNavigation(request: Request, env: Env): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const body = await readBody(request);
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 100) return json({ error: '导航项数量过多' }, { status: 400 });
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.tab !== 'string' || typeof row.label !== 'string' || typeof row.group_name !== 'string') continue;
    await env.DB.prepare('UPDATE navigation_items SET label = ?, group_name = ?, sort_order = ?, enabled = ?, updated_at = ? WHERE tab = ?')
      .bind(row.label.slice(0, 100), row.group_name.slice(0, 100), Number(row.sort_order) || 0, row.enabled ? 1 : 0, now(), row.tab)
      .run();
  }
  await env.DB.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), actor.id, 'update', 'navigation', 'global', JSON.stringify({ count: items.length }), now()).run();
  return getNavigation(request, env);
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

async function deleteAsset(request: Request, env: Env, key: string): Promise<Response> {
  const user = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(user)) return user;
  const safeKey = key.replace(/^\/+/, '').replace(/\.\./g, '');
  if (!safeKey.startsWith('products/')) return json({ error: '仅允许删除产品图片' }, { status: 400 });
  await (env.PRODUCT_ASSETS as R2Bucket & { delete(key: string): Promise<void> }).delete(safeKey);
  return json({ deleted: true, key: safeKey });
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
  const url = new URL(request.url);
  const query = url.searchParams.get('query')?.trim() || '';
  const status = url.searchParams.get('status')?.trim() || '';
  const pattern = '%' + query + '%';
  const where = [query ? '(username LIKE ? OR display_name LIKE ? OR role LIKE ?)' : '', status ? 'status = ?' : ''].filter(Boolean).join(' AND ');
  const statement = env.DB.prepare('SELECT id, username, display_name, role, status, created_at, updated_at, migrated_from FROM users ' + (where ? 'WHERE ' + where + ' ' : '') + "ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC LIMIT 500");
  const { results } = query && status
    ? await statement.bind(pattern, pattern, pattern, status).all<Record<string, unknown>>()
    : query
      ? await statement.bind(pattern, pattern, pattern).all<Record<string, unknown>>()
      : status
        ? await statement.bind(status).all<Record<string, unknown>>()
        : await statement.all<Record<string, unknown>>();
  return json({ users: results });
}

async function exportCatalogData(request: Request, env: Env): Promise<Response> {
  const user = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(user)) return user;
  const [products, specs, compatibility, pesticides, extras, users, navigation, settings] = await Promise.all([
    env.DB.prepare('SELECT * FROM legacy_products').all(),
    env.DB.prepare('SELECT * FROM legacy_product_specs').all(),
    env.DB.prepare('SELECT * FROM legacy_product_compatibility').all(),
    env.DB.prepare('SELECT * FROM legacy_pesticides').all(),
    env.DB.prepare('SELECT * FROM legacy_pesticide_extras').all(),
    env.DB.prepare('SELECT id, username, display_name, role, status, created_at, updated_at FROM users').all(),
    env.DB.prepare('SELECT * FROM navigation_items').all(),
    env.DB.prepare('SELECT * FROM site_settings').all(),
  ]);
  return json({ exported_at: now(), version: 'catalog-export-v1', tables: { legacy_products: products.results, legacy_product_specs: specs.results, legacy_product_compatibility: compatibility.results, legacy_pesticides: pesticides.results, legacy_pesticide_extras: extras.results, users: users.results, navigation_items: navigation.results, site_settings: settings.results } });
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

async function updateCatalogSku(request: Request, env: Env, skuId: string): Promise<Response> {
  const actor = await requireUser(request, env, ['super_admin', 'admin']);
  if (isResponse(actor)) return actor;
  const body = await readBody(request);
  const price = finiteNumber(body.price);
  const innerPackCount = body.inner_pack_count === null || body.inner_pack_count === '' ? null : finiteNumber(body.inner_pack_count);
  const unit = typeof body.unit === 'string' ? body.unit.trim().slice(0, 40) : '';
  if (price !== null && (price < 0 || price > 10_000_000)) return json({ error: '请输入有效整件价格' }, { status: 400 });
  if (innerPackCount !== null && (!Number.isInteger(innerPackCount) || innerPackCount < 1 || innerPackCount > 1_000_000)) return json({ error: '件内数量必须是正整数' }, { status: 400 });
  const existing = await env.DB.prepare('SELECT id FROM product_skus WHERE id = ?').bind(skuId).first<{ id: string }>();
  if (!existing) return json({ error: 'SKU 不存在' }, { status: 404 });
  await env.DB.prepare('UPDATE product_skus SET price = COALESCE(?, price), inner_pack_count = ?, unit = COALESCE(NULLIF(?, ""), unit), updated_at = ? WHERE id = ?').bind(price, innerPackCount, unit, now(), skuId).run();
  return json({ status: 'updated', id: skuId });
}

interface PlanRequestItem {
  product_sku_id?: unknown;
  native_product_id?: unknown;
  native_specification_id?: unknown;
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
    skuId: string | null;
    nativeProductId: string | null;
    nativeSpecificationId: string | null;
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
    const nativeProductId = typeof item.native_product_id === 'string' ? item.native_product_id.trim() : '';
    const nativeSpecificationId = typeof item.native_specification_id === 'string' ? item.native_specification_id.trim() : '';
    const doseValue = finiteNumber(item.dose_per_mu);
    const doseUnit = typeof item.dose_unit === 'string' ? item.dose_unit.trim().slice(0, 50) : '';
    const quotedPrice = finiteNumber(item.quoted_price);
    if ((!skuId && (!nativeProductId || !nativeSpecificationId)) || (skuId && (nativeProductId || nativeSpecificationId)) || !doseUnit) return json({ error: '每个产品都必须选择真实产品规格并填写用量单位' }, { status: 400 });
    if (doseValue !== null && doseValue < 0) return json({ error: '产品用量不能为负数' }, { status: 400 });
    if (quotedPrice !== null && quotedPrice < 0) return json({ error: '产品报价不能为负数' }, { status: 400 });

    if (nativeProductId && nativeSpecificationId) {
      const native = await env.DB.prepare('SELECT legacy_products.id AS product_id, legacy_products.name AS product_name, legacy_products.payload_json AS product_payload, legacy_product_specs.id AS specification_id, legacy_product_specs.name AS specification, legacy_product_specs.payload_json AS specification_payload FROM legacy_product_specs JOIN legacy_products ON legacy_products.id = legacy_product_specs.product_id WHERE legacy_products.id = ? AND legacy_product_specs.id = ?')
        .bind(nativeProductId, nativeSpecificationId)
        .first<{ product_id: string; product_name: string; product_payload: string; specification_id: string; specification: string; specification_payload: string }>();
      if (!native) return json({ error: '方案中包含不存在的原生产品规格，请刷新产品库后重新选择' }, { status: 400 });
      const productPayload = parseJson<Record<string, unknown>>(native.product_payload, {});
      const nativeSpecPayload = parseJson<Record<string, unknown>>(native.specification_payload, {});
      validatedItems.push({ skuId: null, nativeProductId: native.product_id, nativeSpecificationId: native.specification_id, productName: native.product_name, sourceType: productPayload.source_type === 'market' ? 'market' : 'own', specification: native.specification || String(nativeSpecPayload.capacity || ''), sourceReference: native.specification_payload, doseValue, doseUnit, quotedPrice });
    } else {
      const sku = await env.DB.prepare(
        'SELECT product_skus.id AS sku_id, product_skus.specification, product_skus.source_ref_json, products.name AS product_name, products.source_type FROM product_skus JOIN products ON products.id = product_skus.product_id WHERE product_skus.id = ?',
      )
        .bind(skuId)
        .first<{ sku_id: string; specification: string; source_ref_json: string; product_name: string; source_type: string }>();
      if (!sku) return json({ error: '方案中包含不存在的产品 SKU，请刷新产品库后重新选择' }, { status: 400 });
      validatedItems.push({ skuId: sku.sku_id, nativeProductId: null, nativeSpecificationId: null, productName: sku.product_name, sourceType: sku.source_type, specification: sku.specification, sourceReference: sku.source_ref_json, doseValue, doseUnit, quotedPrice });
    }
  }

  await env.DB.prepare(
    'INSERT INTO fertilizer_plans (id, crop_id, owner_user_id, source_plan_id, title, target, plan_type, tier, is_official, usage_count, usage_interval, description, function_tags_json, notices, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(planId, crop?.id || null, user.id, planTitle, target, 'target_stage', tier, usageCount, interval, description, JSON.stringify([target]), '使用前请以产品标签、登记信息、混配试验和现场农艺判断为准。', timestamp, timestamp)
    .run();

  for (let index = 0; index < validatedItems.length; index += 1) {
    const item = validatedItems[index];
    await env.DB.prepare(
      'INSERT INTO fertilizer_plan_items (id, plan_id, product_sku_id, product_name_snapshot, source_type, application_method, dose_value, dose_unit, usage_count, usage_interval, sort_order, notes, product_sku_specification, quoted_price, source_ref_json, native_product_id, native_specification_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(newId(), planId, item.skuId, item.productName, item.sourceType, '', item.doseValue, item.doseUnit, interval, index, '', item.specification, item.quotedPrice, item.sourceReference, item.nativeProductId, item.nativeSpecificationId)
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
      if (url.pathname === '/api/site-settings' && request.method === 'GET') return getSiteSettings(env);
      if (url.pathname === '/api/admin/site-settings' && request.method === 'PATCH') return updateSiteSettings(request, env);
      if (url.pathname === '/api/native/products' && request.method === 'GET') return getNativeProducts(url, env, request);
      if (url.pathname === '/api/native/pesticides' && request.method === 'GET') return getNativePesticides(url, env, request);
      if (url.pathname === '/api/native/mixing' && request.method === 'GET') return getNativeMixing(url, env, request);
      if (url.pathname === '/api/native/mixing/analyze' && request.method === 'POST') return analyzeNativeMixing(request, env);
      if (url.pathname === '/api/me/native-price-profiles' && request.method === 'GET') return listNativePriceProfiles(request, env);
      if (url.pathname === '/api/me/native-price-profiles' && request.method === 'POST') return createNativePriceProfile(request, env);
      if (url.pathname.startsWith('/api/me/native-price-profiles/') && request.method === 'PATCH') return updateNativePriceProfile(request, env, decodeURIComponent(url.pathname.slice('/api/me/native-price-profiles/'.length)));
      if (url.pathname.startsWith('/api/me/native-price-profiles/') && request.method === 'DELETE') return deleteNativePriceProfile(request, env, decodeURIComponent(url.pathname.slice('/api/me/native-price-profiles/'.length)));
      if (url.pathname === '/api/navigation' && request.method === 'GET') return getNavigation(request, env);
      if (url.pathname === '/api/admin/navigation' && request.method === 'PATCH') return updateNavigation(request, env);
      if (url.pathname.startsWith('/api/admin/native/pesticides/') && request.method === 'PATCH') return updateNativePesticide(request, env, decodeURIComponent(url.pathname.slice('/api/admin/native/pesticides/'.length)));
      if (url.pathname === '/api/admin/native/pesticides' && request.method === 'POST') return createNativePesticide(request, env);
      if (url.pathname.startsWith('/api/admin/native/products/') && url.pathname.endsWith('/compatibility') && request.method === 'PATCH') return updateNativeCompatibility(request, env, decodeURIComponent(url.pathname.slice('/api/admin/native/products/'.length, -'/compatibility'.length)));
      if (url.pathname.startsWith('/api/admin/native/products/') && request.method === 'PATCH') return updateNativeProduct(request, env, decodeURIComponent(url.pathname.slice('/api/admin/native/products/'.length)));
      if (url.pathname.startsWith('/api/admin/native/products/') && url.pathname.endsWith('/specs') && request.method === 'POST') return createNativeSpecification(request, env, decodeURIComponent(url.pathname.slice('/api/admin/native/products/'.length, -'/specs'.length)));
      if (url.pathname.startsWith('/api/admin/native/specs/') && request.method === 'PATCH') return updateNativeSpecification(request, env, decodeURIComponent(url.pathname.slice('/api/admin/native/specs/'.length)));
      if (url.pathname.startsWith('/api/admin/native/specs/') && request.method === 'DELETE') return deleteNativeSpecification(request, env, decodeURIComponent(url.pathname.slice('/api/admin/native/specs/'.length)));
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
      if (url.pathname.startsWith('/api/admin/catalog/skus/') && request.method === 'PATCH') return updateCatalogSku(request, env, decodeURIComponent(url.pathname.slice('/api/admin/catalog/skus/'.length)));
      if (url.pathname.startsWith('/api/assets/') && request.method === 'GET') return getAsset(env, decodeURIComponent(url.pathname.slice('/api/assets/'.length)));
      if (url.pathname.startsWith('/api/admin/assets/') && request.method === 'PUT') return uploadAsset(request, env, decodeURIComponent(url.pathname.slice('/api/admin/assets/'.length)));
      if (url.pathname.startsWith('/api/admin/assets/') && request.method === 'DELETE') return deleteAsset(request, env, decodeURIComponent(url.pathname.slice('/api/admin/assets/'.length)));
      if (url.pathname === '/api/admin/export' && request.method === 'GET') return exportCatalogData(request, env);
      if (url.pathname.startsWith('/api/')) return json({ error: '未找到接口' }, { status: 404 });
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: '服务处理失败，请稍后重试' }, { status: 500 });
    }
  },
};
