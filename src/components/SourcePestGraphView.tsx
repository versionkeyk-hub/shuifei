import React, { useEffect, useMemo, useState } from 'react';
import { Bug, ChevronDown, ChevronRight, Eye, Image as ImageIcon, LoaderCircle, Search, Sparkles, X } from 'lucide-react';
import { Crop, PestDiseaseItem } from '../types';
import { ImageLightboxModal } from './ImageLightboxModal';

type SourceNode = {
  id: string;
  parent_id?: string | null;
  depth: number;
  sort_order?: number;
  node_type?: string;
  text_content: string;
  image_urls?: string[];
  source_kind?: string;
  crop_label?: string;
};

type SourceAsset = { id: string; source_url: string };

type PestCard = {
  id: string;
  title: string;
  category: string;
  images: string[];
  symptoms: string;
  cause: string;
  prevention: string;
  controls: Array<{ label: string; rate: string }>;
  synergy: string;
  sections: SourceNode[];
  cropName: string;
};

const CATEGORY_ORDER = ['真菌性病害', '细菌性病害', '病毒病', '线虫病', '虫害', '螨害', '杂草与草害', '生理性问题', '药害与肥害', '环境与灾害胁迫', '其他'];

const CROP_ALIASES: Record<string, string[]> = {
  '柑橘橙柚': ['柑橘', '橙', '柚', '柑'],
  '葡萄': ['葡萄'],
  '百香果': ['百香果'],
  '桃树': ['桃树', '桃'],
  '槟榔': ['槟榔'],
  '蓝莓': ['蓝莓'],
  '番石榴（芭乐）': ['番石榴', '芭乐'],
  '辣椒（朝天椒、甜椒）': ['辣椒', '朝天椒', '甜椒'],
  '番茄（西红柿）': ['番茄', '西红柿', '圣女果', '樱桃番茄'],
  '大姜（生姜）': ['大姜', '生姜', '姜'],
  '韭菜（大蒜、洋葱）': ['韭菜', '大蒜', '洋葱'],
  '哈密瓜（香瓜、甜瓜）': ['哈密瓜', '香瓜', '甜瓜'],
  '中草药材（三七、麦冬、人参、丹参）': ['药材', '中草药', '三七', '麦冬', '人参', '丹参'],
  '三七（田七、金不换）': ['三七'],
  '麦冬（川麦冬、浙麦冬）': ['麦冬'],
  '花卉苗木与盆景/景观绿化': ['盆景', '景观', '苗木', '花卉', '山茶'],
  '山茶花（茶花、耐冬）': ['山茶', '茶花', '耐冬'],
  '茶树与油茶（绿茶、红茶、乌龙茶、山茶树）': ['茶树', '油茶', '山茶树'],
};

const normalize = (value: string) => value.replace(/[\s·.。()（）/_-]/g, '').toLowerCase();
const cleanText = (value: string) => value.replace(/\s+/g, ' ').trim();
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const cropMatches = (crop: Crop, label: string) => {
  const normalizedLabel = normalize(label);
  const names = [crop.name, ...(crop.aliases || []), ...(CROP_ALIASES[crop.name] || [])].map(normalize).filter(Boolean);
  return names.some((name) => normalizedLabel === name || normalizedLabel.includes(name) || name.includes(normalizedLabel));
};

const categoryFor = (value: string) => {
  if (/细菌|溃疡|软腐|青枯|细菌性/.test(value)) return '细菌性病害';
  if (/真菌|霜霉|疫病|白粉|炭疽|灰霉|褐斑|黑斑|锈病|根腐|枯萎/.test(value)) return '真菌性病害';
  if (/病毒|花叶|卷叶病毒|黄化曲叶/.test(value)) return '病毒病';
  if (/线虫/.test(value)) return '线虫病';
  if (/螨|红蜘蛛|白蜘蛛|锈壁虱|茶黄/.test(value)) return '螨害';
  if (/虫|蚜|蓟马|粉虱|木虱|夜蛾|潜叶|食心|螟|蝇|介壳|叶蝉|跳甲|天牛|蛴螬|蝼蛄|地老虎/.test(value)) return '虫害';
  if (/杂草|草害|禾本科|阔叶草|莎草|除草/.test(value)) return '杂草与草害';
  if (/药害|肥害|烧根|烧苗|盐害|盐渍/.test(value)) return '药害与肥害';
  if (/高温|低温|冻|涝|旱|风害|灾害|环境|胁迫/.test(value)) return '环境与灾害胁迫';
  if (/生理|缺素|黄化|脐腐|日灼|裂果|落花落果|空心|畸形/.test(value)) return '生理性问题';
  return '其他';
};

