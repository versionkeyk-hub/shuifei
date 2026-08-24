const baseUrl = (process.argv[2] || 'https://hmht-agri-tech.version-keyk.workers.dev').replace(/\/$/, '');
const documentId = process.argv[3] || 'source-doc-4c784a84a66adf221597';
const listing = await fetch(baseUrl + '/api/source-documents?id=' + encodeURIComponent(documentId) + '&limit=1');
if (!listing.ok) throw new Error('资料接口失败：' + listing.status);
const payload = await listing.json();
const external = (payload.assets || []).filter((asset) => asset.status !== 'cached');
let cached = 0;
let failed = 0;
for (const [index, asset] of external.entries()) {
  let success = false;
  for (let attempt = 1; attempt <= 5 && !success; attempt += 1) {
    try {
      const response = await fetch(baseUrl + '/api/source-document-assets/' + encodeURIComponent(asset.id));
      success = response.ok;
      if (!success) await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
  if (success) cached += 1;
  else failed += 1;
  console.log('[' + (index + 1) + '/' + external.length + '] ' + asset.id + ' ' + (success ? 'cached' : 'failed'));
}
console.log(JSON.stringify({ total: external.length, cached, failed }));
if (failed) process.exitCode = 1;
