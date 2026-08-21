import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const sourceDirectory = path.resolve('data/generated');
const destinationDirectory = path.resolve('public/data');
const files = ['product-catalog.json', 'legacy-mixing-catalog.json', 'legacy-cloud-products.json'];

await mkdir(destinationDirectory, { recursive: true });
for (const file of files) {
  await cp(path.join(sourceDirectory, file), path.join(destinationDirectory, file));
}

console.log(JSON.stringify({ copied: files, destination: destinationDirectory }));
