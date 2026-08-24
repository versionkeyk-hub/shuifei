import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [inputPath, outputPath = 'data/generated/source-document-seed.sql'] = process.argv.slice(2);
if (!inputPath) throw new Error('Usage: node scripts/import_source_html.mjs <html-file> [sql-output]');

const html = await readFile(inputPath, 'utf8');
const sha256 = createHash('sha256').update(html).digest('hex');
const documentId = 'source-doc-' + sha256.slice(0, 20);
const now = new Date().toISOString();
const sql = (value) => value === null || value === undefined ? 'NULL' : "'" + String(value).replace(/'/g, "''") + "'";
const decodeEntities = (value) => String(value || '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
const cleanText = (value) => decodeEntities(String(value || ''))
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const imageUrls = [];
const imagePattern = /<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/gi;
let imageMatch;
while ((imageMatch = imagePattern.exec(html))) {
  if (!imageUrls.includes(imageMatch[1])) imageUrls.push(imageMatch[1]);
}

const nodes = [];
const nodeStack = [];
let lastNode = null;
const tagStack = [];
const tokenPattern = /<!--[\s\S]*?-->|<[^>]+>|[^<]+/g;
const attribute = (raw, name) => raw.match(new RegExp('\\b' + name + '\\s*=\\s*["\']([^"\']+)', 'i'))?.[1] || '';
const hasClass = (raw, className) => new RegExp('\\bclass\\s*=\\s*["\'][^"\']*\\b' + className + '\\b', 'i').test(raw);
let tokenMatch;
let index = 0;
while ((tokenMatch = tokenPattern.exec(html))) {
  const token = tokenMatch[0];
  if (token.startsWith('<!--')) continue;
  if (token[0] !== '<') {
    const current = nodeStack[nodeStack.length - 1];
    if (current?.contentDepth && tagStack.length >= current.contentDepth) current.textParts.push(token);
    continue;
  }
  const closing = /^<\s*\//.test(token);
  const tagName = token.match(/^<\s*\/?\s*([a-z0-9:-]+)/i)?.[1]?.toLowerCase();
  if (!tagName) continue;
  if (closing) {
    const current = nodeStack[nodeStack.length - 1];
    if (tagName === 'div' && current?.contentDepth === tagStack.length) current.contentDepth = 0;
    if (tagName === 'li' && current?.liDepth === tagStack.length) nodeStack.pop();
    for (let cursor = tagStack.length - 1; cursor >= 0; cursor -= 1) {
      if (tagStack[cursor] === tagName) { tagStack.length = cursor; break; }
    }
    continue;
  }
  const selfClosing = /\/\s*>$/.test(token) || ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName);
  tagStack.push(tagName);
  if (tagName === 'li' && hasClass(token, 'node')) {
    const parent = nodeStack[nodeStack.length - 1];
    const node = {
      id: 'source-node-' + String(index + 1).padStart(6, '0'),
      parentId: parent?.id || null,
      depth: parent ? parent.depth + 1 : 0,
      sortOrder: index++,
      nodeType: 'text',
      textParts: [],
      urls: [],
      contentDepth: 0,
      liDepth: tagStack.length,
    };
    nodes.push(node);
    nodeStack.push(node);
    lastNode = node;
  }
  const current = nodeStack[nodeStack.length - 1] || lastNode;
  if (tagName === 'div' && current && hasClass(token, 'content')) current.contentDepth = tagStack.length;
  if (tagName === 'img' && current) {
    const sourceUrl = attribute(token, 'src');
    if (sourceUrl && !current.urls.includes(sourceUrl)) current.urls.push(sourceUrl);
  }
  if (selfClosing) tagStack.pop();
}

for (const node of nodes) {
  node.text = cleanText(node.textParts.join(''));
  node.nodeType = node.urls.length ? 'image' : 'text';
  delete node.textParts;
  delete node.contentDepth;
  delete node.liDepth;
}
if (!nodes.length) nodes.push({ id: 'source-node-000001', parentId: null, depth: 0, sortOrder: 0, nodeType: 'document', text: cleanText(html), urls: imageUrls });

const statements = [];
statements.push('INSERT OR REPLACE INTO source_documents (id, title, source_path, source_sha256, original_html, node_count, image_count, imported_at, updated_at) VALUES (' + [documentId, path.basename(inputPath), inputPath, sha256, '', nodes.length, imageUrls.length, now, now].map(sql).join(', ') + ');');
statements.push('DELETE FROM source_document_nodes WHERE document_id = ' + sql(documentId) + ';');
statements.push('DELETE FROM source_document_assets WHERE document_id = ' + sql(documentId) + ';');
statements.push('DELETE FROM source_document_fragments WHERE document_id = ' + sql(documentId) + ';');
const fragmentSize = 12000;
for (let offset = 0, fragmentIndex = 0; offset < html.length; offset += fragmentSize, fragmentIndex += 1) {
  statements.push('INSERT INTO source_document_fragments (id, document_id, sort_order, content) VALUES (' + ['source-fragment-' + String(fragmentIndex + 1).padStart(4, '0'), documentId, fragmentIndex, html.slice(offset, offset + fragmentSize)].map(sql).join(', ') + ');');
}
for (const node of nodes) statements.push('INSERT INTO source_document_nodes (id, document_id, parent_id, depth, sort_order, node_type, text_content, image_urls_json) VALUES (' + [node.id, documentId, node.parentId, node.depth, node.sortOrder, node.nodeType, node.text, JSON.stringify(node.urls)].map(sql).join(', ') + ');');
for (const [sortOrder, sourceUrl] of imageUrls.entries()) {
  const assetId = 'source-asset-' + createHash('sha1').update(documentId + sourceUrl).digest('hex').slice(0, 20);
  statements.push('INSERT OR REPLACE INTO source_document_assets (id, document_id, source_url, asset_key, content_type, status, sort_order) VALUES (' + [assetId, documentId, sourceUrl, 'source-documents/' + documentId + '/' + String(sortOrder + 1).padStart(4, '0'), 'image/*', 'external', sortOrder].map(sql).join(', ') + ');');
}
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, statements.join('\n') + '\n', 'utf8');
console.log(JSON.stringify({ outputPath, documentId, nodeCount: nodes.length, imageCount: imageUrls.length, htmlBytes: Buffer.byteLength(html) }));
