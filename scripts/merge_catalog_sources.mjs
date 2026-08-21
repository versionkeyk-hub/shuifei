import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

function normalize(value) {
  return String(value || '')
    .replace(/沣硕40\+/g, '沣硕')
    .replace(/傲靓LPE/gi, '傲靓')
    .replace(/锄头猫[.·]有机水溶肥/g, '有机水溶肥鱼蛋白')
    .replace(/锄头猫[.·]花果多/g, '花果多')
    .replace(/[\s.·•、()（）【】\[\]\-_+]/g, '')
    .toLowerCase();
}

function stableId(value) {
  return 'prd-legacy-' + createHash('sha1').update(value).digest('hex').slice(0, 12);
}

function legacyBrand(name) {
  return String(name || '').startsWith('锄头猫') ? '锄头猫' : '农小蛙';
}

function findProduct(products, name, legacyId) {
  const aliases = {
    fengshuo: '沣硕',
    aolan: '傲岚',
    chutoumao_yudanbai: '有机水溶肥（鱼蛋白）',
    heiyan: '黑岩',
    aomai: '傲脉',
    shaianxin: '晒安心',
    aoliang: '傲靓',
    aolei: '傲蕾',
    shikeshou: '施可收',
    beineng: '蓓能',
    chutoumao_huaguo: '花果多（微量元素）',
    zhuoyan: '卓艳',
    junshi: '均施',
    aojing: '傲净',
    fenghui: '沣惠',
  };
  const targets = [name, aliases[legacyId] || ''].map(normalize).filter(Boolean);
  return products
    .map((product) => ({
      product,
      score: [product.name].concat(product.aliases || []).reduce((best, value) => {
        const candidate = normalize(value);
        const score = targets.reduce((current, target) => {
          if (!candidate || !target) return current;
          if (candidate === target) return Math.max(current, 1000 + candidate.length);
          if (candidate.includes(target) || target.includes(candidate)) return Math.max(current, Math.min(candidate.length, target.length));
          return current;
        }, 0);
        return Math.max(best, score);
      }, 0),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.product;
}

function addSource(product, source) {
  product.source_refs = product.source_refs || [];
  if (!product.source_refs.some((item) => item.file === source.file && item.row === source.row)) {
    product.source_refs.push(source);
  }
}

const [catalogPath, legacyPath, mixingPath, outputPath] = process.argv.slice(2);
if (!catalogPath || !legacyPath || !mixingPath || !outputPath) {
  throw new Error('Usage: node scripts/merge_catalog_sources.mjs <catalog.json> <legacy-products.json> <legacy-mixing.json> <output.json>');
}

const [catalog, legacySnapshot, mixing] = await Promise.all(
  [catalogPath, legacyPath, mixingPath].map(async (file) => JSON.parse(await readFile(file, 'utf8'))),
);
const products = catalog.products || [];

for (const legacy of legacySnapshot.products || []) {
  const data = legacy.data || {};
  const source = { file: 'legacy-supabase/products.json', sheet: 'products', row: legacy.legacy_id };
  let product = findProduct(products, data.name, legacy.legacy_id);
  if (!product) {
    product = {
      id: stableId(legacy.legacy_id),
      name: String(data.name || legacy.legacy_id),
      brand: legacyBrand(data.name),
      aliases: [],
      source_type: 'own',
      form: '',
      usage: '',
      plain_usage: '',
      ingredients: {},
      specifications: [],
      source_refs: [],
      needs_verification: true,
    };
    products.push(product);
  }
  if (data.name && data.name !== product.name && !(product.aliases || []).includes(data.name)) {
    product.aliases = [...(product.aliases || []), data.name];
  }
  product.legacy_details = data;
  product.legacy_id = legacy.legacy_id;
  product.legacy_updated_at = legacy.updated_at;
  product.images = Array.isArray(data.images) ? data.images : product.images || [];
  product.form = product.form || data.category || '';
  product.usage = product.usage || data.usage || '';
  product.plain_usage = product.plain_usage || data.intro || data.description || '';
  product.ingredients = Object.keys(product.ingredients || {}).length ? product.ingredients : { 旧站产品信息: data.ingredients || '' };
  addSource(product, source);
}

for (const legacyProduct of mixing.company_products || []) {
  const source = { file: 'legacy-deploy/data/products.js', sheet: 'COMPANY_PRODUCTS', row: legacyProduct.id || legacyProduct.name };
  let product = findProduct(products, legacyProduct.name, legacyProduct.id);
  if (!product) {
    product = {
      id: stableId(legacyProduct.id || legacyProduct.name),
      name: legacyProduct.name,
      brand: '农小蛙',
      aliases: [],
      source_type: 'own',
      form: legacyProduct.category || '',
      usage: legacyProduct.usage || '',
      plain_usage: legacyProduct.description || '',
      ingredients: {},
      specifications: [],
      source_refs: [],
      needs_verification: true,
    };
    products.push(product);
  }
  product.mix_flags = legacyProduct.flags || product.mix_flags || {};
  product.legacy_mixing_profile = legacyProduct;
  addSource(product, source);
}

catalog.products = products.sort((left, right) => (left.brand + left.name).localeCompare(right.brand + right.name, 'zh-CN'));
catalog.merge_audit = {
  merged_at: new Date().toISOString(),
  legacy_cloud_products: (legacySnapshot.products || []).length,
  legacy_static_products: (mixing.company_products || []).length,
  final_products: catalog.products.length,
};
await writeFile(outputPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(catalog.merge_audit));
