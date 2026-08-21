import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Sprout,
  Check,
  Search,
  X,
  Layers,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Crop, CropCategory } from '../types';

interface CascadingCropFilterProps {
  crops: Crop[];
  selectedCropId: string;
  onChangeCropId: (cropId: string) => void;
  className?: string;
}

interface CategoryGroup {
  id: string;
  name: string;
  icon?: string;
  crops: Crop[];
}

export const CascadingCropFilter: React.FC<CascadingCropFilterProps> = ({
  crops,
  selectedCropId,
  onChangeCropId,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCategoryId, setHoveredCategoryId] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Group crops by category or natural types
  const categoryGroups: CategoryGroup[] = React.useMemo(() => {
    const groupsMap: Record<string, Crop[]> = {
      '果树与浆果': [],
      '蔬菜类': [],
      '瓜类': [],
      '大田与粮油': [],
      '中草药材类': [],
      '花卉苗木与盆景': [],
      '茶树与特种林木': [],
      '其他作物': [],
    };

    crops.forEach((c) => {
      const cat = (c.categoryId || '').toLowerCase();
      const name = c.name;

      if (
        cat === 'cat-herbs' ||
        cat.includes('herb') ||
        /中草药|药材|三七|田七|麦冬|人参|西洋参|丹参|黄精|金银花|牛大力|当归|天麻|枸杞|黄芪/.test(name)
      ) {
        groupsMap['中草药材类'].push(c);
      } else if (
        cat === 'cat-flowers-bonsai' ||
        cat.includes('flower') ||
        cat.includes('bonsai') ||
        /花卉|盆景|罗汉松|景观苗木|红枫|月季|玫瑰|茉莉|杜鹃|山茶花|菊花|兰花/.test(name)
      ) {
        groupsMap['花卉苗木与盆景'].push(c);
      } else if (
        cat === 'cat-tea' ||
        cat.includes('tea') ||
        /茶树|茶叶|油茶|山茶树|普洱/.test(name)
      ) {
        groupsMap['茶树与特种林木'].push(c);
      } else if (
        cat.includes('melon') ||
        /哈密瓜|甜瓜|香瓜|西瓜|冬瓜|南瓜|丝瓜|苦瓜/.test(name)
      ) {
        groupsMap['瓜类'].push(c);
      } else if (
        cat.includes('berry') ||
        cat.includes('fruit') ||
        /柑橘|沃柑|砂糖橘|橙|柚|葡萄|阳光玫瑰|桃|苹果|梨|草莓|蓝莓|百香果|芭乐|番石榴|杨梅|荔枝|龙眼|芒果|猕猴桃|无花果|槟榔/.test(name)
      ) {
        groupsMap['果树与浆果'].push(c);
      } else if (
        cat.includes('veg') ||
        cat.includes('solanaceous') ||
        cat.includes('root') ||
        /辣椒|朝天椒|番茄|西红柿|茄子|黄瓜|生菜|芹菜|菠菜|西兰花|白菜|甘蓝|大蒜|大葱|韭菜|生姜|大姜|山药/.test(name)
      ) {
        groupsMap['蔬菜类'].push(c);
      } else if (
        cat.includes('grain') ||
        cat.includes('field') ||
        /玉米|水稻|小麦|花生|棉花|大豆|马铃薯|土豆|甘蔗|甜菜/.test(name)
      ) {
        groupsMap['大田与粮油'].push(c);
      } else {
        groupsMap['其他作物'].push(c);
      }
    });

    return [
      { id: 'all', name: '全量作物汇总', crops: crops },
      { id: 'general', name: '🌐 通用跨作物病害', crops: [] },
      { id: 'fruit', name: '🍎 果树与浆果', crops: groupsMap['果树与浆果'] },
      { id: 'veg', name: '🥦 蔬菜类', crops: groupsMap['蔬菜类'] },
      { id: 'melon', name: '🍈 瓜类', crops: groupsMap['瓜类'] },
      { id: 'field', name: '🌾 大田与粮油', crops: groupsMap['大田与粮油'] },
      { id: 'herb', name: '🌿 中草药材类', crops: groupsMap['中草药材类'] },
      { id: 'flowers', name: '🌸 花卉苗木与盆景', crops: groupsMap['花卉苗木与盆景'] },
      { id: 'tea', name: '🍵 茶树与特种林木', crops: groupsMap['茶树与特种林木'] },
      { id: 'other', name: '📦 其他作物', crops: groupsMap['其他作物'] },
    ].filter((g) => g.id === 'all' || g.id === 'general' || g.crops.length > 0);
  }, [crops]);

  // Find label of currently selected item
  const selectedDisplayLabel = React.useMemo(() => {
    if (selectedCropId === 'all') return '全部作物 (全量图谱)';
    if (selectedCropId === 'general') return '🌐 通用跨作物病虫害';
    const found = crops.find((c) => c.id === selectedCropId);
    if (found) {
      return found.name;
    }
    return '未指定作物';
  }, [selectedCropId, crops]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Currently active group in hover state
  const activeGroup =
    categoryGroups.find((g) => g.id === hoveredCategoryId) || categoryGroups[0];

  // Quick filtered crops if user types in search box
  const searchResults = filterSearch.trim()
    ? crops.filter((c) =>
        c.name.toLowerCase().includes(filterSearch.toLowerCase().trim())
      )
    : [];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Bar */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setFilterSearch('');
          }}
          className={`w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-2 text-slate-800 shadow-2xs cursor-pointer ${
            isOpen ? 'border-amber-500 ring-2 ring-amber-400/20 bg-white' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <Sprout className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-slate-400 font-normal">作物:</span>
            <span className="truncate text-slate-900 font-black">{selectedDisplayLabel}</span>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-amber-600' : ''
            }`}
          />
        </button>

        {selectedCropId !== 'all' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChangeCropId('all');
            }}
            className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="还原为全部作物"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Two-Level Cascading Hover Popup Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[340px] sm:w-[480px] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
          {/* Quick Search within Dropdown */}
          <div className="p-3 bg-slate-50/80 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="快速搜索作物名称 (如: 蔬菜、黄瓜、沃柑)..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-hidden focus:border-amber-500 font-medium"
                autoFocus
              />
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => setFilterSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {filterSearch.trim() ? (
            /* Search Direct Results List */
            <div className="p-2 max-h-[300px] overflow-y-auto space-y-1">
              <div className="text-[11px] text-slate-400 px-2 py-1">
                找到 {searchResults.length} 个相关作物：
              </div>
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  未匹配到相关作物
                </div>
              ) : (
                searchResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChangeCropId(c.id);
                      setIsOpen(false);
                    }}
                    className={`w-full p-2 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-colors ${
                      selectedCropId === c.id
                        ? 'bg-amber-50 text-amber-900 font-black'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{c.name}</span>
                    {selectedCropId === c.id && (
                      <Check className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Cascading Two-Column Hover Matrix */
            <div className="grid grid-cols-5 min-h-[260px] max-h-[360px]">
              {/* Left Column: Categories (Hover to switch right panel) */}
              <div className="col-span-2 bg-slate-50/70 border-r border-slate-100 p-2 space-y-1 overflow-y-auto">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1">
                  作物品类大类
                </div>

                {categoryGroups.map((group) => {
                  const isHovered = hoveredCategoryId === group.id;
                  const isDirectSelected =
                    (group.id === 'all' && selectedCropId === 'all') ||
                    (group.id === 'general' && selectedCropId === 'general');

                  return (
                    <div
                      key={group.id}
                      onMouseEnter={() => setHoveredCategoryId(group.id)}
                      onClick={() => {
                        if (group.id === 'all') {
                          onChangeCropId('all');
                          setIsOpen(false);
                        } else if (group.id === 'general') {
                          onChangeCropId('general');
                          setIsOpen(false);
                        }
                      }}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-between group ${
                        isHovered
                          ? 'bg-white text-amber-900 shadow-2xs border border-amber-200'
                          : isDirectSelected
                          ? 'bg-amber-100/70 text-amber-900'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate">{group.name}</span>
                      {group.crops.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] opacity-60 font-mono">
                            {group.crops.length}
                          </span>
                          <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      ) : (
                        isDirectSelected && <Check className="w-3 h-3 text-amber-600" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Specific Crops of the Hovered Category */}
              <div className="col-span-3 p-3 overflow-y-auto space-y-1.5 bg-white">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <span className="text-[11px] font-black text-slate-800">
                    {activeGroup.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    共 {activeGroup.crops.length} 种
                  </span>
                </div>

                {activeGroup.id === 'all' ? (
                  <div className="space-y-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeCropId('all');
                        setIsOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-xs font-bold text-left transition-colors flex items-center justify-between ${
                        selectedCropId === 'all'
                          ? 'bg-amber-100 text-amber-900 font-black'
                          : 'bg-slate-50 hover:bg-amber-50 text-slate-800'
                      }`}
                    >
                      <span>全量查看所有作物病害</span>
                      {selectedCropId === 'all' && (
                        <Check className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                    <p className="text-[11px] text-slate-400 p-2 leading-relaxed">
                      💡 鼠标移到左侧「果树类」、「蔬菜类」或「瓜类」上，右侧将自动展开对应作物的精准复选清单。
                    </p>
                  </div>
                ) : activeGroup.id === 'general' ? (
                  <div className="p-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeCropId('general');
                        setIsOpen(false);
                      }}
                      className="w-full p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-xs font-bold text-left flex items-center justify-between"
                    >
                      <span>筛选「通用跨作物」病虫害</span>
                      {selectedCropId === 'general' && (
                        <Check className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </button>
                    <p className="text-[11px] text-slate-400">
                      包含白粉病、蚜虫、蓟马、红蜘蛛等在多种作物上普遍发作的共性病虫害。
                    </p>
                  </div>
                ) : activeGroup.crops.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    该大类暂未配置作物
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {activeGroup.crops.map((c) => {
                      const isSelected = selectedCropId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            onChangeCropId(c.id);
                            setIsOpen(false);
                          }}
                          className={`p-2 rounded-xl text-xs font-bold text-left truncate transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-600 text-white font-black shadow-xs'
                              : 'bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-100 hover:border-amber-200'
                          }`}
                          title={c.name}
                        >
                          <span className="truncate">{c.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Footer Note */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>悬停大类即显右侧明细 · 点击快速选定</span>
            <button
              type="button"
              onClick={() => {
                onChangeCropId('all');
                setIsOpen(false);
              }}
              className="text-amber-700 hover:underline font-bold"
            >
              重置为全部作物
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
