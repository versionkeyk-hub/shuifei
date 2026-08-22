import fs from 'node:fs';
import vm from 'node:vm';

const context = {};
vm.createContext(context);
for (const file of ['pesticides.js', 'pesticide_extras.js', 'products.js']) {
  vm.runInContext(fs.readFileSync('public/legacy-pesticide/data/' + file, 'utf8'), context, { filename: file });
}

const products = context.COMPANY_PRODUCTS || [];
const pesticides = context.PESTICIDES || [];
const extras = context.PESTICIDE_EXTRAS || {};
const unionKeys = (values) => [...new Set(values.flatMap((value) => Object.keys(value || {})))];
console.log(JSON.stringify({
  pesticideCount: pesticides.length,
  pesticideKeys: unionKeys(pesticides),
  extraCount: Object.keys(extras).length,
  extraKeys: unionKeys(Object.values(extras)),
  productCount: products.length,
  productKeys: unionKeys(products),
  details: products.map((product) => ({
    name: product.name,
    specs: (product.specifications || []).length,
    images: (product.images || []).length,
    compatibility: (product.pesticide_compat || []).length,
  })),
}, null, 2));

