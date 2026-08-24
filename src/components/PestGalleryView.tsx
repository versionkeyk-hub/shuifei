import React, { useEffect, useMemo, useState } from 'react';
import {
  Bug,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Copy,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  Maximize2,
  Eye,
  Tag,
  Check,
  RotateCcw,
  CheckSquare,
  Square,
  ShieldAlert,
  Sprout
} from 'lucide-react';
import { PestDiseaseItem, Crop, AppUser, PestCategoryGroup, CropCategory } from '../types';
import { CascadingCropFilter } from './CascadingCropFilter';
import { MultiImageUploader } from './MultiImageUploader';
import { ImageLightboxModal } from './ImageLightboxModal';

interface PestGalleryViewProps {
  pests: PestDiseaseItem[];
  crops: Crop[];
  currentUser: AppUser | null;
  onSelectCrop: (cropId: string, tab?: 'scheme' | 'pest') => void;
  onAddPest: (newPest: PestDiseaseItem) => void;
  onUpdatePest: (updatedPest: PestDiseaseItem) => void;
  onDeletePest: (pestId: string) => void;
  onOpenLocalImport: () => void;
  onOpenPesticideMixing?: (component: string) => void;
}

export const PEST_CATEGORIES: string[] = [
  '真菌性病害（高等真菌）',
  '真菌性病害（低等真菌）',
  '细菌性病害',
  '病毒病',
  '线虫病',
  '虫害',
  '生理性病害',
  '药害与肥害',
  '环境与灾害胁迫',
];

type SourceNode = { id: string; parent_id?: string | null; depth: number; text_content: string; image_urls: string[]; source_kind?: string; crop_label?: string; source_path?: string };
type SourceAsset = { id: string; source_url: string; status: string };

