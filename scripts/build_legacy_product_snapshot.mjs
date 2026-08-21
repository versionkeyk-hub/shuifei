import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [backupDirectory, outputFile] = process.argv.slice(2);
if (!backupDirectory || !outputFile) {
  throw new Error('Usage: node scripts/build_legacy_product_snapshot.mjs <legacy-backup-dir> <output-file>');
}

const sourcePath = path.join(backupDirectory, 'products.json');
const source = await readFile(sourcePath, 'utf8');
const rows = JSON.parse(source);
const payload = {
  source: {
    kind: 'legacy-supabase-products-readonly-snapshot',
    sha256: createHash('sha256').update(source).digest('hex'),
  },
  products: rows.map((row) => ({
    legacy_id: row.id,
    updated_at: row.updated_at,
    data: row.data,
  })),
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ output: outputFile, products: payload.products.length }));
