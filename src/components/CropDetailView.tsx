import React, { useState } from 'react';
import {
  Sprout,
  Bug,
  FileSpreadsheet,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  ChevronRight,
  Shield,
  Eye,
  Sliders,
  GripVertical,
  RotateCcw,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Layers,
  Settings,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Image as ImageIcon,
  Tag,
  Grid
} from 'lucide-react';
import {
  Crop,
  FertilizationScheme,
  FertilizerStage,
  FertilizerStageItem,
  PestDiseaseItem,
  WatermarkConfig,
  AppUser,
  ChemicalFormula,
  SystemSettings,
  PestCategoryGroup
} from '../types';
import { SchemeTableView } from './SchemeTableView';
import { MindMapView } from './MindMapView';
import { ImageUploader } from './ImageUploader';
import { ImageLightboxModal } from './ImageLightboxModal';

interface CropDetailViewProps {
  crop: Crop;
  schemes: FertilizationScheme[];
  pests: PestDiseaseItem[];
  watermarkConfig: WatermarkConfig;
  settings: SystemSettings;
  currentUser: AppUser | null;
  initialTab?: 'scheme' | 'pest';
  onUpdateScheme: (scheme: FertilizationScheme) => void;
  onSoftDeleteScheme: (schemeId: string) => void;
  onRestoreScheme: (schemeId: string) => void;
  onPermanentDeleteScheme: (schemeId: string) => void;
  onAddScheme: (newScheme: FertilizationScheme) => void;
  onUpdatePest: (pest: PestDiseaseItem) => void;
  onDeletePest: (pestId: string) => void;
  onAddPest: (newPest: PestDiseaseItem) => void;
  onUpdateCrop: (crop: Crop) => void;
  onOpenExportModal: (scheme: FertilizationScheme) => void;
  onUpdateWatermarkConfig?: (config: WatermarkConfig) => void;
  onBack: () => void;
}