const SourceKnowledgePanel: React.FC<{ crop?: Crop; nodes: SourceNode[]; assets: SourceAsset[]; loading: boolean }> = ({ crop, nodes, assets, loading }) => {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; initialIndex: number; title: string } | null>(null);
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const assetByUrl = useMemo(() => new Map(assets.map((asset) => [asset.source_url, asset])), [assets]);
  const matches = useMemo(() => {
    if (!crop) return [];
    const aliases: Record<string, string[]> = { '柑橘橙柚': ['柑橘', '橙', '柚'], '番茄（西红柿）': ['番茄', '西红柿'], '辣椒（朝天椒、甜椒）': ['辣椒'], '黄瓜（青瓜、刺黄瓜）': ['黄瓜', '青瓜'], '番石榴（芭乐）': ['番石榴', '芭乐'], '桃树': ['桃'] };
    const names = [crop.name, ...(crop.aliases || []), ...(aliases[crop.name] || [])].map((value) => String(value).replace(/[\s·.。()（）_-]/g, '').toLowerCase()).filter((value) => value.length >= 2);
    return nodes.filter((node) => {
      const path: string[] = [];
      let current: SourceNode | undefined = node;
      while (current) {
        path.push(current.text_content || '');
        current = current.parent_id ? byId.get(current.parent_id) : undefined;
      }
      const text = path.join(' ').replace(/[\s·.。()（）_-]/g, '').toLowerCase();
      const explicitCrop = String(node.crop_label || '').replace(/[\s·.。()（）_-]/g, '').toLowerCase();
      return (Boolean(explicitCrop) && names.some((name) => explicitCrop.includes(name) || name.includes(explicitCrop))) || (node.source_kind === 'crop' && names.some((name) => text.includes(name))) || (names.some((name) => text.includes(name)) && !/农药分类|农药禁用|农药知识/.test(text));
    });
  }, [byId, crop, nodes]);
  const visible = expanded ? matches : [...matches.filter((node) => node.image_urls.length > 0).slice(0, 12), ...matches.filter((node) => node.image_urls.length === 0).slice(0, 12)];
  if (!crop) return null;
  return <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm md:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs font-black text-amber-700">作物病虫害资料</div><h2 className="mt-1 text-lg font-black text-slate-900">{crop.name}的图文资料</h2><p className="mt-1 text-xs leading-5 text-slate-600">原始技术资料已按作物归入图谱，文字和图片均保留；点击图片可放大查看。</p></div>
      <div className="flex items-center gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-800">{matches.length} 条资料</span>{matches.length > 24 && <button type="button" onClick={() => setExpanded((value) => !value)} className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white">{expanded ? '收起资料' : '展开全部'}</button>}</div>
    </div>
    <div className="mt-4 space-y-3">{loading && <div className="rounded-xl bg-white p-5 text-center text-xs text-slate-500">正在加载原始图文资料…</div>}{!loading && !matches.length && <div className="rounded-xl bg-white p-5 text-center text-xs text-slate-500">该作物暂未匹配到导入资料，可在后台继续补充。</div>}{visible.map((node) => <article key={node.id} className="rounded-2xl border border-amber-100 bg-white p-4"><div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{node.text_content || '图文资料'}</div>{node.image_urls.length > 0 && <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{node.image_urls.map((url) => { const asset = assetByUrl.get(url); const src = asset ? '/api/source-document-assets/' + encodeURIComponent(asset.id) : url; return <button type="button" key={url} onClick={() => setLightbox({ images: [src], initialIndex: 0, title: crop.name + '病虫害资料' })} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1"><img src={src} alt={crop.name + '病虫害资料'} loading="lazy" className="h-36 w-full object-contain" /></button>; })}</div>}</article>)}</div>
    {lightbox && <ImageLightboxModal images={lightbox.images} initialIndex={lightbox.initialIndex} title={lightbox.title} onClose={() => setLightbox(null)} />}
  </section>;
};

// 3-Tier Categorization Definition
export interface CategoryFilterItem {
  id: string;
  label: string;
  shortLabel?: string;
  groupType: 'disease' | 'pest' | 'other';
}

export const CATEGORY_TIERS = {
  // Row 1: 病害类
  diseases: [
    { id: 'all_disease', label: '全部病害', shortLabel: '全病害' },
    { id: '真菌性病害（高等真菌）', label: '真菌性病害（高等真菌）', shortLabel: '高等真菌' },
    { id: '真菌性病害（低等真菌）', label: '真菌性病害（低等真菌）', shortLabel: '低等真菌' },
    { id: '细菌性病害', label: '细菌性病害', shortLabel: '细菌病' },
    { id: '病毒病', label: '病毒病', shortLabel: '病毒病' },
    { id: '线虫病', label: '线虫病', shortLabel: '线虫病' },
  ],
  // Row 2: 虫害类
  pests: [
    { id: 'all_pest', label: '全部虫害', shortLabel: '全虫害' },
    { id: 'sucking_pest', label: '刺吸式口器害虫（蚜虫/蓟马/粉虱/木虱）', shortLabel: '刺吸害虫 (蚜/蓟/粉/木)' },
    { id: 'chewing_pest', label: '咀嚼式害虫（菜青虫/夜蛾/潜叶蝇/食心虫）', shortLabel: '咀嚼害虫 (青虫/夜蛾/潜叶)' },
    { id: 'mite_pest', label: '螨类害螨（红蜘蛛/白蜘蛛/锈壁虱）', shortLabel: '害螨类 (红白蜘蛛/锈壁虱)' },
    { id: 'underground_pest', label: '地下害虫（蛴螬/蝼蛄/金针虫/地老虎）', shortLabel: '地下害虫 (蛴螬/蝼蛄/金针)' },
  ],
  // Row 3: 其他综合问题与草害
  others: [
    { id: 'weed_control', label: '农田草害防治（禾本科/阔叶/莎草）', shortLabel: '农田草害防治' },
    { id: 'deficiency', label: '生理性病害/缺素症（黄化/脐腐/日灼）', shortLabel: '生理性缺素障碍' },
    { id: 'chem_damage', label: '药害与肥害（除草剂/烧根/盐渍化）', shortLabel: '农药/肥料危害' },
    { id: 'weather_stress', label: '气象与环境灾害胁迫（冻害/高温/涝旱）', shortLabel: '气象与逆境胁迫' },
  ],
};

export const PestGalleryView: React.FC<PestGalleryViewProps> = ({
  pests,
  crops,
  currentUser,
  onSelectCrop,
  onAddPest,
  onUpdatePest,
  onDeletePest,
  onOpenLocalImport,
  onOpenPesticideMixing,
}) => {
  const [selectedCropId, setSelectedCropId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceNodes, setSourceNodes] = useState<SourceNode[]>([]);
  const [sourceAssets, setSourceAssets] = useState<SourceAsset[]>([]);
  const [sourceLoading, setSourceLoading] = useState(true);

  useEffect(() => {
    fetch('/api/source-documents')
      .then((response) => response.json())
      .then((payload: { documents?: Array<{ id: string }> }) => {
        const documentId = payload.documents?.[0]?.id;
        if (!documentId) return null;
        return fetch('/api/source-documents?id=' + encodeURIComponent(documentId) + '&limit=6000')
          .then((response) => response.json())
          .then((data: { nodes?: SourceNode[]; assets?: SourceAsset[] }) => {
            setSourceNodes(data.nodes || []);
            setSourceAssets(data.assets || []);
          });
      })
      .catch(() => undefined)
      .finally(() => setSourceLoading(false));
  }, []);

  // Hover collage preview
  const [hoveredPestId, setHoveredPestId] = useState<string | null>(null);

  // Lightbox Modal state with multi-image gallery support
  const [lightboxData, setLightboxData] = useState<{
    images: string[];
    initialIndex: number;
    title: string;
  } | null>(null);

  // Edit / Add Modal state
  const [editingPest, setEditingPest] = useState<PestDiseaseItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'expert';

  const isFiltering = searchQuery.trim() !== '' || selectedCropId !== 'all' || selectedCategory !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCropId('all');
    setSelectedCategory('all');
  };

  // Detailed matcher for selected category
  const matchesCategory = (pest: PestDiseaseItem, catKey: string): boolean => {
    if (catKey === 'all') return true;
    
    if (catKey === 'all_disease') {
      return (
        pest.type === '病害' ||
        Boolean(pest.categoryGroup?.includes('真菌')) ||
        Boolean(pest.categoryGroup?.includes('细菌')) ||
        Boolean(pest.categoryGroup?.includes('病毒')) ||
        Boolean(pest.categoryGroup?.includes('线虫'))
      );
    }
    
    if (catKey === 'all_pest') {
      return (
        pest.type === '虫害' ||
        Boolean(pest.categoryGroup?.includes('虫')) ||
        Boolean(pest.categoryGroup?.includes('螨')) ||
        /虫|螨|蚜|蓟马|粉虱|木虱|盲蝽|青虫|夜蛾|潜叶|食心|红蜘蛛|白蜘蛛|锈壁虱|蛴螬|蝼蛄|金针虫|地老虎/.test(
          pest.name + (pest.categoryGroup || '') + pest.symptoms
        )
      );
    }
    
    if (catKey === 'sucking_pest') {
      return (
        Boolean(pest.categoryGroup?.includes('刺吸')) ||
        /蚜|蓟马|粉虱|木虱|盲蝽|叶蝉|介壳虫|飞虱|粉蚧/.test(pest.name + (pest.categoryGroup || '') + pest.symptoms)
      );
    }
    
    if (catKey === 'chewing_pest') {
      return (
        Boolean(pest.categoryGroup?.includes('咀嚼')) ||
        /青虫|夜蛾|潜叶|食心|甲虫|螟虫|卷叶|跳甲|象甲|天牛/.test(pest.name + (pest.categoryGroup || '') + pest.symptoms)
      );
    }
    
    if (catKey === 'mite_pest') {
      return (
        Boolean(pest.categoryGroup?.includes('螨')) ||
        /红蜘蛛|白蜘蛛|锈壁虱|二斑叶螨|茶黄螨|全爪螨|瘿螨/.test(pest.name + (pest.categoryGroup || '') + pest.symptoms)
      );
    }
    
    if (catKey === 'underground_pest') {
      return (
        Boolean(pest.categoryGroup?.includes('地下')) ||
        /蛴螬|蝼蛄|金针虫|地老虎|根蛆|根线虫|根结线虫/.test(pest.name + (pest.categoryGroup || '') + pest.symptoms)
      );
    }
    
    if (catKey === 'weed_control') {
      return (
        Boolean(pest.categoryGroup?.includes('草')) ||
        Boolean(pest.type?.includes('草')) ||
        /草害|杂草|阔叶草|禾本科|莎草|除草/.test(pest.name + (pest.categoryGroup || '') + pest.symptoms)
      );
    }
    
    if (catKey === 'deficiency') {
      return (
        Boolean(pest.categoryGroup?.includes('生理')) ||
        /生理|缺素|黄化|脐腐|日灼|裂果|筋腐|落花落果|小叶/.test(pest.name + (pest.categoryGroup || '') + pest.symptoms)
      );
    }
    
    if (catKey === 'chem_damage') {
      return (
        Boolean(pest.categoryGroup?.includes('药害')) ||
        /药害|肥害|烧根|烧苗|盐渍化|除草剂漂移/.test(pest.name + (pest.categoryGroup || '') + pest.symptoms)
      );
    }
    
    if (catKey === 'weather_stress') {
      return (
        Boolean(pest.categoryGroup?.includes('环境')) ||
        /冻害|冷害|热害|高温|涝害|干旱|灾害|风害|雹灾|逆境/.test(pest.name + (pest.categoryGroup || '') + pest.symptoms)
      );
    }

    return pest.categoryGroup === catKey || pest.type === catKey;
  };

  const filteredPests = pests.filter((pest) => {
    // Crop matching: support specific cropId, multiple cropIds array, or universal/general crop
    let matchCrop = true;
    if (selectedCropId === 'general') {
      matchCrop = Boolean(pest.isGeneralCrop || pest.cropName === '通用' || pest.cropId === 'general');
    } else if (selectedCropId !== 'all') {
      matchCrop =
        pest.cropId === selectedCropId ||
        Boolean(pest.cropIds && pest.cropIds.includes(selectedCropId)) ||
        Boolean(pest.isGeneralCrop);
    }

    const matchCategory = matchesCategory(pest, selectedCategory);

    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      pest.name.toLowerCase().includes(q) ||
      pest.cropName.toLowerCase().includes(q) ||
      (pest.cropNames && pest.cropNames.some((cn) => cn.toLowerCase().includes(q))) ||
      pest.symptoms.toLowerCase().includes(q) ||
      pest.chemicalControl.some((c) => c.formulaName.toLowerCase().includes(q));

    return matchCrop && matchCategory && matchSearch;
  });

  // Calculate count for a category pill under current crop filter
  const getCategoryCount = (catId: string): number => {
    return pests.filter((p) => {
      let matchCrop = true;
      if (selectedCropId === 'general') {
        matchCrop = Boolean(p.isGeneralCrop || p.cropName === '通用' || p.cropId === 'general');
      } else if (selectedCropId !== 'all') {
        matchCrop =
          p.cropId === selectedCropId ||
          Boolean(p.cropIds && p.cropIds.includes(selectedCropId)) ||
          Boolean(p.isGeneralCrop);
      }
      return matchCrop && matchesCategory(p, catId);
    }).length;
  };

  const handleSavePest = () => {
    if (!editingPest) return;
    if (!editingPest.name.trim()) {
      alert('请填写病虫害名称');
      return;
    }
    const isNew = !pests.some((p) => p.id === editingPest.id);
    const updated = {
      ...editingPest,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    if (isNew) {
      onAddPest(updated);
    } else {
      onUpdatePest(updated);
    }
    setIsEditModalOpen(false);
    setEditingPest(null);
  };

  // Helper for toggle multi-crop selection in edit modal
  const handleToggleCropInEdit = (c: Crop) => {
    if (!editingPest) return;
    const currentCropIds = editingPest.cropIds || (editingPest.cropId ? [editingPest.cropId] : []);
    const currentCropNames = editingPest.cropNames || (editingPest.cropName ? [editingPest.cropName] : []);
    
    let newCropIds: string[];
    let newCropNames: string[];

    if (currentCropIds.includes(c.id)) {
      newCropIds = currentCropIds.filter((id) => id !== c.id);
      newCropNames = currentCropNames.filter((name) => name !== c.name);
    } else {
      newCropIds = [...currentCropIds, c.id];
      newCropNames = [...currentCropNames, c.name];
    }

    const primaryCropId = newCropIds[0] || (crops[0]?.id || '');
    const primaryCropName = newCropNames[0] || (crops[0]?.name || '');

    setEditingPest({
      ...editingPest,
      cropId: primaryCropId,
      cropName: primaryCropName,
      cropIds: newCropIds,
      cropNames: newCropNames,
      isGeneralCrop: false,
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg flex items-center gap-1">
              <Bug className="w-3.5 h-3.5 text-amber-700" />
              <span>全作物病虫害防治总图谱</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              收录 {pests.length} 种典型病虫草害档案
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            病虫草害图谱与水肥药协同解决方案
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            支持病状特征多图对比识别、真菌/细菌/病毒分类归属、跨作物多重关联及水肥协同抗逆技术。
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <>
              <button
                onClick={onOpenLocalImport}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>离线识别录入</span>
              </button>

              <button
                onClick={() => {
                  setEditingPest({
                    id: `pest-gen-${Date.now()}`,
                    cropId: crops[0]?.id || 'crop-1',
                    cropName: crops[0]?.name || '哈密瓜',
                    cropIds: [crops[0]?.id || 'crop-1'],
                    cropNames: [crops[0]?.name || '哈密瓜'],
                    isGeneralCrop: false,
                    name: '',
                    type: '病害',
                    categoryGroup: '真菌性病害（高等真菌）',
                    dangerLevel: '中度危害',
                    symptoms: '',
                    occurrencePeriod: '',
                    occurrenceRules: '',
                    agriculturalControl: '',
                    chemicalControl: [
                      {
                        id: `f-${Date.now()}-1`,
                        formulaName: '苯醚甲环唑·嘧菌酯',
                        dosageRate: '1500倍液',
                        timing: '发病初期',
                      }
                    ],
                    fertilizerSynergy: '随水冲施傲生菌剂，叶面喷施糖醇钙与氨基酸水溶肥增强表皮韧性。',
                    keyNotes: '',
                    images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'],
                    updatedAt: new Date().toISOString().slice(0, 10),
                  });
                  setIsEditModalOpen(true);
                }}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>新建病虫档案</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-6">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索病害名称、关联作物、症状特征或农药配方..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-hidden focus:border-amber-500 focus:bg-white transition-all font-medium text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                title="清空关键词"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cascading Two-Level Crop Selector (Supports hover expanding to crops list) */}
          <div className="md:col-span-6">
            <CascadingCropFilter
              crops={crops}
              selectedCropId={selectedCropId}
              onChangeCropId={setSelectedCropId}
            />
          </div>
        </div>

        {/* 3-Row Structured Shortcut Category Filter Matrix */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          {/* Header & Reset bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-800">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>快捷分类导航</span>
              <span className="text-[10px] text-slate-400 font-normal ml-1">
                (分病害、虫害、综合草害三层快速定位)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                全部大类 ({filteredPests.length})
              </button>

              {isFiltering && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-xl font-bold transition-colors cursor-pointer"
                  title="一键清空搜索词与筛选条件"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重置所有条件</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 1: 病害类 (Diseases) */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-rose-50/40 rounded-2xl border border-rose-100/80">
            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-lg shrink-0">
              🌿 病害防治
            </span>
            {CATEGORY_TIERS.diseases.map((cat) => {
              const count = getCategoryCount(cat.id);
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-rose-600 text-white shadow-2xs font-black ring-2 ring-rose-400/30'
                      : 'bg-white text-slate-700 hover:bg-rose-100/60 border border-slate-200/80'
                  }`}
                >
                  <span>{cat.shortLabel || cat.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded-full ${
                      isSelected ? 'bg-rose-700 text-rose-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 2: 虫害类 (Insects & Pests) */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-amber-50/40 rounded-2xl border border-amber-100/80">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-lg shrink-0">
              🐛 虫害防治
            </span>
            {CATEGORY_TIERS.pests.map((cat) => {
              const count = getCategoryCount(cat.id);
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-2xs font-black ring-2 ring-amber-400/30'
                      : 'bg-white text-slate-700 hover:bg-amber-100/60 border border-slate-200/80'
                  }`}
                >
                  <span>{cat.shortLabel || cat.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded-full ${
                      isSelected ? 'bg-amber-700 text-amber-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 3: 综合灾害与草害 (Weeds, Deficiency, Chemical & Weather) */}
          <div className="flex flex-wrap items-center gap-1.5 p-2 bg-emerald-50/40 rounded-2xl border border-emerald-100/80">
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg shrink-0">
              🌾 草害与逆境综合
            </span>
            {CATEGORY_TIERS.others.map((cat) => {
              const count = getCategoryCount(cat.id);
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-2xs font-black ring-2 ring-emerald-400/30'
                      : 'bg-white text-slate-700 hover:bg-emerald-100/60 border border-slate-200/80'
                  }`}
                >
                  <span>{cat.shortLabel || cat.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded-full ${
                      isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid of Pest Cards */}
      {filteredPests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <Bug className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">没有找到匹配的病虫害档案</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            尝试更换搜索词或重置筛选条件，或者点击右上角新建档案。
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-slate-800"
          >
            清除所有筛选条件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPests.map((pest) => {
            const primaryImg = pest.images[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80';
            const isHovered = hoveredPestId === pest.id;
            const pestImages = pest.images && pest.images.length > 0 ? pest.images : [primaryImg];

            return (
              <div
                key={pest.id}
                onMouseEnter={() => setHoveredPestId(pest.id)}
                onMouseLeave={() => setHoveredPestId(null)}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Photo Area with Lightbox click & Multi-image Collage hover */}
                  <div className="h-56 relative overflow-hidden bg-slate-900 cursor-pointer">
                    {/* If multiple images and hovered, show grid preview collage */}
                    {isHovered && pestImages.length > 1 ? (
                      <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-0.5 p-0.5 bg-black animate-in fade-in duration-200">
                        {pestImages.slice(0, 4).map((img, imgIdx) => (
                          <div
                            key={imgIdx}
                            onClick={() =>
                              setLightboxData({
                                images: pestImages,
                                initialIndex: imgIdx,
                                title: `${pest.name} (${pest.cropName || '通用'})`,
                              })
                            }
                            className="relative overflow-hidden group/img hover:opacity-90"
                          >
                            <img
                              src={img}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1 right-1 px-1 bg-black/70 text-white text-[9px] rounded font-mono">
                              {imgIdx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <img
                        src={primaryImg}
                        alt={pest.name}
                        referrerPolicy="no-referrer"
                        onClick={() =>
                          setLightboxData({
                            images: pestImages,
                            initialIndex: 0,
                            title: `${pest.name} (${pest.cropName || '通用'})`,
                          })
                        }
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />

                    {/* Crop & Category Tags */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none max-w-[75%]">
                      {pest.isGeneralCrop ? (
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-blue-600/90 backdrop-blur-xs text-white">
                          通用跨作物病害
                        </span>
                      ) : pest.cropNames && pest.cropNames.length > 1 ? (
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-black/60 backdrop-blur-xs text-white truncate">
                          {pest.cropNames.slice(0, 2).join(' / ')} {pest.cropNames.length > 2 ? `+${pest.cropNames.length - 2}` : ''}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-black/60 backdrop-blur-xs text-white">
                          {pest.cropName || '通用'}
                        </span>
                      )}

                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/90 backdrop-blur-xs text-white">
                        {pest.categoryGroup || pest.type}
                      </span>
                    </div>

                    {/* Top Right Action Buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxData({
                            images: pestImages,
                            initialIndex: 0,
                            title: `${pest.name} (${pest.cropName || '通用'})`,
                          });
                        }}
                        className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl shadow-md transition-transform hover:scale-110"
                        title="点击进入全屏画廊查看"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPest(JSON.parse(JSON.stringify(pest)));
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-xl shadow-md transition-transform hover:scale-110"
                            title="编辑病虫害档案"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`确定删除病害「${pest.name}」吗？`)) {
                                onDeletePest(pest.id);
                              }
                            }}
                            className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl shadow-md transition-transform hover:scale-110"
                            title="删除病虫害"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Title & Danger level on banner */}
                    <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                      <h3 className="text-base font-black flex items-center justify-between">
                        <span>{pest.name}</span>
                        <span className="text-[11px] px-2 py-0.5 bg-red-600/80 backdrop-blur-xs rounded-md font-bold">
                          {pest.dangerLevel}
                        </span>
                      </h3>
                    </div>
                  </div>

                  {/* Multiple images thumbnail strip */}
                  {pestImages.length > 1 && (
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
                      <span className="text-[10px] text-slate-400 font-bold shrink-0">图谱图集 ({pestImages.length}):</span>
                      {pestImages.map((imgUrl, imgIdx) => (
                        <div
                          key={imgIdx}
                          onClick={() =>
                            setLightboxData({
                              images: pestImages,
                              initialIndex: imgIdx,
                              title: `${pest.name} - 图${imgIdx + 1}`,
                            })
                          }
                          className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:border-amber-500 cursor-pointer transition-all hover:scale-105"
                        >
                          <img
                            src={imgUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Card Body Info */}
                  <div className="p-4 space-y-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 block mb-0.5">识别特征与危害症状:</span>
                      <p className="text-slate-600 line-clamp-3 leading-relaxed">
                        {pest.symptoms}
                      </p>
                    </div>

                    {/* Multi-crop linked badges if available */}
                    {pest.cropNames && pest.cropNames.length > 1 && (
                      <div>
                        <span className="font-bold text-slate-500 block mb-1 text-[11px]">适用/危害寄主作物:</span>
                        <div className="flex flex-wrap gap-1">
                          {pest.cropNames.map((cn, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium">
                              {cn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="font-bold text-slate-700 block mb-1">推荐化学防效用药:</span>
                      <div className="space-y-1">
                        {pest.chemicalControl.slice(0, 2).map((c) => (
                          <div
                            key={c.id}
                            className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] flex items-center justify-between"
                          >
                            {onOpenPesticideMixing ? <button type="button" onClick={() => onOpenPesticideMixing(c.formulaName)} className="font-medium text-left text-emerald-700 underline decoration-dotted underline-offset-2" title="打开产品混配性查询">{c.formulaName}</button> : <span className="font-medium text-slate-800">{c.formulaName}</span>}
                            <span className="text-amber-700 font-mono font-bold">{c.dosageRate}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {pest.fertilizerSynergy && (
                      <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 text-[11px] text-emerald-800">
                        <strong className="block text-emerald-900 font-semibold mb-0.5">水肥协同抗逆技术:</strong>
                        {pest.fertilizerSynergy}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  {pest.cropId && pest.cropId !== 'general' && !pest.isGeneralCrop ? (
                    <button
                      onClick={() => onSelectCrop(pest.cropId, 'scheme')}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline"
                    >
                      <span>查看该作物全周期方案</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      通用跨作物档案
                    </span>
                  )}

                  <button
                    onClick={() =>
                      setLightboxData({
                        images: pestImages,
                        initialIndex: 0,
                        title: pest.name,
                      })
                    }
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                    title="画廊全屏查看"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit / Add Pest Modal */}
      {isEditModalOpen && editingPest && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-600" />
                <span>{editingPest.name ? `编辑档案：${editingPest.name}` : '新建病虫害防治档案'}</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Crop Association Options (Multi-crop or General) */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 block">作物归属关联 *</label>
                  <label className="flex items-center gap-1.5 text-xs text-blue-700 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingPest.isGeneralCrop)}
                      onChange={(e) => {
                        const isGen = e.target.checked;
                        setEditingPest({
                          ...editingPest,
                          isGeneralCrop: isGen,
                          cropName: isGen ? '通用' : (crops[0]?.name || '哈密瓜'),
                          cropId: isGen ? 'general' : (crops[0]?.id || 'crop-1'),
                        });
                      }}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span>设为通用跨作物病虫害 (不限具体单一作物)</span>
                  </label>
                </div>

                {!editingPest.isGeneralCrop && (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] text-slate-500 block">
                      勾选该病害适用的作物 (可多选，已选 {(editingPest.cropIds || [editingPest.cropId]).length} 种):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                      {crops.map((c) => {
                        const isChecked =
                          editingPest.cropIds?.includes(c.id) ||
                          editingPest.cropId === c.id;
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => handleToggleCropInEdit(c)}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left transition-colors ${
                              isChecked
                                ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">病虫害名称 *</label>
                  <input
                    type="text"
                    value={editingPest.name}
                    onChange={(e) => setEditingPest({ ...editingPest, name: e.target.value })}
                    placeholder="如: 白粉病 / 蓟马"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">分类归属 *</label>
                  <select
                    value={editingPest.categoryGroup || editingPest.type}
                    onChange={(e) =>
                      setEditingPest({
                        ...editingPest,
                        categoryGroup: e.target.value as PestCategoryGroup,
                        type: e.target.value,
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
                  >
                    {PEST_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">危害程度</label>
                  <select
                    value={editingPest.dangerLevel}
                    onChange={(e) => setEditingPest({ ...editingPest, dangerLevel: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold"
                  >
                    <option value="低度危害">低度危害</option>
                    <option value="中度危害">中度危害</option>
                    <option value="严重危害">严重危害</option>
                    <option value="爆发性毁灭">爆发性毁灭</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">症状识别特征</label>
                <textarea
                  value={editingPest.symptoms}
                  onChange={(e) => setEditingPest({ ...editingPest, symptoms: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  placeholder="叶片正面、背面症状，发病规律及典型表现..."
                />
              </div>

              {/* Chemical control items */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">推荐化学防效用药</label>
                <div className="space-y-2">
                  {editingPest.chemicalControl.map((chem, idx) => (
                    <div key={chem.id || idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={chem.formulaName}
                        onChange={(e) => {
                          const updated = [...editingPest.chemicalControl];
                          updated[idx].formulaName = e.target.value;
                          setEditingPest({ ...editingPest, chemicalControl: updated });
                        }}
                        placeholder="农药有效成分/配方名"
                        className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={chem.dosageRate}
                        onChange={(e) => {
                          const updated = [...editingPest.chemicalControl];
                          updated[idx].dosageRate = e.target.value;
                          setEditingPest({ ...editingPest, chemicalControl: updated });
                        }}
                        placeholder="稀释倍数 / 亩用量"
                        className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                      <input
                        type="text"
                        value={chem.timing}
                        onChange={(e) => {
                          const updated = [...editingPest.chemicalControl];
                          updated[idx].timing = e.target.value;
                          setEditingPest({ ...editingPest, chemicalControl: updated });
                        }}
                        placeholder="施用时机 (如发病初期)"
                        className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">水肥协同抗逆技术</label>
                <textarea
                  value={editingPest.fertilizerSynergy}
                  onChange={(e) => setEditingPest({ ...editingPest, fertilizerSynergy: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  placeholder="配合抗逆微生物菌剂、叶面钙镁微肥提高植株免疫力..."
                />
              </div>

              {/* Multiple Images Uploader with 1st Cover and Batch Add */}
              <div className="pt-2 border-t border-slate-100">
                <MultiImageUploader
                  images={editingPest.images || []}
                  onChange={(nextImages) => {
                    setEditingPest({
                      ...editingPest,
                      images: nextImages,
                    });
                  }}
                  onPreviewOriginal={(url, idx) => {
                    setLightboxData({
                      images: editingPest.images || [url],
                      initialIndex: idx,
                      title: `${editingPest.name || '病虫害'} - 高清实拍图`,
                    });
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSavePest}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md"
              >
                保存病虫害档案
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Image Lightbox Modal */}
      {lightboxData && (
        <ImageLightboxModal
          images={lightboxData.images}
          initialIndex={lightboxData.initialIndex}
          title={lightboxData.title}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
};