const descendantsOf = (node: SourceNode, childrenMap: Map<string, SourceNode[]>) => {
  const descendants: SourceNode[] = [];
  const visit = (current: SourceNode) => {
    (childrenMap.get(current.id) || []).forEach((child) => { descendants.push(child); visit(child); });
  };
  visit(node);
  return descendants;
};

const leafText = (node: SourceNode, childrenMap: Map<string, SourceNode[]>) => {
  const children = childrenMap.get(node.id) || [];
  if (!children.length) return node.node_type === 'image' ? [] : [cleanText(node.text_content)].filter(Boolean);
  return children.flatMap((child) => leafText(child, childrenMap));
};

const sectionType = (label: string) => {
  if (/症状|识别|表现|危害/.test(label)) return 'symptoms';
  if (/发病规律|发生规律|病原|传播途径|流行规律|原因/.test(label)) return 'cause';
  if (/预防/.test(label)) return 'prevention';
  if (/防治|用药|化学|药剂|治理/.test(label)) return 'control';
  if (/水肥|肥料|抗逆|营养|协同/.test(label)) return 'synergy';
  return 'other';
};

type SummaryType = 'symptoms' | 'cause' | 'prevention' | 'control' | 'synergy';

const collectSummaryText = (node: SourceNode, childrenMap: Map<string, SourceNode[]>, inherited: SummaryType | null = null): Array<{ type: SummaryType; text: string }> => {
  const ownType = sectionType(node.text_content);
  const currentType = ownType === 'other' ? inherited : ownType as SummaryType;
  const children = childrenMap.get(node.id) || [];
  if (!children.length) {
    if (node.node_type === 'image' || !currentType) return [];
    const text = cleanText(node.text_content);
    return text ? [{ type: currentType, text }] : [];
  }
  return children.flatMap((child) => collectSummaryText(child, childrenMap, currentType));
};

const extractCard = (root: SourceNode, category: string, childrenMap: Map<string, SourceNode[]>): PestCard => {
  const sections = childrenMap.get(root.id) || [];
  const allDescendants = descendantsOf(root, childrenMap);
  const images = unique([...(root.image_urls || []), ...allDescendants.flatMap((node) => node.image_urls || [])]);
  const summaries: Record<'symptoms' | 'cause' | 'prevention' | 'control' | 'synergy', string[]> = { symptoms: [], cause: [], prevention: [], control: [], synergy: [] };
  sections.forEach((section) => {
    collectSummaryText(section, childrenMap).forEach(({ type, text }) => summaries[type].push(text));
  });
  const controlLines = unique(summaries.control.filter((value) => value.length > 4));
  return {
    id: root.id,
    title: cleanText(root.text_content) || '未命名病虫害',
    category,
    images,
    symptoms: unique(summaries.symptoms).slice(0, 5).join('\n'),
    cause: unique(summaries.cause).slice(0, 4).join('\n'),
    prevention: unique(summaries.prevention).slice(0, 4).join('\n'),
    controls: (controlLines.length ? controlLines : unique(summaries.control)).map((value) => ({ label: value, rate: '' })),
    synergy: unique(summaries.synergy).slice(0, 3).join('\n'),
    sections: sections.filter((section) => section.node_type !== 'image'),
    cropName: root.crop_label || '',
  };
};

const standardCategory = (pest: PestDiseaseItem) => {
  const value = pest.categoryGroup || pest.type || '';
  if (/真菌/.test(value)) return '真菌性病害';
  if (/细菌/.test(value)) return '细菌性病害';
  if (/病毒/.test(value)) return '病毒病';
  if (/线虫/.test(value)) return '线虫病';
  if (/虫/.test(value)) return '虫害';
  if (/螨/.test(value)) return '螨害';
  if (/药害|肥害/.test(value)) return '药害与肥害';
  if (/生理/.test(value)) return '生理性问题';
  return categoryFor(value + pest.name);
};

