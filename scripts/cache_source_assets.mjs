const baseUrl = (process.argv[2] || 'https://hmht-agri-tech.version-keyk.workers.dev').replace(/\/$/, '');
const documentId = process.argv[3] || 'source-doc-4c784a84a66adf221597';
const concurrency = Math.max(1, Math.min(Number(process.argv[4] || 6), 12));

const listing = await fetch(baseUrl + '/api/source-documents?id=' + encodeURIComponent(documentId) + '&limit=1');
if (!listing.ok) throw new Error('资料接口失败：' + listing.status);
const payload = await listing.json();
const assets = payload.assets || [];
let cursor = 0;
let completed = 0;
let failed = 0;
const errors = [];

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= assets.length) return;
    const asset = assets[index];
    try {
      const response = await fetch(baseUrl + '/api/source-document-assets/' + encodeURIComponent(asset.id));
      if (!response.ok) throw new Error(String(response.status));
      completed += 1;
    } catch (error) {
      failed += 1;
      errors.push({ id: asset.id, error: String(error) });
    }
    if ((completed + failed) % 25 === 0 || completed + failed === assets.length) {
      console.log('[' + (completed + failed) + '/' + assets.length + '] cached=' + completed + ' failed=' + failed);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, assets.length) }, () => worker()));
console.log(JSON.stringify({ documentId, total: assets.length, cached: completed, failed, errors: errors.slice(0, 20) }));
if (failed) process.exitCode = 1;
