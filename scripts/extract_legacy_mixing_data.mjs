import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

function readValue(source, variableName) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source + '\nthis.__result = ' + variableName + ';', context, { timeout: 1_000 });
  if (!context.__result || typeof context.__result !== 'object') {
    throw new Error(variableName + ' is not an object or array');
  }
  return JSON.parse(JSON.stringify(context.__result));
}

function checksum(input) {
  return createHash('sha256').update(input).digest('hex');
}

const [legacyDirectory, outputFile] = process.argv.slice(2);
if (!legacyDirectory || !outputFile) {
  throw new Error('Usage: node scripts/extract_legacy_mixing_data.mjs <legacy-dir> <output-file>');
}

const productsPath = path.join(legacyDirectory, 'data', 'products.js');
const pesticidesPath = path.join(legacyDirectory, 'data', 'pesticides.js');
const extrasPath = path.join(legacyDirectory, 'online-data-pesticide_extras.js');
const [productsSource, pesticidesSource] = await Promise.all([
  readFile(productsPath, 'utf8'),
  readFile(pesticidesPath, 'utf8'),
]);
const companyProducts = readValue(productsSource, 'COMPANY_PRODUCTS');
const pesticides = readValue(pesticidesSource, 'PESTICIDES');

let extras = [];
try {
  const extraSource = await readFile(extrasPath, 'utf8');
  extras = readValue(extraSource, 'PESTICIDE_EXTRAS');
} catch {
  // The published ZIP does not include extras. The online asset is optional.
}

const payload = {
  source: {
    products: { path: 'data/products.js', sha256: checksum(productsSource) },
    pesticides: { path: 'data/pesticides.js', sha256: checksum(pesticidesSource) },
  },
  company_products: companyProducts,
  pesticides,
  pesticide_extras: extras,
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  output: outputFile,
  company_products: companyProducts.length,
  pesticides: pesticides.length,
  pesticide_extras: Array.isArray(extras) ? extras.length : Object.keys(extras).length,
}));