const standardCard = (pest: PestDiseaseItem): PestCard => ({
  id: 'standard-' + pest.id,
  title: pest.name,
  category: standardCategory(pest),
  images: pest.images || [],
  symptoms: pest.symptoms || '',
  cause: [pest.occurrencePeriod, pest.occurrenceRules].filter(Boolean).join('\n'),
  prevention: pest.agriculturalControl || '',
  controls: (pest.chemicalControl || []).map((formula) => ({ label: formula.formulaName, rate: formula.dosageRate })),
  synergy: pest.fertilizerSynergy || '',
  sections: [],
  cropName: pest.cropName || pest.cropNames?.[0] || '',
});

const hazardLabel = (card: PestCard) => {
  if (/黄龙|溃疡|枯萎|根腐|青枯|根结/.test(card.title + card.symptoms)) return '严重危害';
  if (/虫|螨|疫病|炭疽|霜霉|白粉/.test(card.title + card.category)) return '中度危害';
  return '重点防治';
};

const FullSection: React.FC<{ node: SourceNode; childrenMap: Map<string, SourceNode[]> }> = ({ node, childrenMap }) => {
  const values = leafText(node, childrenMap);
  if (!values.length) return null;
  return <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"><h5 className="text-xs font-black text-slate-800">{cleanText(node.text_content).replace(/[：:]$/, '') || '技术资料'}</h5><div className="mt-1.5 space-y-1.5">{values.map((value, index) => <p key={node.id + index} className="whitespace-pre-wrap text-xs leading-6 text-slate-600">{value}</p>)}</div></div>;
};

