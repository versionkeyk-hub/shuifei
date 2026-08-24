import React, { useState, useRef, useEffect } from 'react';
import { Search, LogIn, X, Sprout, Bug, FileText, ArrowRight } from 'lucide-react';
import { AppUser, Crop, FertilizationScheme, PestDiseaseItem, GlobalSearchResult, NavTab, SystemSettings } from '../types';

interface HeaderProps {
  currentUser: AppUser | null;
  settings: SystemSettings;
  activeTab?: NavTab;
  setActiveTab?: (tab: NavTab) => void;
  crops?: Crop[];
  schemes?: FertilizationScheme[];
  pests?: PestDiseaseItem[];
  onSelectCrop?: (cropId: string, initialTab?: 'scheme' | 'pest') => void;
  onOpenAuth?: () => void;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  onNavigate?: (tab: NavTab) => void;
  onOpenVersionModal?: () => void;
  pendingUsersCount?: number;
  pendingCount?: number;
}

const EMPTY_CROPS: Crop[] = [];
const EMPTY_SCHEMES: FertilizationScheme[] = [];
const EMPTY_PESTS: PestDiseaseItem[] = [];

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  settings,
  activeTab,
  setActiveTab,
  crops = EMPTY_CROPS,
  schemes = EMPTY_SCHEMES,
  pests = EMPTY_PESTS,
  onSelectCrop,
  onOpenAuth,
  onOpenAuthModal,
  onLogout,
  onNavigate,
  onOpenVersionModal,
  pendingUsersCount = 0,
  pendingCount = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const effectiveAuthOpen = onOpenAuth || onOpenAuthModal || (() => {});
  const effectivePendingCount = pendingUsersCount || pendingCount || 0;

  // Global search across Crops, Schemes, Diseases, Products
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setResults((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const matches: GlobalSearchResult[] = [];

    // Search Crops
    (crops || []).forEach((crop) => {
      if (!crop) return;
      const cropName = crop.name || '';
      const aliases = crop.aliases || [];
      const desc = crop.description || '';
      if (
        cropName.toLowerCase().includes(q) ||
        aliases.some((a) => a && a.toLowerCase().includes(q)) ||
        desc.toLowerCase().includes(q)
      ) {
        matches.push({
          type: 'crop',
          id: crop.id,
          title: crop.name,
          subtitle: `分类: ${crop.suitableRegions || '全国主产区'} · 方案 ${crop.schemeCount || 0} 套 · 病虫害 ${crop.diseaseCount || 0} 种`,
          cropId: crop.id,
          cropName: crop.name,
          highlightMatch: crop.name,
          tag: '作物',
        });
      }
    });

    // Search Schemes & fertilizers
    (schemes || []).forEach((scheme) => {
      if (!scheme) return;
      let matchedFertilizer = '';
      const stages = scheme.stages || [];
      const hasFertMatch = stages.some((stg) =>
        (stg?.items || []).some((item) => {
          if (item?.fertilizer && item.fertilizer.toLowerCase().includes(q)) {
            matchedFertilizer = item.fertilizer;
            return true;
          }
          return false;
        })
      );

      const title = scheme.title || '';
      const summary = scheme.summary || '';
      if (title.toLowerCase().includes(q) || hasFertMatch || summary.toLowerCase().includes(q)) {
        matches.push({
          type: 'scheme',
          id: scheme.id,
          title: scheme.title,
          subtitle: `作物: ${scheme.cropName || '全库'} · 类型: ${scheme.schemeType || '水肥'} ${matchedFertilizer ? `· 包含肥料: ${matchedFertilizer}` : ''}`,
          cropId: scheme.cropId,
          cropName: scheme.cropName || '',
          highlightMatch: matchedFertilizer || scheme.title,
          tag: '施肥方案',
        });
      }
    });

    // Search Pest & Diseases
    (pests || []).forEach((pest) => {
      if (!pest) return;
      let matchedDrug = '';
      const chem = pest.chemicalControl || [];
      const hasDrug = chem.some((c) => {
        if (c?.formulaName && c.formulaName.toLowerCase().includes(q)) {
          matchedDrug = c.formulaName;
          return true;
        }
        return false;
      });

      const name = pest.name || '';
      const symptoms = pest.symptoms || '';
      const agControl = pest.agriculturalControl || '';
      if (
        name.toLowerCase().includes(q) ||
        symptoms.toLowerCase().includes(q) ||
        agControl.toLowerCase().includes(q) ||
        hasDrug
      ) {
        matches.push({
          type: 'disease',
          id: pest.id,
          title: pest.name,
          subtitle: `作物: ${pest.cropName || '通用'} · 类别: ${pest.categoryGroup || pest.type || '病虫害'} ${matchedDrug ? `· 用药: ${matchedDrug}` : ''}`,
          cropId: pest.cropId,
          cropName: pest.cropName || '',
          highlightMatch: pest.name,
          tag: pest.categoryGroup || pest.type || '病虫害',
        });
      }
    });

    setResults(matches.slice(0, 10));
  }, [searchQuery, crops, schemes, pests]);

  const handleResultClick = (res: GlobalSearchResult) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (onSelectCrop) {
      if (res.type === 'disease') {
        onSelectCrop(res.cropId, 'pest');
      } else {
        onSelectCrop(res.cropId, 'scheme');
      }
    } else if (onNavigate) {
      if (res.type === 'disease') {
        onNavigate('pests');
      } else {
        onNavigate('crops');
      }
    }
  };

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: System branding */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-2xl select-none">{settings.siteLogo || '🐸'}</span>
        <div>
          <h1 className="font-bold text-slate-800 text-sm md:text-base tracking-tight leading-tight flex items-center gap-2">
            <span>{settings.siteName}</span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            {settings.siteSubtitle || '各大类作物全周期水肥一体化管理与病虫害防治专家系统'}
          </p>
        </div>
      </div>

      {/* Center Search Engine */}
      <div className="flex-1 max-w-lg mx-4 relative">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="全站检索：作物名称、病虫害(炭疽病/青枯病/红蜘蛛)、肥料配方..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs md:text-sm text-slate-800 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setResults([]);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>搜索结果 ({results.length})</span>
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-600">
                关闭
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 p-1">
              {results.length > 0 ? (
                results.map((res) => (
                  <div
                    key={`${res.type}-${res.id}`}
                    onClick={() => handleResultClick(res)}
                    className="p-3 hover:bg-emerald-50/60 rounded-xl cursor-pointer transition-colors flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-2 rounded-lg text-xs font-semibold shrink-0 mt-0.5 ${
                          res.type === 'crop'
                            ? 'bg-emerald-100 text-emerald-800'
                            : res.type === 'scheme'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {res.type === 'crop' ? <Sprout className="w-4 h-4" /> : res.type === 'scheme' ? <FileText className="w-4 h-4" /> : <Bug className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-slate-800 group-hover:text-emerald-700">
                            {res.title}
                          </h4>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                            {res.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{res.subtitle}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 shrink-0 self-center" />
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  未找到与“<span className="text-slate-700 font-medium">{searchQuery}</span>”匹配的记录。
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right User & Version */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onOpenVersionModal}
          className="hidden sm:inline-flex items-center px-2.5 py-1 text-[11px] font-mono font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          title="点击查看系统更新日志"
        >
          0.0.0
        </button>

        {currentUser ? (
          <div
            onClick={effectiveAuthOpen}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUser.realName ? currentUser.realName.slice(0, 1) : '用'}
            </div>
            <div className="text-left hidden md:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800">{currentUser.realName || currentUser.username}</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                    管理员
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">{currentUser.department || '农业技术中心'}</p>
            </div>

            {effectivePendingCount > 0 && isAdmin && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="有待审核注册申请" />
            )}
          </div>
        ) : (
          <button
            onClick={effectiveAuthOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>登录 / 注册</span>
          </button>
        )}
      </div>
    </header>
  );
};