export const CropDetailView: React.FC<CropDetailViewProps> = ({
  crop,
  schemes,
  pests,
  watermarkConfig,
  settings,
  currentUser,
  initialTab = 'scheme',
  onUpdateScheme,
  onSoftDeleteScheme,
  onRestoreScheme,
  onPermanentDeleteScheme,
  onAddScheme,
  onUpdatePest,
  onDeletePest,
  onAddPest,
  onUpdateCrop,
  onOpenExportModal,
  onUpdateWatermarkConfig,
  onBack,
}) => {
  const safeWatermarkConfig: WatermarkConfig = watermarkConfig || settings?.watermarkConfig || {
    enabled: true,
    text: '惠民皓天 官方水肥一体化方案',
    opacity: 0.14,
    angle: -30,
    fontSize: 18,
    color: '#059669',
    density: 'normal',
    showStamp: true,
    selectedPresetId: 'stamp-official-red',
  };

  const [activeTab, setActiveTab] = useState<'scheme' | 'pest' | 'deleted_schemes'>(initialTab);
  
  // Active and deleted schemes
  const activeSchemes = schemes.filter((s) => !s.isDeleted);
  const deletedSchemes = schemes.filter((s) => s.isDeleted);

  const [selectedSchemeId, setSelectedSchemeId] = useState<string>(
    activeSchemes.length > 0 ? activeSchemes[0].id : ''
  );

  React.useEffect(() => {
    const validSchemes = schemes.filter((s) => !s.isDeleted);
    setSelectedSchemeId((prev) => {
      if (validSchemes.length === 0) return '';
      if (prev && validSchemes.some((s) => s.id === prev)) return prev;
      return validSchemes[0].id;
    });
  }, [crop.id, schemes]);
  const [viewFormat, setViewFormat] = useState<'table' | 'mindmap' | 'editor'>('table');
  const [copySuccess, setCopySuccess] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Edit Crop Modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [editCropName, setEditCropName] = useState(crop.name);
  const [editScientificName, setEditScientificName] = useState(crop.scientificName || '');
  const [editCycle, setEditCycle] = useState(crop.growthCycle || '');
  const [editRegion, setEditRegion] = useState(crop.suitableRegions || '');
  const [editDesc, setEditDesc] = useState(crop.description);
  const [editCoverImage, setEditCoverImage] = useState(crop.coverImage);

  // Edit / Add Stage Modal state
  const [editingStage, setEditingStage] = useState<FertilizerStage | null>(null);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);

  // Edit / Add Scheme Modal state
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [newSchemeTitle, setNewSchemeTitle] = useState('');
  const [newSchemeType, setNewSchemeType] = useState<string>('全周期方案');
  const [customSchemeTypeInput, setCustomSchemeTypeInput] = useState('');
  const [isCustomSchemeType, setIsCustomSchemeType] = useState(false);
  const [newSchemeAuthor, setNewSchemeAuthor] = useState(currentUser?.realName || '惠民皓天专家组');

  // Edit / Add Pest modal state
  const [editingPest, setEditingPest] = useState<PestDiseaseItem | null>(null);
  const [isPestModalOpen, setIsPestModalOpen] = useState(false);
  const [pestCategoryFilter, setPestCategoryFilter] = useState<string>('all');

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin' || currentUser?.role === 'expert';

  const currentScheme = activeSchemes.find((s) => s.id === selectedSchemeId) || activeSchemes[0];

  const availableSchemeTypes = settings?.schemeTypes && settings.schemeTypes.length > 0
    ? settings.schemeTypes
    : ['全周期方案', '水肥一体化专用', '幼树提苗', '成年结果树', '专项攻坚方案', '促根壮苗专用', '膨果增甜方案', '采后清园保树'];

  const availablePestCategories: PestCategoryGroup[] = settings?.pestCategoryGroups && settings.pestCategoryGroups.length > 0
    ? settings.pestCategoryGroups
    : [
        '虫害',
        '真菌性病害（高等真菌）',
        '真菌性病害（低等真菌）',
        '细菌性病害',
        '病毒病',
        '线虫病',
        '生理性病害',
        '药害与肥害',
        '环境与灾害胁迫'
      ];

  // Stage order adjustments
  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    if (!currentScheme) return;
    const newStages = [...currentScheme.stages];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newStages.length) return;

    const temp = newStages[index];
    newStages[index] = newStages[targetIdx];
    newStages[targetIdx] = temp;

    newStages.forEach((s, idx) => {
      s.order = idx + 1;
    });

    onUpdateScheme({
      ...currentScheme,
      stages: newStages,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  };

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedStageIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedStageIndex === null || draggedStageIndex === targetIndex || !currentScheme) return;

    const newStages = [...currentScheme.stages];
    const [moved] = newStages.splice(draggedStageIndex, 1);
    newStages.splice(targetIndex, 0, moved);

    newStages.forEach((s, idx) => {
      s.order = idx + 1;
    });

    onUpdateScheme({
      ...currentScheme,
      stages: newStages,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setDraggedStageIndex(null);
  };

  const handleDeleteStage = (stageId: string) => {
    if (!currentScheme) return;
    if (confirm('确定删除该物候阶段及其包含的所有肥料项目吗？')) {
      const newStages = currentScheme.stages.filter((s) => s.id !== stageId);
      newStages.forEach((s, idx) => {
        s.order = idx + 1;
      });
      onUpdateScheme({
        ...currentScheme,
        stages: newStages,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
    }
  };

  const handleSoftDeleteSchemeClick = () => {
    if (!currentScheme) return;
    if (confirm(`确定删除方案「${currentScheme.title}」吗？删除后将归入该作物的已删除方案中。`)) {
      onSoftDeleteScheme(currentScheme.id);
      const remaining = activeSchemes.filter((s) => s.id !== currentScheme.id);
      if (remaining.length > 0) {
        setSelectedSchemeId(remaining[0].id);
      }
    }
  };

  const handleSaveCrop = () => {
    onUpdateCrop({
      ...crop,
      name: editCropName,
      scientificName: editScientificName,
      growthCycle: editCycle,
      suitableRegions: editRegion,
      description: editDesc,
      coverImage: editCoverImage,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setIsCropModalOpen(false);
  };

  const handleCreateScheme = () => {
    const finalType = isCustomSchemeType && customSchemeTypeInput.trim()
      ? customSchemeTypeInput.trim()
      : newSchemeType;

    if (!newSchemeTitle.trim()) {
      alert('请输入方案名称');
      return;
    }

    const newScheme: FertilizationScheme = {
      id: `sch-${crop.id}-${Date.now()}`,
      cropId: crop.id,
      cropName: crop.name,
      title: newSchemeTitle.trim(),
      schemeType: finalType,
      author: newSchemeAuthor.trim() || '惠民皓天技术部',
      version: '2026.08',
      isPublished: true,
      stages: [
        {
          id: `stg-${Date.now()}-1`,
          stageName: '苗期 / 定植缓苗期',
          subStageName: '定植后7-10天',
          order: 1,
          timing: '定植成活后',
          items: [
            {
              id: `itm-${Date.now()}-1`,
              fertilizer: '傲脉（生根型水溶肥）',
              dosage: '2-3 kg/亩',
              method: '滴灌或冲施',
              remarks: '促根壮苗，提高抗逆性，防死棵',
              isKeyPoint: true,
            }
          ],
          managementTips: '保持根际土壤湿润，严禁大水漫灌伤根。',
        }
      ],
      summary: `${crop.name}${finalType}，针对土壤养分高效供给与植株健壮设计。`,
      generalNotes: '水肥一体化实行少量多次原则，严禁高温中午灌溉。',
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    onAddScheme(newScheme);
    setSelectedSchemeId(newScheme.id);
    setIsSchemeModalOpen(false);
    setNewSchemeTitle('');
    setCustomSchemeTypeInput('');
    setIsCustomSchemeType(false);
  };

  const handleSavePestModal = () => {
    if (!editingPest) return;
    if (!editingPest.name.trim()) {
      alert('请填写病虫害名称');
      return;
    }

    const isNew = !pests.some((p) => p.id === editingPest.id);
    const updated: PestDiseaseItem = {
      ...editingPest,
      cropId: crop.id,
      cropName: crop.name,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    if (isNew) {
      onAddPest(updated);
    } else {
      onUpdatePest(updated);
    }
    setIsPestModalOpen(false);
    setEditingPest(null);
  };

  const filteredPests = pests.filter((p) => {
    if (pestCategoryFilter === 'all') return true;
    return p.categoryGroup === pestCategoryFilter || p.type === pestCategoryFilter;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Prominent Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-2xl text-xs md:text-sm font-bold shadow-2xs hover:shadow-xs transition-all group"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-1 transition-transform" />
          <span>返回作物全景列表</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>当前作物：</span>
          <strong className="text-slate-800 font-bold">{crop.name}</strong>
        </div>
      </div>

      {/* Hero Crop Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="relative h-48 md:h-56 bg-slate-900">
          <img
            src={crop.coverImage}
            alt={crop.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

          {/* Top Right Actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setLightboxImage({ url: crop.coverImage, title: crop.name })}
              className="px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>查看大图</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setEditCropName(crop.name);
                  setEditScientificName(crop.scientificName || '');
                  setEditCycle(crop.growthCycle || '');
                  setEditRegion(crop.suitableRegions || '');
                  setEditDesc(crop.description);
                  setEditCoverImage(crop.coverImage);
                  setIsCropModalOpen(true);
                }}
                className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <Edit className="w-3.5 h-3.5 text-emerald-600" />
                <span>编辑作物档案</span>
              </button>
            )}
          </div>

          {/* Crop Info on Banner */}
          <div className="absolute bottom-4 left-6 right-6 text-white flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-emerald-600/90 backdrop-blur-xs text-white text-xs font-bold rounded-lg">
                  {crop.tags[0] || '核心作物'}
                </span>
                {crop.scientificName && (
                  <span className="text-xs text-emerald-300 font-serif italic">
                    {crop.scientificName}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                <span>{crop.name}</span>
                {crop.aliases && crop.aliases.length > 0 && (
                  <span className="text-sm md:text-base font-normal text-slate-300">
                    （{crop.aliases.join('、')}）
                  </span>
                )}
              </h1>
              <p className="text-xs md:text-sm text-slate-200 mt-1 max-w-3xl line-clamp-2">
                {crop.description}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Schemes vs Pests vs Recycle Bin */}
        <div className="flex items-center justify-between px-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('scheme')}
              className={`py-3.5 px-4 font-bold text-xs md:text-sm border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'scheme'
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>全周期水肥一体化方案 ({activeSchemes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('pest')}
              className={`py-3.5 px-4 font-bold text-xs md:text-sm border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'pest'
                  ? 'border-amber-600 text-amber-800 bg-white shadow-2xs rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bug className="w-4 h-4 text-amber-600" />
              <span>病虫害防治图谱与解决方案 ({pests.length})</span>
            </button>

            {deletedSchemes.length > 0 && (
              <button
                onClick={() => setActiveTab('deleted_schemes')}
                className={`py-3.5 px-4 font-bold text-xs md:text-sm border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'deleted_schemes'
                    ? 'border-rose-600 text-rose-800 bg-white shadow-2xs rounded-t-xl'
                    : 'border-transparent text-slate-400 hover:text-rose-600'
                }`}
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>已删除方案 ({deletedSchemes.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: Fertilization Schemes */}
      {activeTab === 'scheme' && (
        <div className="space-y-6">
          {/* Scheme Selector Header Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Scheme buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-xs font-bold text-slate-400 whitespace-nowrap mr-1">
                选择方案:
              </span>
              {activeSchemes.map((s) => {
                const isSelected = s.id === (currentScheme?.id || selectedSchemeId);
                return (
                  <div key={s.id} className="relative group/scheme flex items-center">
                    <button
                      onClick={() => setSelectedSchemeId(s.id)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs pr-8'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{s.title}</span>
                      <span className="text-[10px] opacity-75 font-mono">({s.schemeType})</span>
                    </button>

                    {/* Delete button in top right of scheme tag */}
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定删除方案「${s.title}」吗？删除后将归入已删除方案。`)) {
                            onSoftDeleteScheme(s.id);
                          }
                        }}
                        className={`absolute right-2 p-1 rounded-full text-white/80 hover:text-white hover:bg-rose-600 transition-colors ${
                          isSelected ? 'block' : 'hidden group-hover/scheme:block'
                        }`}
                        title="删除该方案（归入已删除）"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {isAdmin && (
                <button
                  onClick={() => setIsSchemeModalOpen(true)}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>新建水肥方案</span>
                </button>
              )}
            </div>

            {/* View Format Switcher & Export */}
            {currentScheme && (
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setViewFormat('table')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      viewFormat === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    标准表格
                  </button>
                  <button
                    onClick={() => setViewFormat('mindmap')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      viewFormat === 'mindmap' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    物候导图
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setViewFormat('editor')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        viewFormat === 'editor' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      物候调序与编辑
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onOpenExportModal(currentScheme)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>一键多端导出</span>
                </button>
              </div>
            )}
          </div>

          {/* Scheme Content Render */}
          {currentScheme ? (
            <div className="space-y-6">
              {viewFormat === 'table' && (
                <SchemeTableView
                  scheme={currentScheme}
                  watermarkConfig={safeWatermarkConfig}
                  settings={settings}
                  currentUser={currentUser}
                  showWatermark={safeWatermarkConfig.enabled}
                  onUpdateWatermarkConfig={onUpdateWatermarkConfig}
                />
              )}

              {viewFormat === 'mindmap' && (
                <MindMapView scheme={currentScheme} watermarkConfig={safeWatermarkConfig} />
              )}

              {/* EDITOR VIEW: Stage Reordering, Drag and Drop, Item Editing */}
              {viewFormat === 'editor' && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-emerald-600" />
                        <span>物候阶段排序与肥料明细列表（支持拖动与上下调序）</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        按住拖动把手可直接排序，点击删除按钮可删除物候阶段及下属肥料组合。
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setEditingStage({
                          id: `stg-${Date.now()}`,
                          stageName: '新物候时期',
                          subStageName: '',
                          order: currentScheme.stages.length + 1,
                          timing: '',
                          items: [
                            {
                              id: `itm-${Date.now()}`,
                              fertilizer: '施可收平衡型（20-20-20）',
                              dosage: '5kg/亩',
                              method: '滴灌',
                              remarks: '养分平衡供应',
                              isKeyPoint: true,
                            }
                          ],
                          managementTips: '',
                        });
                        setIsStageModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增物候阶段</span>
                    </button>
                  </div>

                  {/* Stages List with Reordering and Delete */}
                  <div className="space-y-3">
                    {currentScheme.stages.map((stage, idx) => (
                      <div
                        key={stage.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={`p-4 rounded-2xl border transition-all ${
                          draggedStageIndex === idx
                            ? 'bg-emerald-50/50 border-emerald-400 opacity-60'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {/* Drag handle */}
                            <div
                              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs"
                              title="按住拖拽以调整顺序"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>

                            {/* Stage index & Title */}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <h5 className="font-bold text-slate-900 text-sm">
                                  {stage.stageName}
                                  {stage.subStageName && (
                                    <span className="text-xs text-slate-500 font-normal ml-1">
                                      ({stage.subStageName})
                                    </span>
                                  )}
                                </h5>
                                {stage.timing && (
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    [{stage.timing}]
                                  </span>
                                )}
                              </div>

                              <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-slate-600">
                                {stage.items.map((it, itIdx) => (
                                  <span
                                    key={itIdx}
                                    className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px]"
                                  >
                                    {it.fertilizer} · <strong className="text-emerald-700 font-mono">{it.dosage}</strong> ({it.method})
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Order adjust and delete buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleMoveStage(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 disabled:opacity-30 rounded-lg transition-colors"
                              title="上移此阶段"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveStage(idx, 'down')}
                              disabled={idx === currentScheme.stages.length - 1}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 disabled:opacity-30 rounded-lg transition-colors"
                              title="下移此阶段"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingStage(JSON.parse(JSON.stringify(stage)));
                                setIsStageModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="编辑阶段与肥料明细"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStage(stage.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="删除此阶段"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-sm text-slate-500">该作物暂未配置水肥方案，您可以点击上方新增专属方案。</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Pest & Disease Gallery */}
      {activeTab === 'pest' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 gap-3 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {crop.name} 常见病虫害防治图谱 ({pests.length} 种)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                收录发病症状、危害等级、大类归属、化学农药推荐与水肥协同抗逆技术
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => {
                    setEditingPest({
                      id: `pest-${crop.id}-${Date.now()}`,
                      cropId: crop.id,
                      cropName: crop.name,
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
                          dosageRate: '1500倍液喷雾',
                          timing: '发病初期',
                        }
                      ],
                      fertilizerSynergy: '随水冲施傲生菌剂，叶面喷施糖醇钙与氨基酸水溶肥增强表皮韧性。',
                      keyNotes: '',
                      images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'],
                      updatedAt: new Date().toISOString().slice(0, 10),
                    });
                    setIsPestModalOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增病虫防治档案</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills for Pests */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-1.5 text-xs shadow-2xs">
            <span className="font-bold text-slate-500 mr-1">分类筛选:</span>
            <button
              onClick={() => setPestCategoryFilter('all')}
              className={`px-3 py-1 rounded-xl font-bold transition-all ${
                pestCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              全部 ({pests.length})
            </button>
            {availablePestCategories.map((cat) => {
              const count = pests.filter((p) => p.categoryGroup === cat).length;
              if (count === 0 && pestCategoryFilter !== cat) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setPestCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                    pestCategoryFilter === cat
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="ml-1 opacity-80 text-[10px] font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Pest Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPests.map((pest) => {
              const primaryImg = pest.images[0] || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80';
              return (
                <div
                  key={pest.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Photo area with Lightbox on click & multiple images gallery */}
                    <div className="h-52 relative overflow-hidden bg-slate-900 cursor-pointer">
                      <img
                        src={primaryImg}
                        alt={pest.name}
                        referrerPolicy="no-referrer"
                        onClick={() => setLightboxImage({ url: primaryImg, title: `${pest.name} - 典型症状` })}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        title="点击查看高清原图"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                      
                      {/* Category Group Tag */}
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/90 backdrop-blur-xs text-white shadow-xs">
                        {pest.categoryGroup || pest.type}
                      </span>

                      {/* Top Action buttons */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage({ url: primaryImg, title: `${pest.name} - 原图` });
                          }}
                          className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl shadow-md transition-transform hover:scale-110"
                          title="查看大图"
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
                                setIsPestModalOpen(true);
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

                      {/* Title & Danger Level Overlay */}
                      <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                        <h4 className="text-base font-black flex items-center justify-between">
                          <span>{pest.name}</span>
                          <span className="text-[11px] px-2 py-0.5 bg-red-600/80 backdrop-blur-xs rounded-md font-bold">
                            {pest.dangerLevel}
                          </span>
                        </h4>
                      </div>
                    </div>

                    {/* Multi-image thumbnail strip if multiple pictures */}
                    {pest.images && pest.images.length > 1 && (
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">多图拼图:</span>
                        {pest.images.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            onClick={() => setLightboxImage({ url: imgUrl, title: `${pest.name} - 图${imgIdx + 1}` })}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0 hover:border-amber-500 cursor-pointer transition-all hover:scale-105"
                          >
                            <img
                              src={imgUrl}
                              alt={`Pic ${imgIdx}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Body info */}
                    <div className="p-4 space-y-2.5 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">识别症状:</span>
                        <p className="text-slate-600 line-clamp-3 leading-relaxed">
                          {pest.symptoms}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-700 block mb-1">推荐化学防效用药:</span>
                        <div className="space-y-1">
                          {pest.chemicalControl.slice(0, 3).map((f) => (
                            <div key={f.id} className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] flex items-center justify-between">
                              <span className="font-medium text-slate-800">{f.formulaName}</span>
                              <span className="text-amber-700 font-mono font-bold">{f.dosageRate}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {pest.fertilizerSynergy && (
                        <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-100 text-[11px] text-emerald-800">
                          <strong className="block text-emerald-900 font-semibold mb-0.5">水肥协同抗逆技术:</strong>
                          {pest.fertilizerSynergy}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Deleted Schemes (Recycle Bin) */}
      {activeTab === 'deleted_schemes' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-rose-700 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>已删除方案列表 (回收站)</span>
              </h3>
              <p className="text-xs text-slate-400">
                可在此恢复已删除的方案，或进行不可逆的彻底销毁操作
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              共 {deletedSchemes.length} 个已删除方案
            </span>
          </div>

          <div className="space-y-3">
            {deletedSchemes.map((ds) => (
              <div
                key={ds.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-sm">{ds.title}</h4>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] rounded font-mono">
                      {ds.schemeType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    包含 {ds.stages.length} 个物候阶段 · 编制者: {ds.author}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onRestoreScheme(ds.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>恢复此方案</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`警告：彻底删除方案「${ds.title}」不可恢复，确认执行吗？`)) {
                        onPermanentDeleteScheme(ds.id);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>彻底销毁</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Create Scheme Modal with Customizable Scheme Types */}
      {/* ========================================================================= */}
      {isSchemeModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in"
          onClick={() => setIsSchemeModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                新建【{crop.name}】水肥一体化方案
              </h3>
              <button
                onClick={() => setIsSchemeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">方案名称 *</label>
                <input
                  type="text"
                  value={newSchemeTitle}
                  onChange={(e) => setNewSchemeTitle(e.target.value)}
                  placeholder={`例如: ${crop.name}全周期水肥一体化管理方案（新）`}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">方案类型 *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomSchemeType(!isCustomSchemeType)}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold"
                  >
                    {isCustomSchemeType ? '← 选择预设类型' : '+ 自定义输入新类型'}
                  </button>
                </div>

                {isCustomSchemeType ? (
                  <input
                    type="text"
                    value={customSchemeTypeInput}
                    onChange={(e) => setCustomSchemeTypeInput(e.target.value)}
                    placeholder="输入自定义方案类型，例如：优质高产攻坚方案、防裂增甜专项..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-emerald-50/40 text-emerald-900"
                  />
                ) : (
                  <select
                    value={newSchemeType}
                    onChange={(e) => setNewSchemeType(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    {availableSchemeTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">编制专家 / 单位</label>
                <input
                  type="text"
                  value={newSchemeAuthor}
                  onChange={(e) => setNewSchemeAuthor(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsSchemeModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateScheme}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                立即创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Full Pest / Disease Edit & Add Modal */}
      {/* ========================================================================= */}
      {isPestModalOpen && editingPest && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in"
          onClick={() => setIsPestModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingPest.name ? `编辑病虫档案：${editingPest.name}` : `新增【${crop.name}】病虫防治档案`}
              </h3>
              <button
                onClick={() => setIsPestModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">病虫害名称 *</label>
                  <input
                    type="text"
                    value={editingPest.name}
                    onChange={(e) => setEditingPest({ ...editingPest, name: e.target.value })}
                    placeholder="如: 白粉病、红蜘蛛、溃疡病、黄守瓜..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">大类归属 (分类) *</label>
                  <select
                    value={editingPest.categoryGroup || '真菌性病害（高等真菌）'}
                    onChange={(e) =>
                      setEditingPest({
                        ...editingPest,
                        categoryGroup: e.target.value as any,
                        type: e.target.value.includes('虫') ? '虫害' : '病害',
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    {availablePestCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">危害程度等级</label>
                  <select
                    value={editingPest.dangerLevel}
                    onChange={(e) =>
                      setEditingPest({ ...editingPest, dangerLevel: e.target.value as any })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="低度危害">低度危害</option>
                    <option value="中度危害">中度危害</option>
                    <option value="严重危害">严重危害</option>
                    <option value="爆发性毁灭">爆发性毁灭</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">高发时期 / 规律</label>
                  <input
                    type="text"
                    value={editingPest.occurrencePeriod || ''}
                    onChange={(e) =>
                      setEditingPest({ ...editingPest, occurrencePeriod: e.target.value })
                    }
                    placeholder="如: 苗期、开花坐果期、高温高湿季节..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Multi-image Uploader */}
              <div className="space-y-2">
                <ImageUploader
                  value={editingPest.images[0] || ''}
                  onChange={(img) => {
                    const newImages = [...editingPest.images];
                    newImages[0] = img;
                    setEditingPest({ ...editingPest, images: newImages.filter(Boolean) });
                  }}
                  label="主病状识别图片 (支持粘贴、拖放与文件选择)"
                  placeholder="截图后 Ctrl+V 粘贴进图，或拖放图片文件"
                  aspectRatio="video"
                  onPreviewOriginal={(url) => setLightboxImage({ url, title: `${editingPest.name} - 主图` })}
                />

                {/* Additional Images */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">更多发病时期多图拼图（如叶片、茎蔓、果实）:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPest({
                          ...editingPest,
                          images: [...editingPest.images, ''],
                        });
                      }}
                      className="text-xs text-emerald-700 hover:underline font-bold"
                    >
                      + 增加附加图片框
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {editingPest.images.slice(1).map((img, idx) => (
                      <div key={idx + 1} className="relative">
                        <ImageUploader
                          value={img}
                          onChange={(newImg) => {
                            const imgs = [...editingPest.images];
                            imgs[idx + 1] = newImg;
                            setEditingPest({ ...editingPest, images: imgs });
                          }}
                          label={`附加图 ${idx + 2}`}
                          placeholder="拖入或粘贴附加图"
                          aspectRatio="square"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const imgs = editingPest.images.filter((_, i) => i !== idx + 1);
                            setEditingPest({ ...editingPest, images: imgs });
                          }}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full text-[10px]"
                          title="移除此图"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">典型发病症状识别 *</label>
                <textarea
                  rows={2}
                  value={editingPest.symptoms}
                  onChange={(e) => setEditingPest({ ...editingPest, symptoms: e.target.value })}
                  placeholder="叶片正面形成白色粉斑，逐渐扩展，严重时叶片发黄枯焦..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Chemical formulas editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">推荐化学防效用药配方:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPest({
                        ...editingPest,
                        chemicalControl: [
                          ...editingPest.chemicalControl,
                          {
                            id: `f-${Date.now()}`,
                            formulaName: '',
                            dosageRate: '1500倍液',
                            timing: '发病初期',
                          }
                        ],
                      });
                    }}
                    className="text-xs text-amber-700 hover:underline font-bold"
                  >
                    + 添加药剂配方
                  </button>
                </div>

                <div className="space-y-1.5">
                  {editingPest.chemicalControl.map((form, formIdx) => (
                    <div key={form.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={form.formulaName}
                        onChange={(e) => {
                          const newForms = [...editingPest.chemicalControl];
                          newForms[formIdx].formulaName = e.target.value;
                          setEditingPest({ ...editingPest, chemicalControl: newForms });
                        }}
                        placeholder="药剂名称与有效成分"
                        className="flex-1 p-2 border border-slate-300 rounded-xl text-xs font-medium"
                      />
                      <input
                        type="text"
                        value={form.dosageRate}
                        onChange={(e) => {
                          const newForms = [...editingPest.chemicalControl];
                          newForms[formIdx].dosageRate = e.target.value;
                          setEditingPest({ ...editingPest, chemicalControl: newForms });
                        }}
                        placeholder="稀释浓度"
                        className="w-28 p-2 border border-slate-300 rounded-xl text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newForms = editingPest.chemicalControl.filter((_, i) => i !== formIdx);
                          setEditingPest({ ...editingPest, chemicalControl: newForms });
                        }}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">水肥协同抗逆技术与营养增效方案</label>
                <textarea
                  rows={2}
                  value={editingPest.fertilizerSynergy}
                  onChange={(e) =>
                    setEditingPest({ ...editingPest, fertilizerSynergy: e.target.value })
                  }
                  placeholder="随水冲施傲生菌剂建立有益菌屏障，叶面喷施糖醇钙镁与氨基酸水溶肥增厚细胞壁..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsPestModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSavePestModal}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                保存病虫档案
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Crop Edit Modal with ImageUploader */}
      {/* ========================================================================= */}
      {isCropModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in"
          onClick={() => setIsCropModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                编辑作物基本档案：{crop.name}
              </h3>
              <button
                onClick={() => setIsCropModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">作物名称 *</label>
                <input
                  type="text"
                  value={editCropName}
                  onChange={(e) => setEditCropName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">学名 / 拉丁名</label>
                  <input
                    type="text"
                    value={editScientificName}
                    onChange={(e) => setEditScientificName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-serif italic"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">生育周期</label>
                  <input
                    type="text"
                    value={editCycle}
                    onChange={(e) => setEditCycle(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">适宜产区</label>
                <input
                  type="text"
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <ImageUploader
                value={editCoverImage}
                onChange={setEditCoverImage}
                label="作物封面图 (支持粘贴、拖放与文件选择)"
                aspectRatio="video"
                onPreviewOriginal={(url) => setLightboxImage({ url, title: editCropName })}
              />

              <div>
                <label className="font-bold text-slate-700 block mb-1">作物简介与需肥特性</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                保存作物档案
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Stage & Fertilizer Items Edit Modal */}
      {/* ========================================================================= */}
      {isStageModalOpen && editingStage && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in"
          onClick={() => setIsStageModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                编辑物候时期与施肥配方明细
              </h3>
              <button
                onClick={() => setIsStageModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">主物候时期 *</label>
                  <input
                    type="text"
                    value={editingStage.stageName}
                    onChange={(e) =>
                      setEditingStage({ ...editingStage, stageName: e.target.value })
                    }
                    placeholder="例如: 幼苗期、伸蔓期、开花坐果期..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">次时期 / 阶段特征</label>
                  <input
                    type="text"
                    value={editingStage.subStageName || ''}
                    onChange={(e) =>
                      setEditingStage({ ...editingStage, subStageName: e.target.value })
                    }
                    placeholder="如: 定植后10-15天"
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">施肥节点</label>
                  <input
                    type="text"
                    value={editingStage.timing || ''}
                    onChange={(e) =>
                      setEditingStage({ ...editingStage, timing: e.target.value })
                    }
                    placeholder="如: 灌水前1天"
                    className="w-full p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Fertilizer Items Table within Stage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">该物候期肥料组合产品明细:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStage({
                        ...editingStage,
                        items: [
                          ...editingStage.items,
                          {
                            id: `itm-${Date.now()}`,
                            fertilizer: '施可收平衡型（20-20-20）',
                            dosage: '5kg/亩',
                            method: '滴灌',
                            remarks: '',
                          }
                        ],
                      });
                    }}
                    className="text-xs text-emerald-700 hover:underline font-bold"
                  >
                    + 添加肥料项目
                  </button>
                </div>

                <div className="space-y-2">
                  {editingStage.items.map((item, itIdx) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                    >
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">肥料产品</span>
                        <input
                          type="text"
                          value={item.fertilizer}
                          onChange={(e) => {
                            const newItems = [...editingStage.items];
                            newItems[itIdx].fertilizer = e.target.value;
                            setEditingStage({ ...editingStage, items: newItems });
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">用量 (亩用量)</span>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) => {
                            const newItems = [...editingStage.items];
                            newItems[itIdx].dosage = e.target.value;
                            setEditingStage({ ...editingStage, items: newItems });
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded-lg bg-white font-mono text-xs"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">施肥方式</span>
                        <input
                          type="text"
                          value={item.method}
                          onChange={(e) => {
                            const newItems = [...editingStage.items];
                            newItems[itIdx].method = e.target.value;
                            setEditingStage({ ...editingStage, items: newItems });
                          }}
                          className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <div className="flex-1">
                          <span className="text-[10px] text-slate-400 block mb-0.5">备注与要点</span>
                          <input
                            type="text"
                            value={item.remarks}
                            onChange={(e) => {
                              const newItems = [...editingStage.items];
                              newItems[itIdx].remarks = e.target.value;
                              setEditingStage({ ...editingStage, items: newItems });
                            }}
                            placeholder="如: 促根防死棵"
                            className="w-full p-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const newItems = editingStage.items.filter((_, i) => i !== itIdx);
                            setEditingStage({ ...editingStage, items: newItems });
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg mt-4"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsStageModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentScheme) return;
                  const newStages = [...currentScheme.stages];
                  const existingIdx = newStages.findIndex((s) => s.id === editingStage.id);
                  if (existingIdx >= 0) {
                    newStages[existingIdx] = editingStage;
                  } else {
                    newStages.push(editingStage);
                  }
                  newStages.forEach((s, i) => {
                    s.order = i + 1;
                  });
                  onUpdateScheme({
                    ...currentScheme,
                    stages: newStages,
                    updatedAt: new Date().toISOString().slice(0, 10),
                  });
                  setIsStageModalOpen(false);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                保存物候阶段
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
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
