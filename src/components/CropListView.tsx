import React, { useState } from 'react';
import {
  Sprout,
  Plus,
  Search,
  BookOpen,
  Bug,
  Calendar,
  Layers,
  ChevronRight,
  Shield,
  Sparkles,
  ArrowRight,
  Eye,
  Trash2,
  Edit,
  Globe,
  Tag
} from 'lucide-react';
import { Crop, CropCategory, AppUser, SystemSettings, FertilizationScheme, PestDiseaseItem } from '../types';
import { ImageUploader } from './ImageUploader';
import { ImageLightboxModal } from './ImageLightboxModal';

interface CropListViewProps {
  crops: Crop[];
  categories: CropCategory[];
  schemes?: FertilizationScheme[];
  pests?: PestDiseaseItem[];
  currentUser: AppUser | null;
  settings?: SystemSettings;
  onSelectCrop: (cropId: string, initialTab?: 'scheme' | 'pest') => void;
  onAddCrop: (newCrop: Crop) => void;
  onUpdateCrop: (updatedCrop: Crop) => void;
  onDeleteCrop?: (cropId: string) => void;
}

export const CropListView: React.FC<CropListViewProps> = ({
  crops,
  categories,
  schemes = [],
  pests = [],
  currentUser,
  settings,
  onSelectCrop,
  onAddCrop,
  onUpdateCrop,
  onDeleteCrop,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Form State for Adding / Editing Crop
  const [cropName, setCropName] = useState('');
  const [cropCat, setCropCat] = useState(categories[0]?.id || 'cat-melon');
  const [cropScientific, setCropScientific] = useState('');
  const [cropCycle, setCropCycle] = useState('');
  const [cropRegion, setCropRegion] = useState('');
  const [cropImage, setCropImage] = useState('');
  const [cropDesc, setCropDesc] = useState('');
  const [cropAliases, setCropAliases] = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const canEdit = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'expert';
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Crop-targeted custom fields defined by admin
  const cropCustomFields = (settings?.customFields || []).filter(
    (f) => f && f.target === 'crop' && f.enabled
  );

  const openAddModal = () => {
    setEditingCrop(null);
    setCropName('');
    setCropCat(categories[0]?.id || 'cat-melon');
    setCropScientific('');
    setCropCycle('');
    setCropRegion('');
    setCropImage('');
    setCropDesc('');
    setCropAliases('');
    setCustomFieldValues({});
    setIsAddModalOpen(true);
  };

  const openEditModal = (crop: Crop, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCrop(crop);
    setCropName(crop.name);
    setCropCat(crop.categoryId);
    setCropScientific(crop.scientificName || '');
    setCropCycle(crop.growthCycle || '');
    setCropRegion(crop.suitableRegions || '');
    setCropImage(crop.coverImage || '');
    setCropDesc(crop.description || '');
    setCropAliases(crop.aliases?.join('、') || '');
    setCustomFieldValues(
      (crop.customFieldValues as Record<string, string>) || {}
    );
    setIsAddModalOpen(true);
  };

  const handleSaveCrop = () => {
    if (!cropName.trim()) {
      alert('请填写作物名称');
      return;
    }

    const aliasesArray = cropAliases
      .split(/[,，、\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingCrop) {
      const updated: Crop = {
        ...editingCrop,
        name: cropName.trim(),
        categoryId: cropCat,
        scientificName: cropScientific.trim(),
        growthCycle: cropCycle.trim(),
        suitableRegions: cropRegion.trim(),
        coverImage: cropImage || 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80',
        description: cropDesc.trim(),
        aliases: aliasesArray.length > 0 ? aliasesArray : editingCrop.aliases,
        customFieldValues,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      onUpdateCrop(updated);
    } else {
      const newCrop: Crop = {
        id: `crop-${Date.now()}`,
        categoryId: cropCat,
        name: cropName.trim(),
        aliases: aliasesArray,
        scientificName: cropScientific.trim(),
        growthCycle: cropCycle.trim(),
        suitableRegions: cropRegion.trim(),
        coverImage: cropImage || 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&auto=format&fit=crop&q=80',
        description: cropDesc.trim() || '暂无作物简介说明',
        schemeCount: 0,
        diseaseCount: 0,
        tags: [categories.find((c) => c.id === cropCat)?.name || '农作物', '水肥一体化'],
        customFieldValues,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      };
      onAddCrop(newCrop);
    }
    setIsAddModalOpen(false);
  };

  // Filter crops by category and query
  const filteredCrops = crops.filter((crop) => {
    const matchesCategory =
      selectedCategory === 'all' || crop.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      crop.name.toLowerCase().includes(q) ||
      (crop.aliases && crop.aliases.some((a) => a.toLowerCase().includes(q))) ||
      (crop.scientificName && crop.scientificName.toLowerCase().includes(q)) ||
      (crop.tags && crop.tags.some((t) => t.toLowerCase().includes(q))) ||
      (crop.description && crop.description.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold mb-2">
            <Sprout className="w-3.5 h-3.5" />
            <span>惠民皓天作物数字化全景库</span>
          </div>
          <h1 className="text-xl md:text-3xl font-black tracking-tight">
            作物水肥一体化与植保防治全景库
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
            收录瓜果类、果树核果类、浆果热带果、茄果叶菜、根茎葱姜及药材等多种核心作物全周期水肥一体化管理方案与病虫害图谱。
          </p>
        </div>

        {canEdit && (
          <button
            onClick={openAddModal}
            className="self-start md:self-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-2xl text-xs md:text-sm font-bold shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增作物建档</span>
          </button>
        )}
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="space-y-4">
        {/* 
          Category Selection Tabs - Flex Wrap so all category names show fully on multiple rows 
        */}
        <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-1">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>作物大类导航 (选项卡已完整换行显示，点击快速切换)：</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>全部作物大类</span>
              <span className="text-[10px] opacity-80 font-mono">({crops.length})</span>
            </button>

            {categories.map((cat) => {
              const count = crops.filter((c) => c.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.image && (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover border border-white/40 shrink-0"
                    />
                  )}
                  <span className="whitespace-normal text-left">{cat.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full shrink-0 ${
                      isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索作物名称、别名或特性（如：哈密瓜、柑橘、阳光玫瑰、大姜、辣椒、槟榔、草莓...）"
              className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
            共筛选出 <strong className="text-slate-800 font-bold">{filteredCrops.length}</strong> 种作物
          </span>
        </div>
      </div>

      {/* Crop Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCrops.map((crop) => {
          const cat = categories.find((c) => c.id === crop.categoryId);
          const cropSchemesCount = schemes.length > 0
            ? schemes.filter((s) => s.cropId === crop.id && !s.isDeleted).length
            : (crop.schemeCount || 1);
          const cropPestsCount = pests.length > 0
            ? pests.filter((p) => p.cropId === crop.id || (p.cropIds && p.cropIds.includes(crop.id)) || p.isGeneralCrop).length
            : (crop.diseaseCount || 0);

          return (
            <div
              key={crop.id}
              onClick={() => onSelectCrop(crop.id, 'scheme')}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg hover:border-emerald-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Crop Cover Image */}
                <div className="h-44 relative overflow-hidden bg-slate-100">
                  <img
                    src={crop.coverImage}
                    alt={crop.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {cat && (
                      <span className="px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold rounded-xl border border-white/20">
                        {cat.name}
                      </span>
                    )}
                  </div>

                  {/* Top Right Actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxImage({ url: crop.coverImage, title: crop.name });
                      }}
                      className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white rounded-xl transition-transform hover:scale-110"
                      title="点击查看大图"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => openEditModal(crop, e)}
                        className="p-1.5 bg-white/80 hover:bg-white text-slate-800 rounded-xl transition-transform hover:scale-110 shadow-md"
                        title="编辑作物档案"
                      >
                        <Edit className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    )}

                    {isSuperAdmin && onDeleteCrop && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确认彻底删除作物「${crop.name}」档案吗？`)) {
                            onDeleteCrop(crop.id);
                          }
                        }}
                        className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl transition-transform hover:scale-110 shadow-md"
                        title="删除作物"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Crop Name & Subtitle on Image */}
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="text-lg font-black tracking-tight drop-shadow-sm flex items-center justify-between">
                      <span>{crop.name}</span>
                      <ChevronRight className="w-4 h-4 text-emerald-300 group-hover:translate-x-1 transition-transform" />
                    </h3>
                    {crop.aliases && crop.aliases.length > 0 && (
                      <p className="text-xs text-slate-200 truncate mt-0.5 opacity-90">
                        别名: {crop.aliases.join('、')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Body Info */}
                <div className="p-5 space-y-3">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {crop.description}
                  </p>

                  {/* Tags */}
                  {crop.tags && crop.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {crop.tags.slice(0, 4).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-lg"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Custom Dynamic Fields Preview if any */}
                  {crop.customFieldValues &&
                    Object.entries(crop.customFieldValues).length > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        {Object.entries(crop.customFieldValues)
                          .slice(0, 2)
                          .map(([k, v]) => {
                            const fieldDef = cropCustomFields.find((f) => f.id === k);
                            return (
                              <div key={k} className="bg-emerald-50/60 px-2 py-0.5 rounded-md text-emerald-800">
                                <strong className="font-bold">{fieldDef?.label || k}:</strong>{' '}
                                <span>{String(v)}</span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                </div>
              </div>

              {/* Card Footer Meta */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCrop(crop.id, 'scheme');
                    }}
                    className="flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                    title="点击查看水肥方案"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{cropSchemesCount} 方案</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCrop(crop.id, 'pest');
                    }}
                    className="flex items-center gap-1 font-bold text-rose-700 hover:text-rose-800 hover:underline cursor-pointer"
                    title="点击直接查看该作物病虫害图谱"
                  >
                    <Bug className="w-3.5 h-3.5" />
                    <span>{cropPestsCount} 图谱</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 text-emerald-600 font-bold group-hover:text-emerald-700">
                  <span>进入详情</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Crop Add / Edit Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCrop ? `编辑作物档案：${editingCrop.name}` : '新增作物档案'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">作物名称 *</label>
                <input
                  type="text"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  placeholder="例如: 哈密瓜、蓝莓、猕猴桃、西瓜、大葱..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-bold text-sm"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">别名与常见品种（顿号分隔）</label>
                <input
                  type="text"
                  value={cropAliases}
                  onChange={(e) => setCropAliases(e.target.value)}
                  placeholder="例如: 香瓜、甜瓜、蜜瓜"
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">所属大类</label>
                  <select
                    value={cropCat}
                    onChange={(e) => setCropCat(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">学名 / 拉丁名</label>
                  <input
                    type="text"
                    value={cropScientific}
                    onChange={(e) => setCropScientific(e.target.value)}
                    placeholder="如: Cucumis melo L."
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-serif italic"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">生育周期</label>
                  <input
                    type="text"
                    value={cropCycle}
                    onChange={(e) => setCropCycle(e.target.value)}
                    placeholder="如: 75-100天"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">适宜产区</label>
                  <input
                    type="text"
                    value={cropRegion}
                    onChange={(e) => setCropRegion(e.target.value)}
                    placeholder="如: 新疆、海南、山东、内蒙等"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Cover Image Uploader (Supporting Paste, Drag-and-drop, and File Select) */}
              <ImageUploader
                value={cropImage}
                onChange={setCropImage}
                label="作物封面大图 (支持粘贴、拖放与文件选择)"
                placeholder="拖入作物照片或直接截图 Ctrl+V 粘贴进图"
                aspectRatio="video"
                onPreviewOriginal={(url) => setLightboxImage({ url, title: cropName || '作物封面' })}
              />

              <div>
                <label className="font-bold text-slate-700 block mb-1">作物简介与需肥特性</label>
                <textarea
                  rows={2}
                  value={cropDesc}
                  onChange={(e) => setCropDesc(e.target.value)}
                  placeholder="如: 喜光、耐旱，需钾量大，膨果转色期水肥敏感..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden"
                />
              </div>

              {/* Dynamic Custom Fields Defined by Super Admin */}
              {cropCustomFields.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">
                    🛠️ 管理员扩展自定义字段：
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {cropCustomFields.map((f) => (
                      <div key={f.id}>
                        <label className="font-semibold text-slate-700 block mb-0.5">
                          {f.label}
                        </label>
                        {f.fieldType === 'select' ? (
                          <select
                            value={customFieldValues[f.id] || ''}
                            onChange={(e) =>
                              setCustomFieldValues({ ...customFieldValues, [f.id]: e.target.value })
                            }
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                          >
                            <option value="">请选择...</option>
                            {f.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={customFieldValues[f.id] || ''}
                            onChange={(e) =>
                              setCustomFieldValues({ ...customFieldValues, [f.id]: e.target.value })
                            }
                            placeholder={f.placeholder || ''}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                保存作物档案
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox High-Res Image Modal */}
      {lightboxImage && (
        <ImageLightboxModal
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};
