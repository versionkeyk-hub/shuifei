export type RoleType = 'super_admin' | 'admin' | 'expert' | 'member' | 'viewer' | 'pending';
export type UserRole = RoleType;
export type UserStatus = 'active' | 'approved' | 'pending' | 'pending_approval' | 'rejected' | 'disabled';

export interface UserCustomPermissions {
  canEditAllSchemes?: boolean; // 修改/编辑任意施肥方案
  canEditPests?: boolean; // 编辑与新增病虫害档案
  canDeletePests?: boolean; // 删除病虫害档案
  canViewLocalImport?: boolean; // 访问本地离线识别录入
  canExportWithoutWatermark?: boolean; // 无水印/高清导出
  canManageWatermark?: boolean; // 配置水印与公章
  canManageCommunity?: boolean; // 管理留言区(置顶/删除留言)
  canManageUsers?: boolean; // 审核用户与分配权限
  canEditSiteTexts?: boolean; // 编辑全站文案与界面字段
  canManageProducts?: boolean; // 管理官方肥料产品库
}

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  realName: string;
  role: RoleType;
  status: UserStatus;
  email?: string;
  phone?: string;
  company?: string;
  department?: string;
  applyReason?: string;
  registeredAt: string;
  approvedAt?: string;
  approvedBy?: string;
  lastLoginAt?: string;
  avatarUrl?: string;
  canViewLocalImport?: boolean;
  canEditAllSchemes?: boolean;
  customPermissions?: UserCustomPermissions;
}

// 互动留言区
export interface CommunityReply {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: RoleType;
  content: string;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: RoleType;
  authorCompany?: string;
  content: string;
  images?: string[];
  likesCount: number;
  likedUserIds?: string[];
  isLikedByMe?: boolean;
  createdAt: string;
  isPinned?: boolean;
  cropTag?: string;
  category?: '经验交流' | '技术求助' | '调配心得' | '病害求诊' | '其他';
  replies?: CommunityReply[];
}

export interface CropCategory {
  id: string;
  name: string;
  icon: string;
  image?: string;
  description: string;
  color: string;
}

export interface Crop {
  id: string;
  categoryId: string;
  name: string;
  aliases: string[];
  scientificName?: string;
  growthCycle?: string;
  suitableRegions?: string;
  coverImage: string;
  description: string;
  schemeCount: number;
  diseaseCount: number;
  tags: string[];
  customFieldValues?: Record<string, string | string[]>;
  createdAt: string;
  updatedAt: string;
}

export interface FertilizerStageItem {
  id: string;
  fertilizer: string;
  dosage: string;
  method: string;
  remarks: string;
  isKeyPoint?: boolean;
}

export interface FertilizerStage {
  id: string;
  stageName: string;
  subStageName?: string;
  order: number;
  timing?: string;
  items: FertilizerStageItem[];
  managementTips?: string;
  customFieldValues?: Record<string, string | string[]>;
}