const PestCardView: React.FC<{ card: PestCard; crop?: Crop; childrenMap: Map<string, SourceNode[]>; resolveImage: (url: string) => string; onOpenImages: (images: string[], index: number, title: string) => void }> = ({ card, crop, childrenMap, resolveImage, onOpenImages }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const heroImage = card.images[0];
  const displayCropName = crop?.name || card.cropName || '通用作物';
  const description = card.symptoms || card.cause || '已归档该病虫害的完整技术资料，请展开查看。';
  return <article className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="relative h-56 overflow-hidden bg-gradient-to-br from-emerald-800 to-slate-900">{heroImage ? <img src={resolveImage(heroImage)} alt={card.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-emerald-100"><Bug className="h-16 w-16 opacity-40" /></div>}<div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" /><div className="absolute left-3 top-3 flex max-w-[78%] flex-wrap gap-1.5"><span className="rounded-lg bg-slate-900/75 px-2.5 py-1 text-[11px] font-black text-white">{displayCropName}</span><span className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-black text-white">{card.category}</span></div><div className="absolute right-3 top-3 flex items-center gap-1.5">{heroImage && <button type="button" onClick={() => onOpenImages(card.images.map(resolveImage), 0, card.title)} className="rounded-full bg-slate-900/70 p-2 text-white hover:bg-slate-900" title="查看大图"><Eye className="h-4 w-4" /></button>}<button type="button" onClick={() => setDetailsOpen((value) => !value)} className="rounded-full bg-white/90 p-2 text-slate-800 hover:bg-white" title="查看完整资料"><ChevronDown className={"h-4 w-4 transition " + (detailsOpen ? 'rotate-180' : '')} /></button></div><div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 text-white"><h3 className="text-lg font-black leading-tight">{card.title}</h3><span className="shrink-0 rounded-md bg-red-600 px-2 py-1 text-[11px] font-black">{hazardLabel(card)}</span></div></div>
    {card.images.length > 0 && <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5"><span className="shrink-0 text-[11px] font-bold text-slate-400">图谱图库 ({card.images.length}):</span><div className="flex min-w-0 gap-2 overflow-x-auto">{card.images.map((url, index) => <button type="button" key={url + index} onClick={() => onOpenImages(card.images.map(resolveImage), index, card.title)} className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-emerald-500"><img src={resolveImage(url)} alt={card.title + '图' + (index + 1)} loading="lazy" className="h-full w-full object-cover" /></button>)}</div></div>}
    <div className="flex-1 space-y-3 p-4"><div><h4 className="text-xs font-black text-slate-800">识别特征与危害症状:</h4><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-600">{description}</p></div>{card.cause && <div><h4 className="text-xs font-black text-slate-800">发生原因与规律:</h4><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-600">{card.cause}</p></div>}{card.controls.length > 0 && <div><h4 className="text-xs font-black text-slate-800">推荐化学防效用药:</h4><div className="mt-1.5 space-y-1.5">{card.controls.slice(0, 4).map((control, index) => <div key={card.id + index} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-[11px]"><span className="min-w-0 break-words font-medium leading-5 text-emerald-700">{control.label}</span>{control.rate && <span className="max-w-[42%] text-right font-mono font-black leading-5 text-orange-600">{control.rate}</span>}</div>)}</div></div>}{card.prevention && <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-xs leading-5 text-sky-800"><strong className="mb-1 block text-sky-950">预防与管理:</strong><span className="whitespace-pre-wrap">{card.prevention}</span></div>}{card.synergy && <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs leading-5 text-emerald-800"><strong className="mb-1 block text-emerald-950">水肥协同抗逆技术:</strong><span className="whitespace-pre-wrap">{card.synergy}</span></div>}<button type="button" onClick={() => setDetailsOpen((value) => !value)} className="flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-900">{detailsOpen ? '收起完整技术资料' : '查看完整技术资料'}<ChevronRight className={"h-3.5 w-3.5 transition " + (detailsOpen ? 'rotate-90' : '')} /></button>{detailsOpen && <div className="space-y-2 border-t border-slate-100 pt-3">{card.sections.map((section) => <FullSection key={section.id} node={section} childrenMap={childrenMap} />)}</div>}</div>
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3"><button type="button" onClick={() => setDetailsOpen(true)} className="text-xs font-black text-emerald-700">查看该作物完整防治资料 →</button></div>
  </article>;
};

interface SourcePestGraphViewProps {
  crop?: Crop;
  crops?: Crop[];
  pests?: PestDiseaseItem[];
  initialCropId?: string | null;
}

export const SourcePestGraphView: React.FC<SourcePestGraphViewProps> = ({ crop, crops = [], pests = [], initialCropId }) => {
  const [nodes, setNodes] = useState<SourceNode[]>([]);
  const [assets, setAssets] = useState<SourceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('全部');
  const [search, setSearch] = useState('');
  const [selectedCropId, setSelectedCropId] = useState(crop?.id || initialCropId || 'all');
  const [lightbox, setLightbox] = useState<{ images: string[]; initialIndex: number; title: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/source-documents').then((response) => response.json() as Promise<{ documents?: Array<{ id: string }> }>).then((payload) => {
      const documentId = payload.documents?.[0]?.id;
      if (!documentId) return null;
      return fetch('/api/source-documents?id=' + encodeURIComponent(documentId) + '&limit=6000').then((response) => response.json() as Promise<{ nodes?: SourceNode[]; assets?: SourceAsset[] }>).then((data) => { if (!cancelled) { setNodes(data.nodes || []); setAssets(data.assets || []); } });
    }).catch(() => undefined).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setCategoryFilter('全部'); setSearch(''); setSelectedCropId(crop?.id || initialCropId || 'all'); }, [crop?.id, initialCropId]);
  const selectedCrop = crop || crops.find((item) => item.id === selectedCropId);
  const assetByUrl = useMemo(() => new Map(assets.map((asset) => [asset.source_url, asset.id])), [assets]);
  const resolveImage = (url: string) => { const assetId = assetByUrl.get(url); return assetId ? '/api/source-document-assets/' + encodeURIComponent(assetId) : url; };
  const matchedNodes = useMemo(() => nodes.filter((node) => node.source_kind === 'crop' && (!selectedCrop || cropMatches(selectedCrop, String(node.crop_label || '')))), [nodes, selectedCrop]);
  const childrenMap = useMemo(() => { const map = new Map<string, SourceNode[]>(); matchedNodes.forEach((node) => { if (!node.parent_id) return; map.set(node.parent_id, [...(map.get(node.parent_id) || []), node].sort((first, second) => (first.sort_order || 0) - (second.sort_order || 0))); }); return map; }, [matchedNodes]);
  const categories = useMemo(() => {
    const sourceCards = matchedNodes.filter((node) => node.depth === 3 && cleanText(node.text_content)).map((root) => { const parent = matchedNodes.find((node) => node.id === root.parent_id); return extractCard(root, categoryFor(parent?.text_content || root.text_content), childrenMap); });
    const standardCards = pests
      .filter((pest) => !selectedCrop || pest.cropId === selectedCrop.id || pest.cropIds?.includes(selectedCrop.id) || pest.isGeneralCrop)
      .map(standardCard);
    const sourceTitles = sourceCards.map((card) => normalize(card.title));
    const cards = [...sourceCards, ...standardCards.filter((card) => !sourceTitles.some((title) => title === normalize(card.title) || title.includes(normalize(card.title)) || normalize(card.title).includes(title)))];
    const grouped = new Map<string, PestCard[]>();
    cards.forEach((card) => grouped.set(card.category, [...(grouped.get(card.category) || []), card]));
    return CATEGORY_ORDER.filter((label) => grouped.has(label)).map((label) => ({ label, cards: grouped.get(label) || [] }));
  }, [childrenMap, matchedNodes]);
  const filteredCategories = useMemo(() => { const query = normalize(search); return categories.map((category) => ({ ...category, cards: category.cards.filter((card) => categoryFilter === '全部' || category.label === categoryFilter).filter((card) => !query || normalize(card.title + ' ' + card.symptoms + ' ' + card.cause + ' ' + card.prevention + ' ' + card.controls.map((control) => control.label).join(' ')).includes(query)) })).filter((category) => category.cards.length > 0); }, [categories, categoryFilter, search]);
  const totalCards = categories.reduce((sum, category) => sum + category.cards.length, 0);
  const totalImages = unique(categories.flatMap((category) => category.cards.flatMap((card) => card.images))).length;

  return <section className="overflow-hidden rounded-3xl border border-amber-200 bg-slate-100 shadow-sm"><div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-5 md:p-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><div className="flex items-center gap-2 text-xs font-black text-amber-700"><Sparkles className="h-4 w-4" />病虫害图谱</div><h2 className="mt-1 text-xl font-black text-slate-900">{selectedCrop?.name || '全部作物'} 病虫害资料卡</h2><p className="mt-1 max-w-4xl text-xs leading-6 text-slate-600">按作物、病害类别和病虫害问题整理为统一资料卡，图片与对应病虫害绑定；症状、原因、预防、防治和水肥协同内容均来自技术资料。</p></div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl border border-emerald-100 bg-white px-3 py-2"><div className="text-lg font-black text-emerald-700">{loading ? '…' : totalCards}</div><div className="text-[10px] font-bold text-slate-500">资料卡</div></div><div className="rounded-2xl border border-sky-100 bg-white px-3 py-2"><div className="text-lg font-black text-sky-700">{loading ? '…' : totalImages}</div><div className="text-[10px] font-bold text-slate-500">图片资源</div></div><div className="rounded-2xl border border-amber-100 bg-white px-3 py-2"><div className="text-lg font-black text-amber-700">{loading ? '…' : categories.length}</div><div className="text-[10px] font-bold text-slate-500">类别</div></div></div></div>{!crop && <div className="mt-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2"><button type="button" onClick={() => setSelectedCropId('all')} className={"shrink-0 rounded-xl px-3 py-2 text-xs font-black " + (selectedCropId === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700')}>全部作物</button>{crops.map((item) => <button type="button" key={item.id} onClick={() => setSelectedCropId(item.id)} className={"shrink-0 rounded-xl px-3 py-2 text-xs font-bold " + (selectedCropId === item.id ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-emerald-50')}>{item.name}</button>)}</div>}<div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索当前作物的病害、虫害、症状或用药" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>}</div></div><div className="mt-3 flex flex-wrap gap-1.5"><button type="button" onClick={() => setCategoryFilter('全部')} className={"rounded-xl px-3 py-1.5 text-xs font-bold " + (categoryFilter === '全部' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')}>全部 ({totalCards})</button>{categories.map((category) => <button type="button" key={category.label} onClick={() => setCategoryFilter(category.label)} className={"rounded-xl px-3 py-1.5 text-xs font-bold " + (categoryFilter === category.label ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')}>{category.label} ({category.cards.length})</button>)}</div></div><div className="p-5 md:p-6">{loading && <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-sm font-bold text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin text-emerald-600" />正在生成该作物的图文资料卡片…</div>}{!loading && !matchedNodes.length && <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">该作物暂未匹配到导入资料。</div>}{!loading && matchedNodes.length > 0 && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredCategories.flatMap((category) => category.cards).map((card) => <PestCardView key={card.id} card={card} crop={selectedCrop} childrenMap={childrenMap} resolveImage={resolveImage} onOpenImages={(images, index, title) => setLightbox({ images, initialIndex: index, title })} />)}</div>}{!loading && !filteredCategories.length && matchedNodes.length > 0 && <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500">没有找到匹配的资料卡。</div>}</div></section>;
};
