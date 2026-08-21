import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Package,
  Save,
  RotateCcw,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  Image as ImageIcon,
  Shield,
  Layers,
  Settings,
  Tag,
  LayoutGrid,
  FileText,
  Search,
  Edit3,
  Type
} from 'lucide-react';
import { SystemSettings, FertilizerProduct, AppUser, CustomFieldDefinition, PageModuleConfig, PestCategoryGroup } from '../types';
import { exportAllDataAsJSON, importAllDataFromJSON, resetToInitialData } from '../lib/storage';
import { DEFAULT_SITE_TEXTS, SiteTextItem } from '../lib/siteTexts';
import { ImageUploader } from './ImageUploader';

interface AdminSettingsViewProps {
  settings: SystemSettings;
  currentUser: AppUser | null;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onDataReset: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings,
  currentUser,
  onUpdateSettings,
  onDataReset,
}) => {
  const [formData, setFormData] = useState<SystemSettings>({
    ...settings,
    siteTexts: settings.siteTexts || {},
    schemeTypes: settings.schemeTypes || ['全周期方案', '水肥一体化专用', '幼树提苗', '成年结果树', '专项攻坚方案'],
    pestCategoryGroups: settings.pestCategoryGroups || ['虫害', '真菌性病害（高等真菌）', '真菌性病害（低等真菌）', '细菌性病害', '病毒病', '线虫病', '生理性病害', '药害与肥害', '环境与灾害胁迫'],
    pageModules: settings.pageModules || [
      { id: 'mod-summary', name: '方案综述与核心要点', enabled: true, category: 'scheme', order: 1, description: '作物全生育期水肥概览与专家导言' },
      { id: 'mod-table', name: '物候阶段水肥表', enabled: true, category: 'scheme', order: 2, description: '物候期、管理目标、亩用量及施肥方法' },
      { id: 'mod-mindmap', name: '物候演进思维导图', enabled: true, category: 'scheme', order: 3, description: '全生命周期物候与养分演进可视化' },
      { id: 'mod-pests', name: '常见病虫害防治图谱', enabled: true, category: 'pest', order: 4, description: '症状特征多图对比与农药配方' },
      { id: 'mod-synergy', name: '水肥协同抗逆技术', enabled: true, category: 'pest', order: 5, description: '菌剂配合微量元素提高作物抗逆性' },
      { id: 'mod-notes', name: '通用注意事项与调配规程', enabled: true, category: 'global', order: 6, description: '母液稀释顺序与混配安全规程' },
      { id: 'mod-stamp', name: '红头文件公章认证', enabled: true, category: 'global', order: 7, description: '专家技术组出具资质红章' }
    ],
    customFields: settings.customFields || []
  });

  const [activeTab, setActiveTab] = useState<'general' | 'site_texts' | 'schemetypes' | 'pests' | 'modules' | 'products' | 'backup'>('general');
  const [newProduct, setNewProduct] = useState({ name: '', category: '水溶肥', specification: '', mainIngredients: '' });
  const [newSchemeType, setNewSchemeType] = useState('');
  const [newPestCategory, setNewPestCategory] = useState('');
  
  // Site text filter & search
  const [textSearch, setTextSearch] = useState('');
  const [textCategory, setTextCategory] = useState<string>('all');

  const [newCustomField, setNewCustomField] = useState<Partial<CustomFieldDefinition>>({
    label: '',
    target: 'scheme',
    fieldType: 'text',
    required: false,
    enabled: true,
    options: []
  });
  const [customFieldOptionInput, setCustomFieldOptionInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    onUpdateSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTextChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      siteTexts: {
        ...(formData.siteTexts || {}),
        [key]: value,
      },
    });
  };

  const handleResetSingleText = (key: string) => {
    const updated = { ...(formData.siteTexts || {}) };
    delete updated[key];
    setFormData({ ...formData, siteTexts: updated });
  };

  const handleResetAllTexts = () => {
    if (confirm('确定要将所有界面的自定义文案恢复为系统默认吗？')) {
      setFormData({ ...formData, siteTexts: {} });
    }
  };

  const handleAddProduct = () => {
    if (!newProduct.name.trim()) return;
    const prod: FertilizerProduct = {
      id: `prod-${Date.now()}`,
      name: newProduct.name.trim(),
      category: newProduct.category as any,
      specification: newProduct.specification || '20kg/袋',
      mainIngredients: newProduct.mainIngredients || '高浓缩活性养分',
      isOfficialProduct: true,
    };
    setFormData({
      ...formData,
      products: [...formData.products, prod],
    });
    setNewProduct({ name: '', category: '水溶肥', specification: '', mainIngredients: '' });
  };

  const handleDeleteProduct = (id: string) => {
    setFormData({
      ...formData,
      products: formData.products.filter((p) => p.id !== id),
    });
  };

  const handleAddSchemeType = () => {
    if (!newSchemeType.trim() || formData.schemeTypes?.includes(newSchemeType.trim())) return;
    setFormData({
      ...formData,
      schemeTypes: [...(formData.schemeTypes || []), newSchemeType.trim()]
    });
    setNewSchemeType('');
  };

  const handleDeleteSchemeType = (type: string) => {
    setFormData({
      ...formData,
      schemeTypes: (formData.schemeTypes || []).filter((t) => t !== type)
    });
  };

  const handleAddPestCategory = () => {
    if (!newPestCategory.trim() || formData.pestCategoryGroups?.includes(newPestCategory.trim() as any)) return;
    setFormData({
      ...formData,
      pestCategoryGroups: [...(formData.pestCategoryGroups || []), newPestCategory.trim() as any]
    });
    setNewPestCategory('');
  };

  const handleDeletePestCategory = (cat: PestCategoryGroup) => {
    setFormData({
      ...formData,
      pestCategoryGroups: (formData.pestCategoryGroups || []).filter((c) => c !== cat)
    });
  };

  const handleToggleModule = (modId: string) => {
    const updated = (formData.pageModules || []).map((m) =>
      m.id === modId ? { ...m, enabled: !m.enabled } : m
    );
    setFormData({ ...formData, pageModules: updated });
  };

  const handleAddCustomField = () => {
    if (!newCustomField.label?.trim()) return;
    const field: CustomFieldDefinition = {
      id: `cf-${Date.now()}`,
      label: newCustomField.label.trim(),
      target: newCustomField.target || 'scheme',
      fieldType: newCustomField.fieldType || 'text',
      required: !!newCustomField.required,
      enabled: true,
      options: customFieldOptionInput ? customFieldOptionInput.split(/[,，]/).map((s) => s.trim()).filter(Boolean) : []
    };
    setFormData({
      ...formData,
      customFields: [...(formData.customFields || []), field]
    });
    setNewCustomField({ label: '', target: 'scheme', fieldType: 'text', required: false, enabled: true, options: [] });
    setCustomFieldOptionInput('');
  };

  const handleDeleteCustomField = (id: string) => {
    setFormData({
      ...formData,
      customFields: (formData.customFields || []).filter((f) => f.id !== id)
    });
  };

  const filteredSiteTexts = DEFAULT_SITE_TEXTS.filter((item) => {
    const matchCat = textCategory === 'all' || item.category === textCategory;
    const q = textSearch.toLowerCase().trim();
    const matchSearch =
      !q ||
      item.label.toLowerCase().includes(q) ||
      item.key.toLowerCase().includes(q) ||
      (formData.siteTexts?.[item.key] || item.defaultValue).toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 mb-1">
            <SlidersHorizontal className="w-4 h-4" />
            <span>总管理员全功能中枢面板</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            全站字段文字修改、方案类型自定义与产品库
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            总管理员可像 PPT 一样随心修改全站所有静态字段与标语，自定义方案类型、模块开关及产品配方库。
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{saveSuccess ? '✓ 已保存设置！' : '保存全部配置'}</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 flex flex-wrap gap-1.5 shadow-2xs">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'general' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          品牌与站点信息
        </button>

        <button
          onClick={() => setActiveTab('site_texts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'site_texts' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>全站字段与文案定制 (PPT式修改)</span>
        </button>

        <button
          onClick={() => setActiveTab('schemetypes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'schemetypes' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          水肥方案类型 ({formData.schemeTypes?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('pests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pests' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          病害分类大类 ({formData.pestCategoryGroups?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('modules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'modules' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          页面模块与自定义字段
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'products' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          肥料产品库 ({formData.products.length})
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'backup' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          数据备份与恢复
        </button>
      </div>

      {/* Tab 1: General Info */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-5 shadow-xs">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
            <Settings className="w-4 h-4 text-emerald-600" />
            <span>站点名称、LOGO 与企业标识</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">系统名称 (Site Name) *</label>
              <input
                type="text"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">系统副标题 / 英文标识</label>
              <input
                type="text"
                value={formData.siteSubtitle}
                onChange={(e) => setFormData({ ...formData, siteSubtitle: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-emerald-500 outline-hidden font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">公司/技术研发中心名称</label>
              <input
                type="text"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="如: 惠民皓天（寿光）农业科技有限公司"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">LOGO 简称字 (无图片时的文字备选，如: 惠)</label>
              <input
                type="text"
                maxLength={4}
                value={formData.siteLogo || ''}
                onChange={(e) => setFormData({ ...formData, siteLogo: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center text-emerald-700 focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          {/* Logo Image Uploader */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>系统官方 LOGO 图标上传 (支持图片文件、粘贴与拖放)</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  上传公司或品牌真实高清 Logo 图片（推荐正方形或透明 PNG 格式），将自动显示于侧边栏、顶部导航及方案导出抬头。
                </p>
              </div>

              {formData.siteLogoImage && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, siteLogoImage: '' })}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline"
                >
                  清除已上传图片
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
              {/* Preview Box */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">当前生效预览</span>
                <div className="w-16 h-16 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center overflow-hidden p-1.5">
                  {formData.siteLogoImage ? (
                    <img
                      src={formData.siteLogoImage}
                      alt="Logo Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-xl">
                      {formData.siteLogo || '惠'}
                    </div>
                  )}
                </div>
              </div>

              {/* Uploader Box */}
              <div className="flex-1 w-full">
                <ImageUploader
                  value={formData.siteLogoImage || ''}
                  onChange={(imgUrl) => setFormData({ ...formData, siteLogoImage: imgUrl })}
                  label="点击或拖拽上传企业 LOGO 图片 (JPG/PNG/WebP/SVG)"
                  placeholder="点击选择Logo、拖拽文件或直接按 Ctrl+V 粘贴图片"
                  aspectRatio="square"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Site Texts Global Editor (PPT style custom fields) */}
      {activeTab === 'site_texts' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Type className="w-4 h-4 text-purple-600" />
                <span>全站静态字段与界面文案定制中心 (PPT式随心修改)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                支持像 PPT 一样自由修改全站任意界面的静态文本、表格列名、导语与标题，修改后全站即时生效。
              </p>
            </div>

            <button
              onClick={handleResetAllTexts}
              className="text-xs text-slate-500 hover:text-rose-600 font-bold px-3 py-1.5 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
            >
              恢复全部文案为默认
            </button>
          </div>

          {/* Search and Category Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={textSearch}
                onChange={(e) => setTextSearch(e.target.value)}
                placeholder="搜索字段名称或文案内容..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-purple-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 shrink-0">所属模块:</span>
              <select
                value={textCategory}
                onChange={(e) => setTextCategory(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-hidden focus:border-purple-500 font-bold"
              >
                <option value="all">全部模块</option>
                <option value="导航与系统">导航与系统</option>
                <option value="看板与概览">看板与概览</option>
                <option value="方案与物候">方案与物候</option>
                <option value="病虫害图谱">病虫害图谱</option>
                <option value="导出与水印">导出与水印</option>
                <option value="实训与互动">实训与互动</option>
              </select>
            </div>
          </div>

          {/* Texts List */}
          <div className="space-y-4">
            {filteredSiteTexts.map((item) => {
              const currentValue = formData.siteTexts?.[item.key] ?? item.defaultValue;
              const isModified = formData.siteTexts?.[item.key] !== undefined && formData.siteTexts[item.key] !== item.defaultValue;

              return (
                <div
                  key={item.key}
                  className={`p-4 rounded-2xl border transition-all space-y-2 ${
                    isModified
                      ? 'border-purple-300 bg-purple-50/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.label}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
                        {item.key}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-bold">
                        {item.category}
                      </span>
                    </div>

                    {isModified && (
                      <button
                        onClick={() => handleResetSingleText(item.key)}
                        className="text-[11px] text-purple-600 hover:text-purple-800 font-bold hover:underline"
                      >
                        还原默认
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">{item.description}</p>

                  <textarea
                    rows={item.defaultValue.length > 30 ? 2 : 1}
                    value={currentValue}
                    onChange={(e) => handleTextChange(item.key, e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden transition-all"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Scheme Types */}
      {activeTab === 'schemetypes' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div className="border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>自定义水肥方案类型字典</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              定义专家在创建施肥方案时可选择的方案类型（如：全周期方案、滴灌专用、幼树提苗等）。
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newSchemeType}
              onChange={(e) => setNewSchemeType(e.target.value)}
              placeholder="输入新方案类型名称 (如: 促根壮苗专用方案)"
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-emerald-500 outline-hidden"
            />
            <button
              onClick={handleAddSchemeType}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>添加类型</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(formData.schemeTypes || []).map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 group hover:border-emerald-300"
              >
                <span>{type}</span>
                <button
                  onClick={() => handleDeleteSchemeType(type)}
                  className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                  title="删除该类型"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Pest Category Groups */}
      {activeTab === 'pests' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div className="border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>病虫害分类大类管理</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              自定义病虫害图谱库的分类组别（如虫害、真菌性病害、生理性病害、药害肥害等）。
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newPestCategory}
              onChange={(e) => setNewPestCategory(e.target.value)}
              placeholder="输入新病害分类 (如: 土传线虫综合症)"
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-emerald-500 outline-hidden"
            />
            <button
              onClick={handleAddPestCategory}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>添加大类</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {(formData.pestCategoryGroups || []).map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 group hover:border-amber-400"
              >
                <span>{cat}</span>
                <button
                  onClick={() => handleDeletePestCategory(cat as any)}
                  className="text-amber-400 hover:text-rose-600 p-0.5 rounded"
                  title="删除该分类"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Page Modules & Custom Fields */}
      {activeTab === 'modules' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b pb-3">
              <LayoutGrid className="w-4 h-4 text-emerald-600" />
              <span>预设页面模块开关与组件可见性</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {(formData.pageModules || []).map((mod) => (
                <div
                  key={mod.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{mod.name}</span>
                    <span className="text-[10px] text-slate-400">{mod.description}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={mod.enabled}
                    onChange={() => handleToggleModule(mod.id)}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>自定义动态字段扩展</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <input
                type="text"
                value={newCustomField.label}
                onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })}
                placeholder="字段名称 (如: 目标产量)"
                className="p-2 border border-slate-300 rounded-xl bg-white font-bold"
              />
              <select
                value={newCustomField.target}
                onChange={(e) => setNewCustomField({ ...newCustomField, target: e.target.value as any })}
                className="p-2 border border-slate-300 rounded-xl bg-white font-bold"
              >
                <option value="scheme">施肥方案扩展字段</option>
                <option value="crop">作物档案扩展字段</option>
                <option value="pest">病虫害扩展字段</option>
                <option value="stage">物候期扩展字段</option>
              </select>
              <select
                value={newCustomField.fieldType}
                onChange={(e) => setNewCustomField({ ...newCustomField, fieldType: e.target.value as any })}
                className="p-2 border border-slate-300 rounded-xl bg-white font-bold"
              >
                <option value="text">单行文本</option>
                <option value="textarea">多行长文本</option>
                <option value="number">数字指标</option>
                <option value="select">下拉选项</option>
              </select>
              <button
                onClick={handleAddCustomField}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>添加字段</span>
              </button>
            </div>

            <div className="space-y-2">
              {(formData.customFields || []).map((cf) => (
                <div
                  key={cf.id}
                  className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">{cf.label}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {cf.target === 'scheme' ? '方案' : cf.target === 'crop' ? '作物' : cf.target === 'pest' ? '病虫' : '物候期'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">[{cf.fieldType}]</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCustomField(cf.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Official Products Library */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div className="border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>官方核心肥料产品库维护</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              在此维护的产品将自动呈现在施肥方案的「推荐产品」快捷候选列表中。
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="产品名称 (如: 傲生微生物菌剂)"
                className="p-2 border border-slate-300 rounded-xl bg-white font-bold"
              />
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="p-2 border border-slate-300 rounded-xl bg-white font-bold"
              >
                <option value="水溶肥">水溶肥</option>
                <option value="微生物菌剂">微生物菌剂</option>
                <option value="有机肥">有机肥</option>
                <option value="叶面肥">叶面肥</option>
                <option value="复合肥">复合肥</option>
              </select>
              <input
                type="text"
                value={newProduct.specification}
                onChange={(e) => setNewProduct({ ...newProduct, specification: e.target.value })}
                placeholder="规格 (如: 20kg/桶)"
                className="p-2 border border-slate-300 rounded-xl bg-white font-mono"
              />
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>添加产品</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {formData.products.map((prod) => (
              <div
                key={prod.id}
                className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs hover:border-emerald-400 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{prod.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium">
                      {prod.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">{prod.specification}</span>
                </div>
                <button
                  onClick={() => handleDeleteProduct(prod.id)}
                  className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50"
                  title="删除产品"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
          <div className="border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>全量数据备份导出与恢复</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              可一键将整个系统（作物、水肥方案、病虫害、产品库、权限账号、水印设置与自定义文案）打包导出为 JSON 备份。
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <span>导出全部平台数据备份 (JSON)</span>
              </h4>
              <p className="text-xs text-slate-500">
                将当前系统的所有自定义作物方案、病虫害及权限数据导出为离线备份文件。
              </p>
              <button
                onClick={exportAllDataAsJSON}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>立即下载 JSON 备份文件</span>
              </button>
            </div>

            <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>重置回出厂默认数据</span>
              </h4>
              <p className="text-xs text-slate-500">
                清空本地缓存并恢复到最完整的初始示范数据（包含哈密瓜全套方案与图谱）。
              </p>
              <button
                onClick={() => {
                  if (confirm('确定要重置所有数据为初始状态吗？此操作将清空您的本地编辑内容。')) {
                    resetToInitialData();
                    onDataReset();
                    alert('已恢复为初始数据！');
                  }
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>重置为出厂数据</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