export interface FertilizationScheme {
  id: string;
  cropId: string;
  cropName: string;
  title: string;
  schemeCode?: string;
  schemeType: string; // 支持自定义方案类型
  author: string;
  version: string;
  isPublished: boolean;
  stages: FertilizerStage[];
  summary?: string;
  generalNotes?: string;
  customFieldValues?: Record<string, string | string[]>;
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChemicalFormula {
  id: string;
  formulaName: string;
  dosageRate: string;
  timing: string;
  purpose?: string;
  caution?: string;
}

export type PestCategoryGroup = 
  | '虫害'
  | '真菌性病害（高等真菌）'
  | '真菌性病害（低等真菌）'
  | '细菌性病害'
  | '病毒病'
  | '线虫病'
  | '生理性病害'
  | '药害与肥害'
  | '环境与灾害胁迫'
  | string;

export interface PestDiseaseItem {
  id: string;
  cropId: string;
  cropName: string;
  cropIds?: string[]; // 关联多个作物ID
  cropNames?: string[]; // 关联多个作物名称
  isGeneralCrop?: boolean; // 通用/不限具体单一作物
  name: string;
  type: '病害' | '虫害' | '生理性病害' | string;
  categoryGroup?: PestCategoryGroup;
  dangerLevel: '低度危害' | '中度危害' | '严重危害' | '爆发性毁灭' | string;
  symptoms: string;
  occurrencePeriod: string;
  occurrenceRules: string;
  agriculturalControl: string;
  chemicalControl: ChemicalFormula[];
  fertilizerSynergy: string;
  keyNotes: string;
  images: string[];
  customFieldValues?: Record<string, string | string[]>;
  updatedAt: string;
}

// 高清 PNG 水印预设印章
export interface WatermarkImagePreset {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  imageUrl: string;
  stampColor: 'red' | 'blue' | 'emerald' | 'amber';
}

export interface WatermarkConfig {
  enabled: boolean;
  selectedPresetId?: string;
  presetText?: string;
  text: string;
  opacity?: number; // 0.05 - 0.6
  fontSize?: number; // 14 - 36
  color?: string; // hex
  position?: 'diagonal_tiled' | 'bottom_right' | 'both';
  angle?: number; // -45 to 45
  density?: 'sparse' | 'normal' | 'dense';
  showStamp?: boolean;
  stampOpacity?: number;
  customWatermarkImage?: string;
}

export interface FertilizerProduct {
  id: string;
  name: string;
  category: '水溶肥' | '微生物菌剂' | '有机肥' | '复合肥' | '叶面肥' | string;
  specification: string;
  mainIngredients: string;
  isOfficialProduct?: boolean;
}

export interface VersionLog {
  version: string;
  releaseDate: string;
  title: string;
  changes: string[];
  isCurrent?: boolean;
}

// 页面模块与组件控制
export interface PageModuleConfig {
  id: string;
  name: string;
  description: string;
  category: 'crop_detail' | 'scheme' | 'pest' | 'global';
  enabled: boolean;
  order: number;
  icon?: string;
}

// 自定义字段定义
export interface CustomFieldDefinition {
  id: string;
  target: 'scheme' | 'crop' | 'pest' | 'stage';
  label: string;
  fieldType: 'text' | 'textarea' | 'select' | 'tags' | 'number';
  placeholder?: string;
  options?: string[]; // 下拉选项
  defaultValue?: string;
  required?: boolean;
  enabled: boolean;
}

export interface SystemSettings {
  siteName: string;
  siteSubtitle: string;
  siteLogo: string;
  siteLogoImage?: string; // 用户上传的高清图片 LOGO (Base64 或 URL)
  companyName?: string;
  logoType: 'icon' | 'image';
  navTitles?: {
    dashboard?: string;
    crops?: string;
    pests?: string;
    community?: string;
    local_import?: string;
    product_quiz?: string;
    product_library?: string;
    admin_settings?: string;
    users_approval?: string;
    profile_settings?: string;
  };
  siteTexts?: Record<string, string>; // 全站静态字段与自定义文案字典 (键值对)
  siteImages?: Record<string, string>; // 全站静态图片与自定义Banner字典 (键值对)
  visualTextEditMode?: boolean; // 是否开启全站可视化文案修改模式
  schemeTypes: string[]; // 自定义方案类型列表
  pestCategoryGroups: string[]; // 自定义病虫分类
  watermarkImagePresets: WatermarkImagePreset[];
  defaultWatermarkPresetId: string;
  watermarkConfig: WatermarkConfig;
  cropCategories: CropCategory[];
  fertilizerProducts: string[];
  products: FertilizerProduct[];
  fertilizerMethods: string[];
  applicationMethods: string[];
  dosageUnits: string[];
  pageModules: PageModuleConfig[]; // 预设模块与组件开关
  customFields: CustomFieldDefinition[]; // 自定义字段列表
}

export type NavTab = 
  | 'dashboard'
  | 'crops'
  | 'pests'
  | 'community'
  | 'product_quiz'
  | 'product_library'
  | 'pesticide_mixing'
  | 'product_catalog'
  | 'navigation_settings'
  | 'local_import'
  | 'export_studio'
  | 'admin_settings'
  | 'users_approval'
  | 'profile_settings';

export interface GlobalSearchResult {
  type: 'crop' | 'scheme' | 'disease' | 'product';
  id: string;
  title: string;
  subtitle: string;
  cropId: string;
  cropName: string;
  highlightMatch: string;
  tag?: string;
}
