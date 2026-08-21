import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function json(value) {
  return JSON.stringify(value ?? {});
}

function checksum(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonical(value) {
  return String(value || '').replace(/[\s.·•、()（）【】\[\]\-_]/g, '').toLowerCase();
}

function findLegacyProduct(product, legacyProducts) {
  const candidates = [product.name].concat(product.aliases || []).map(canonical);
  return legacyProducts.find((legacy) => {
    const name = canonical(legacy.data?.name);
    return candidates.some((candidate) => candidate && name && (name.includes(candidate) || candidate.includes(name)));
  });
}

const [catalogPath, mixingPath, legacySnapshotPath, outputPath, usersPath] = process.argv.slice(2);
if (!catalogPath || !mixingPath || !legacySnapshotPath || !outputPath) {
  throw new Error('Usage: node scripts/create_d1_seed.mjs <catalog.json> <mixing.json> <legacy-products.json> <output.sql> [legacy-users.json]');
}

const [catalog, mixing, legacySnapshot] = await Promise.all(
  [catalogPath, mixingPath, legacySnapshotPath].map(async (file) => JSON.parse(await readFile(file, 'utf8'))),
);
const users = usersPath ? JSON.parse(await readFile(usersPath, 'utf8')) : [];
const legacyProducts = legacySnapshot.products || [];
const legacyProductById = new Map((mixing.company_products || []).map((product) => [product.id, product]));
const now = new Date().toISOString();
const statements = [];

for (const product of catalog.products || []) {
  const legacy = findLegacyProduct(product, legacyProducts);
  const legacyMix = legacy ? legacyProductById.get(legacy.legacy_id) : undefined;
  statements.push(
    'INSERT OR REPLACE INTO products (id, name, brand, source_type, form, usage, plain_usage, ingredients_json, source_refs_json, legacy_details_json, images_json, mix_flags_json, needs_verification, updated_at) VALUES (' +
      [
        sqlString(product.id),
        sqlString(product.name),
        sqlString(product.brand),
        sqlString(product.source_type),
        sqlString(product.form),
        sqlString(product.usage),
        sqlString(product.plain_usage),
        sqlString(json(product.ingredients)),
        sqlString(json(product.source_refs)),
        sqlString(json(legacy?.data || {})),
        sqlString(json((product.image_sources || []).map((image) => '/api/assets/' + image.r2_key))),
        sqlString(json(product.mix_flags || legacyMix?.flags || {})),
        product.needs_verification ? '1' : '0',
        sqlString(now),
      ].join(', ') +
      ');',
  );

  for (const [index, specification] of (product.specifications || []).entries()) {
    const skuId = createHash('sha256').update(product.id + ':' + index + ':' + json(specification)).digest('hex').slice(0, 32);
    statements.push(
      'INSERT OR REPLACE INTO product_skus (id, product_id, sku, specification, unit, inner_pack_count, price, price_tier, product_type, source_ref_json, updated_at) VALUES (' +
        [
          sqlString(skuId),
          sqlString(product.id),
          sqlString(specification.sku),
          sqlString(specification.specification),
          sqlString(specification.unit),
          Number.isFinite(specification.inner_pack_count) ? String(specification.inner_pack_count) : 'NULL',
          Number.isFinite(specification.price) ? String(specification.price) : 'NULL',
          sqlString(specification.price_tier),
          sqlString(specification.product_type),
          sqlString(json(specification.source_ref)),
          sqlString(now),
        ].join(', ') +
        ');',
    );
  }
}

for (const pesticide of mixing.pesticides || []) {
  statements.push(
    'INSERT OR REPLACE INTO pesticides (component, aliases_json, category, chemical_class, problems, usage, precautions, brands_json, related_json, flags_json, updated_at) VALUES (' +
      [
        sqlString(pesticide.component),
        sqlString(json(pesticide.aliases)),
        sqlString(pesticide.category),
        sqlString(pesticide.chemical_class),
        sqlString(pesticide.problems),
        sqlString(pesticide.usage),
        sqlString(pesticide.precautions),
        sqlString(json(pesticide.brands)),
        sqlString(json(pesticide.related)),
        sqlString(json(pesticide.flags)),
        sqlString(now),
      ].join(', ') +
      ');',
  );
}

const knownPesticides = new Set((mixing.pesticides || []).map((pesticide) => pesticide.component));
const skippedPesticideExtras = [];
for (const [component, extra] of Object.entries(mixing.pesticide_extras || {})) {
  if (!knownPesticides.has(component)) {
    skippedPesticideExtras.push(component);
    continue;
  }
  statements.push(
    'INSERT OR REPLACE INTO pesticide_extras (component, ph, contraindications, flags_json, updated_at) VALUES (' +
      [sqlString(component), sqlString(extra.ph), sqlString(extra.contraindications), sqlString(json(extra.flags)), sqlString(now)].join(', ') +
      ');',
  );
}

for (const user of users) {
  if (!user.id || !user.name || !user.password_hash) continue;
  statements.push(
    'INSERT OR IGNORE INTO users (id, username, display_name, role, status, password_hash, password_algorithm, created_at, migrated_from) VALUES (' +
      [
        sqlString(user.id),
        sqlString(user.name),
        sqlString(user.name),
        sqlString(user.type === 'staff' ? 'staff' : user.type || 'farmer'),
        sqlString(user.status || 'approved'),
        sqlString(user.password_hash),
        sqlString('legacy_sha256'),
        sqlString(user.created_at || now),
        sqlString('legacy-supabase'),
      ].join(', ') +
      ');',
  );
}

for (const image of catalog.image_manifest || []) {
  const productId = (image.matched_product_ids || [])[0] || null;
  statements.push(
    'INSERT OR REPLACE INTO source_assets (id, source_path, sha256, r2_key, product_id, import_status, imported_at, source_note) VALUES (' +
      [
        sqlString(createHash('sha256').update(image.source_path).digest('hex').slice(0, 32)),
        sqlString(image.source_path),
        sqlString(image.sha256),
        sqlString(image.r2_key),
        sqlString(productId),
        sqlString(image.import_status || 'pending'),
        'NULL',
        sqlString('Source package image manifest'),
      ].join(', ') +
      ');',
  );
}

const counts = {
  catalog_products: (catalog.products || []).length,
  skus: (catalog.products || []).reduce((total, product) => total + (product.specifications || []).length, 0),
  pesticides: (mixing.pesticides || []).length,
  legacy_product_records: legacyProducts.length,
  legacy_user_records: users.length,
  skipped_pesticide_extras: skippedPesticideExtras.length,
  source_assets: (catalog.image_manifest || []).length,
};
const auditPayload = json(counts);
statements.push(
  'INSERT INTO import_audits (id, source_name, source_sha256, imported_at, status, record_counts_json, notes) VALUES (' +
    [sqlString(randomUUID()), sqlString('initial-product-and-legacy-migration'), sqlString(checksum(auditPayload)), sqlString(now), sqlString('completed'), sqlString(auditPayload), sqlString('Generated by scripts/create_d1_seed.mjs')].join(', ') +
    ');',
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, statements.join('\n') + '\n', 'utf8');
console.log(JSON.stringify({ output: outputPath, ...counts, checksum: checksum(auditPayload) }));
