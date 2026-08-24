import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Image as ImageIcon, Search, ShieldCheck } from 'lucide-react';

type SourceDocument = { id: string; title: string; source_path: string; source_sha256: string; original_html?: string; node_count: number; image_count: number; imported_at: string; updated_at: string };
type SourceNode = { id: string; parent_id?: string | null; depth: number; sort_order: number; node_type: string; text_content: string; image_urls: string[] };
type SourceAsset = { id: string; source_url: string; asset_key: string; content_type: string; status: string; sort_order: number };

export const SourceDocumentView: React.FC = () => {
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [document, setDocument] = useState<SourceDocument | null>(null);
  const [nodes, setNodes] = useState<SourceNode[]>([]);
  const [assets, setAssets] = useState<SourceAsset[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState('');
  const [downloadBusy, setDownloadBusy] = useState(false);

  useEffect(() => {
    fetch('/api/source-documents').then((response) => response.json()).then((payload: { documents?: SourceDocument[] }) => {
      const items = payload.documents || [];
      setDocuments(items);
      if (items[0]) setDocument(items[0]);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!document) return;
    const params = new URLSearchParams({ id: document.id, limit: '6000' });
    if (query.trim()) params.set('query', query.trim());
    setLoading(true);
    fetch('/api/source-documents?' + params).then((response) => response.json()).then((payload: { document?: SourceDocument; nodes?: SourceNode[]; assets?: SourceAsset[] }) => {
      setDocument(payload.document || document);
      setNodes(payload.nodes || []);
      setAssets(payload.assets || []);
    }).finally(() => setLoading(false));
  }, [document?.id, query]);
  const assetByUrl = useMemo(() => new Map(assets.map((asset) => [asset.source_url, asset])), [assets]);
  if (!document && !loading) return <div className="mx-auto max-w-[1500px] p-8 text-center text-slate-500">暂无导入的原始资料。</div>;
  const downloadOriginal = async () => {
    if (!document || downloadBusy) return;
    setDownloadBusy(true);
    try {
      const response = await fetch('/api/source-documents?id=' + encodeURIComponent(document.id) + '&include_html=1&limit=1');
      const payload = await response.json() as { document?: SourceDocument };
      const html = payload.document?.original_html;
      if (!html) return;
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.title;
      link.click();
      URL.revokeObjectURL(url);
    } finally { setDownloadBusy(false); }
  };
  return <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-amber-950 to-emerald-950 p-6 text-white shadow-lg md:p-8"><div className="flex items-center gap-2 text-xs font-bold text-amber-200"><BookOpen className="h-4 w-4" />原始技术资料源</div><div className="mt-3 flex flex-wrap items-start justify-between gap-3"><h1 className="text-2xl font-black md:text-3xl">作物病虫害解决方案</h1><button type="button" onClick={() => void downloadOriginal()} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20">{downloadBusy ? '准备原文…' : '下载原始 HTML'}</button></div><p className="mt-2 max-w-none text-sm leading-6 text-slate-300">原文节点、层级和图片引用完整保留，内容来自导入的技术资料源，不对原文做摘要替换。</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">{document?.node_count || 0} 个节点</span><span className="rounded-full bg-white/10 px-3 py-1.5">{document?.image_count || 0} 张图片</span><span className="rounded-full bg-white/10 px-3 py-1.5">SHA-256 {document?.source_sha256?.slice(0, 12)}</span></div></header>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{documents.map((item) => <button type="button" key={item.id} onClick={() => setDocument(item)} className={'rounded-full px-3 py-2 text-xs font-bold ' + (item.id === document?.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600')}>{item.title}</button>)}</div><label className="relative block lg:w-96"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索原始资料节点" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-2 text-lg font-black text-slate-900"><ShieldCheck className="h-5 w-5 text-emerald-600" />原文资料内容</div><div className="mt-5 space-y-2">{nodes.map((node) => <article key={node.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3" style={{ marginLeft: Math.min(node.depth, 12) * 18 }}><div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{node.text_content}</div>{node.image_urls.length > 0 && <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">{node.image_urls.map((url) => { const asset = assetByUrl.get(url); const src = asset ? '/api/source-document-assets/' + encodeURIComponent(asset.id) : url; return <button type="button" key={url} onClick={() => setSelectedImage(src)} className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1"><img src={src} alt="技术资料图片" loading="lazy" className="h-36 w-full object-contain" /></button>; })}</div>}</article>)}{!loading && !nodes.length && <div className="py-12 text-center text-sm text-slate-500">没有匹配的资料节点。</div>}</div></section>
    {selectedImage && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6" onClick={() => setSelectedImage('')}><div className="max-h-[90vh] max-w-[90vw] rounded-2xl bg-white p-3"><img src={selectedImage} alt="技术资料图片放大预览" className="max-h-[84vh] max-w-[86vw] object-contain" /></div></div>}
  </div>;
};
