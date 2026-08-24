import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Image as ImageIcon, Search } from 'lucide-react';
import { ImageLightboxModal } from './ImageLightboxModal';

type KnowledgeKind = 'pesticide' | 'crop' | 'other';
type SourceDocument = { id: string; title: string; node_count: number; image_count: number; source_sha256: string; updated_at: string };
type SourceNode = { id: string; parent_id?: string | null; depth: number; sort_order: number; node_type: string; text_content: string; image_urls: string[]; source_kind?: KnowledgeKind; crop_label?: string; source_path?: string };
type SourceAsset = { id: string; source_url: string; asset_key: string; content_type: string; status: string; sort_order: number };

function classify(node: SourceNode, byId: Map<string, SourceNode>): KnowledgeKind {
  if (node.source_kind) return node.source_kind;
  const parts: string[] = [];
  let current: SourceNode | undefined = node;
  while (current) {
    parts.push(current.text_content);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  const path = parts.join(' ');
  if (/农药分类|农药禁用|生物制剂|化学制剂|农药科普|农药知识/.test(path)) return 'pesticide';
  if (/果树|蔬菜|主粮|粮油|糖料|药材|盆景|景观|苗木|花卉|山茶|茶树|病害|虫害|病虫/.test(path)) return 'crop';
  return 'other';
}

const LABELS: Record<KnowledgeKind, string> = { pesticide: '农药科普', crop: '作物病虫害资料', other: '其他农业知识' };
const VISIBLE_KINDS: KnowledgeKind[] = ['pesticide', 'other'];

export const SourceDocumentView: React.FC = () => {
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [document, setDocument] = useState<SourceDocument | null>(null);
  const [nodes, setNodes] = useState<SourceNode[]>([]);
  const [assets, setAssets] = useState<SourceAsset[]>([]);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KnowledgeKind>('pesticide');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    fetch('/api/source-documents').then((response) => response.json()).then((payload: { documents?: SourceDocument[] }) => {
      const items = payload.documents || [];
      setDocuments(items);
      if (items[0]) setDocument(items[0]);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!document) return;
    setLoading(true);
    fetch('/api/source-documents?' + new URLSearchParams({ id: document.id, limit: '6000' })).then((response) => response.json()).then((payload: { document?: SourceDocument; nodes?: SourceNode[]; assets?: SourceAsset[] }) => {
      setDocument(payload.document || document);
      setNodes(payload.nodes || []);
      setAssets(payload.assets || []);
    }).finally(() => setLoading(false));
  }, [document?.id]);

  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const classified = useMemo(() => nodes.map((node) => ({ node, kind: classify(node, byId) })), [byId, nodes]);
  const counts = useMemo(() => classified.reduce<Record<KnowledgeKind, number>>((result, item) => ({ ...result, [item.kind]: result[item.kind] + 1 }), { pesticide: 0, crop: 0, other: 0 }), [classified]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return classified.filter(({ node, kind: nodeKind }) => nodeKind === kind && (!needle || (node.text_content + ' ' + (node.crop_label || '') + ' ' + (node.source_path || '')).toLowerCase().includes(needle)));
  }, [classified, kind, query]);
  const assetByUrl = useMemo(() => new Map(assets.map((asset) => [asset.source_url, asset])), [assets]);

  if (!document && !loading) return <div className="mx-auto max-w-[1500px] p-8 text-center text-slate-500">暂无农业知识资料。</div>;
  return <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-950 p-6 text-white shadow-lg md:p-8"><div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><BookOpen className="h-4 w-4" />农药科普与农业知识</div><h1 className="mt-3 text-2xl font-black md:text-3xl">农药科普</h1><p className="mt-2 text-sm leading-7 text-slate-300">农药科普与其他农业知识按原文层级整理；作物病虫害图文资料已归入对应作物图谱，不在此处重复堆放。</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">{document?.node_count || 0} 个资料节点</span><span className="rounded-full bg-white/10 px-3 py-1.5">{document?.image_count || 0} 张图片</span></div></header>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap gap-2">{VISIBLE_KINDS.map((item) => <button type="button" key={item} onClick={() => setKind(item)} className={'rounded-full px-4 py-2 text-xs font-black ' + (kind === item ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50')}>{LABELS[item]} <span className="ml-1 opacity-70">{counts[item]}</span></button>)}</div><div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="text-xs text-slate-500">当前板块：{LABELS[kind]}</div><label className="relative block lg:w-96"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索当前知识板块" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-2 text-lg font-black text-slate-900"><BookOpen className="h-5 w-5 text-emerald-600" />{LABELS[kind]}</div><div className="mt-5 space-y-3">{visible.map(({ node }) => <article key={node.id} className={'rounded-2xl border px-4 py-3 ' + (node.depth <= 1 ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50')} style={{ marginLeft: Math.min(node.depth, 8) * 16 }}><div className={node.depth <= 1 ? 'text-base font-black leading-7 text-slate-900' : 'whitespace-pre-wrap text-sm leading-7 text-slate-700'}>{node.text_content}</div>{node.image_urls.length > 0 && <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{node.image_urls.map((url) => { const asset = assetByUrl.get(url); const src = asset ? '/api/source-document-assets/' + encodeURIComponent(asset.id) : url; return <button type="button" key={url} onClick={() => setSelectedImage(src)} className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-1"><img src={src} alt="农业技术资料图片" loading="lazy" className="h-40 w-full object-contain transition group-hover:scale-105" /></button>; })}</div>}</article>)}{!loading && !visible.length && <div className="py-12 text-center text-sm text-slate-500"><ImageIcon className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3">当前板块没有匹配的资料。</p></div>}</div></section>
    {documents.length > 1 && <div className="text-center text-[11px] text-slate-400">资料源：{documents.map((item) => item.title).join('、')}</div>}
    {selectedImage && <ImageLightboxModal imageUrl={selectedImage} title={LABELS[kind]} onClose={() => setSelectedImage('')} />}
  </div>;
};
