import React from 'react';
import {
  FileSpreadsheet,
  Bug,
  Sprout,
  Package,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  Award,
  BookOpen
} from 'lucide-react';
import { Crop, CropCategory, FertilizationScheme, PestDiseaseItem } from '../types';
import { EditableText, EditableImage } from '../context/VisualEditContext';
import { CatalogStats } from './ProductLibraryView';

interface DashboardViewProps {
  crops: Crop[];
  categories: CropCategory[];
  schemes: FertilizationScheme[];
  pests: PestDiseaseItem[];
  fertilizerProductsCount?: number;
  catalogStats?: CatalogStats;
  onSelectCrop: (cropId: string, tab?: 'scheme' | 'pest') => void;
  onOpenNewScheme?: () => void;
  onOpenQuickAI?: () => void;
  onOpenExportStudio: () => void;
  onOpenProductQuiz?: () => void;
  onNavigateToPests?: () => void;
  onNavigateToSchemes?: () => void;
  onNavigateToCrops?: () => void;
  onNavigateToProductLibrary?: () => void;
  onOpenLocalImport?: () => void;
  onOpenCommunity?: () => void;
  currentUser?: any;
  settings?: any;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  crops,
  categories,
  schemes,
  pests,
  fertilizerProductsCount = 31,
  catalogStats,
  onSelectCrop,
  onOpenNewScheme,
  onOpenQuickAI,
  onOpenExportStudio,
  onOpenProductQuiz,
  onNavigateToPests,
  onNavigateToSchemes,
  onNavigateToCrops,
  onNavigateToProductLibrary,
}) => {
  const activeSchemes = schemes.filter((s) => !s.isDeleted);
  const totalSchemes = activeSchemes.length;
  const totalPests = pests.length;
  const totalCrops = crops.length;

  const handleCropsClick = () => {
    if (onNavigateToCrops) {
      onNavigateToCrops();
    } else if (crops.length > 0) {
      onSelectCrop(crops[0].id, 'scheme');
    }
  };

  const handleSchemesClick = () => {
    if (onNavigateToSchemes) {
      onNavigateToSchemes();
    } else if (crops.length > 0) {
      onSelectCrop(crops[0].id, 'scheme');
    }
  };

  // Category stats calculation dynamically aligned with actual schemes and pests
  const categoryStats = categories.map((cat) => {
    const catCrops = crops.filter((c) => c.categoryId === cat.id);
    const catCropIds = catCrops.map((c) => c.id);
    const catSchemes = activeSchemes.filter((s) => catCropIds.includes(s.cropId));
    const catPests = pests.filter(
      (p) =>
        catCropIds.includes(p.cropId) ||
        (p.cropIds && p.cropIds.some((id) => catCropIds.includes(id)))
    );

    return {
      ...cat,
      cropsCount: catCrops.length,
      schemesCount: catSchemes.length,
      pestsCount: catPests.length,
      crops: catCrops,
    };
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <EditableText
              textKey="banner_badge"
              defaultText="惠民皓天数字化植保与水肥一体化技术中枢"
            />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            <EditableText
              textKey="banner_title"
              defaultText="作物水肥全周期方案·精准病虫害图谱·实训中心"
            />
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            <EditableText
              textKey="banner_subtitle"
              defaultText="覆盖各大类作物水肥配方表、生育物候调控要点、高低等真菌与虫害精准图谱及肥料 5 维属性分类实训。"
              multiline
            />
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          {onOpenProductQuiz && (
            <button
              type="button"
              onClick={onOpenProductQuiz}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs md:text-sm font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>产品分类实训</span>
            </button>
          )}
          {onOpenQuickAI && (
            <button
              type="button"
              onClick={onOpenQuickAI}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-semibold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI 识别录入</span>
            </button>
          )}
          {onOpenNewScheme && (
            <button
              type="button"
              onClick={onOpenNewScheme}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>新建方案</span>
            </button>
          )}
        </div>

        {/* Decorative background grid pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      </div>

      {/* Core Real-time Metric Scoreboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Fertilization Schemes Count */}
        <div
          onClick={handleSchemesClick}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="点击查看全部作物与水肥方案"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              <EditableText textKey="stat_schemes_label" defaultText="水肥一体化方案" />
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalSchemes}</span>
            <span className="text-xs text-slate-500 font-semibold">套已建档</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <EditableText textKey="stat_schemes_sub" defaultText="全周期/滴灌/冲施/叶面多阶段" />
          </div>
        </div>

        {/* Metric 2: Pest & Disease Solutions Count */}
        <div
          onClick={onNavigateToPests}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-500 hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="点击进入病虫害图谱库"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              <EditableText textKey="stat_pests_label" defaultText="病虫害防治图谱" />
            </span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition-colors">
              <Bug className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalPests}</span>
            <span className="text-xs text-slate-500 font-semibold">个病害图谱</span>
          </div>
          <div className="mt-2 text-xs text-amber-600 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <EditableText textKey="stat_pests_sub" defaultText="含真菌/细菌/病毒/虫害大类归属" />
          </div>
        </div>

        {/* Metric 3: Total Crops Count */}
        <div
          onClick={handleCropsClick}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-blue-500 hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="点击查看已建档作物列表"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              <EditableText textKey="stat_crops_label" defaultText="收录作物建档" />
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
              <Sprout className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalCrops}</span>
            <span className="text-xs text-slate-500 font-semibold">种重点作物</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 flex items-center gap-1 font-medium">
            <Layers className="w-3.5 h-3.5" />
            <EditableText textKey="stat_crops_sub" defaultText="瓜果/果树/热带/蔬菜/粮油根茎" />
          </div>
        </div>

        {/* Metric 4: Total Fertilizer Products Count */}
        <div
          onClick={onNavigateToProductLibrary || onOpenProductQuiz}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-purple-500 hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="点击进入产品资料库"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              <EditableText textKey="stat_products_label" defaultText="产品 / SKU / 农药资料库" />
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
              <Package className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{catalogStats?.products || fertilizerProductsCount}</span>
            <span className="text-xs text-slate-500 font-semibold">品 · {catalogStats?.skus || 320} 条 SKU</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <EditableText textKey="stat_products_sub" defaultText={(catalogStats?.pesticides || 74) + ' 种农药有效成分与混配规则'} />
          </div>
        </div>
      </div>

      {/* Category Resource Distribution Cards with Real Images */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>作物大类与精准方案收录明细</span>
          </h3>
          <span className="text-xs text-slate-400">点击任意作物快速进入专属水肥方案与病虫害详情</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryStats.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Category Card Header with Image */}
              <div className="relative h-28 w-full overflow-hidden bg-slate-100">
                <EditableImage
                  imageKey={`cat_img_${cat.id}`}
                  defaultSrc={
                    cat.image ||
                    'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&auto=format&fit=crop&q=80'
                  }
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between text-white pointer-events-none">
                  <span className="font-black text-sm tracking-wide drop-shadow-sm">
                    {cat.name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full">
                    {cat.cropsCount} 种作物
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>

                {/* Crop Badges in this category */}
                <div className="flex flex-wrap gap-1.5">
                  {cat.crops.length > 0 ? (
                    cat.crops.map((crop) => {
                      const cropSchemesCount = activeSchemes.filter(
                        (s) => s.cropId === crop.id
                      ).length;
                      return (
                        <button
                          key={crop.id}
                          type="button"
                          onClick={() => onSelectCrop(crop.id)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs rounded-xl transition-colors flex items-center gap-1 font-bold border border-emerald-200/60 cursor-pointer active:scale-95"
                          title={`点击查看 ${crop.name} 的水肥方案与病虫害图谱`}
                        >
                          <span>{crop.name}</span>
                          <span className="text-[10px] text-emerald-700">
                            ({cropSchemesCount}套)
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">暂无作物建档</span>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>
                    方案: <strong className="text-emerald-700 font-bold">{cat.schemesCount}</strong> 套
                  </span>
                  <span>
                    图谱: <strong className="text-slate-800 font-bold">{cat.pestsCount}</strong> 种
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Crop Schemes Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>全库作物方案与病虫害台账清单</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              点击作物名称直接进入专属施肥方案与图谱详情
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenExportStudio}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>进入多端导出中心</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-100/70 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">作物名称</th>
                <th className="py-3 px-4">所属大类</th>
                <th className="py-3 px-4">方案套数</th>
                <th className="py-3 px-4">病虫害档案</th>
                <th className="py-3 px-4">已收录方案标题</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {crops.map((crop) => {
                const cropSchemes = activeSchemes.filter((s) => s.cropId === crop.id);
                const cropPests = pests.filter(
                  (p) =>
                    p.cropId === crop.id ||
                    (p.cropIds && p.cropIds.includes(crop.id)) ||
                    p.isGeneralCrop
                );
                const cat = categories.find((c) => c.id === crop.categoryId);

                return (
                  <tr
                    key={crop.id}
                    className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                    onClick={() => onSelectCrop(crop.id)}
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{crop.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {cat?.name || '其他'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                        {cropSchemes.length} 套方案
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
                        {cropPests.length} 种图谱
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                      {cropSchemes.map((s) => s.title).join('、') || '暂无方案'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCrop(crop.id);
                        }}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors inline-flex items-center gap-1 font-bold text-xs cursor-pointer"
                      >
                        <span>查看方案</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
