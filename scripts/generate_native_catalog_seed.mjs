import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function json(value) {
  return JSON.stringify(value ?? {});
}

function stableId(prefix, value) {
  return prefix + createHash('sha256').update(String(value)).digest('hex').slice(0, 28);
}

const outputPath = process.argv[2] || 'data/generated/0004-native-catalog-seed.sql';
const context = {};
vm.createContext(context);
for (const file of ['pesticides.js', 'pesticide_extras.js', 'products.js']) {
  vm.runInContext(await readFile(path.join('public/legacy-pesticide/data', file), 'utf8'), context, { filename: file });
}

const cloudProductsSource = JSON.parse(await readFile('data/generated/legacy-cloud-products.json', 'utf8'));
const cloudProducts = new Map((cloudProductsSource.products || []).map((entry) => [String(entry.data?.id || entry.legacy_id), entry.data || {}]));

function mergePayload(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override === undefined || override === null ? base : override;
  if (base && typeof base === 'object' && override && typeof override === 'object') {
    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (value === undefined || value === null || value === '') continue;
      merged[key] = mergePayload(merged[key], value);
    }
    return merged;
  }
  return override === undefined || override === null || override === '' ? base : override;
}

const products = (context.COMPANY_PRODUCTS || []).map((product) => mergePayload(product, cloudProducts.get(String(product.id)) || {}));
const pesticides = context.PESTICIDES || [];
const extras = context.PESTICIDE_EXTRAS || {};
const now = new Date().toISOString();
const statements = [];

for (const product of products) {
  const productId = String(product.id || stableId('legacy-product-', product.name));
  const payload = { ...product, id: productId };
  statements.push('DELETE FROM legacy_product_specs WHERE product_id = ' + sqlString(productId) + ';');
  statements.push('DELETE FROM legacy_product_compatibility WHERE product_id = ' + sqlString(productId) + ';');
  statements.push('INSERT OR REPLACE INTO legacy_products (id, name, category, payload_json, updated_at) VALUES (' + [productId, product.name, product.category, json(payload), now].map(sqlString).join(', ') + ');');
  for (const [index, specification] of (product.specifications || []).entries()) {
    const specId = stableId('legacy-spec-', productId + ':' + index + ':' + json(specification));
    statements.push('INSERT OR REPLACE INTO legacy_product_specs (id, product_id, name, capacity, form, payload_json, sort_order) VALUES (' + [specId, productId, specification.name, specification.capacity, specification.form, json(specification), index].map(sqlString).join(', ') + ');');
  }
  for (const [index, rule] of (product.pesticide_compat || []).entries()) {
    const ruleId = stableId('legacy-compat-', productId + ':' + index + ':' + json(rule));
    statements.push('INSERT OR REPLACE INTO legacy_product_compatibility (id, product_id, pesticide_name, status, reason) VALUES (' + [ruleId, productId, rule.pesticide, rule.status, rule.reason].map(sqlString).join(', ') + ');');
  }
}

for (const pesticide of pesticides) {
  statements.push('INSERT OR REPLACE INTO legacy_pesticides (component, payload_json, updated_at) VALUES (' + [pesticide.component, json(pesticide), now].map(sqlString).join(', ') + ');');
}

for (const [component, extra] of Object.entries(extras)) {
  statements.push('INSERT OR REPLACE INTO legacy_pesticide_extras (component, payload_json, updated_at) VALUES (' + [component, json({ component, ...extra }), now].map(sqlString).join(', ') + ');');
}

const navItems = [
  ['dashboard', '系统看板', '核心功能智库', 10, 1, 0],
  ['crops', '作物与施肥方案', '核心功能智库', 20, 1, 0],
  ['pests', '病虫害图谱', '核心功能智库', 30, 1, 0],
  ['pesticide_mixing', '产品混配性查询', '农药与产品资料', 40, 1, 0],
  ['product_catalog', '产品信息库', '农药与产品资料', 50, 1, 0],
  ['community', '互动交流与留言', '核心功能智库', 60, 1, 0],
  ['product_quiz', '产品分类实训', '核心功能智库', 70, 1, 0],
  ['local_import', '本地离线识别录入', '工具与管理', 80, 1, 1],
  ['admin_settings', '系统设置与产品库', '工具与管理', 90, 1, 1],
  ['navigation_settings', '导航排序与分组', '工具与管理', 95, 1, 1],
  ['users_approval', '成员与权限管理', '工具与管理', 100, 1, 1],
];
for (const [tab, label, group, order, enabled, adminOnly] of navItems) {
  statements.push('INSERT OR IGNORE INTO navigation_items (id, tab, label, group_name, sort_order, enabled, admin_only, updated_at) VALUES (' + [stableId('nav-', tab), tab, label, group, order, enabled, adminOnly, now].map(sqlString).join(', ') + ');');
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, statements.join('\n') + '\n', 'utf8');
console.log(JSON.stringify({ output: outputPath, products: products.length, specs: products.reduce((sum, product) => sum + (product.specifications || []).length, 0), compatibility: products.reduce((sum, product) => sum + (product.pesticide_compat || []).length, 0), pesticides: pesticides.length, extras: Object.keys(extras).length, statements: statements.length }));
