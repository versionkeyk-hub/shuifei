// 全局静态字段与文案管理字典 (默认值库与取值器)

export interface SiteTextItem {
  key: string;
  category: '导航与系统' | '看板与概览' | '方案与物候' | '病虫害图谱' | '导出与水印' | '实训与互动';
  label: string;
  defaultValue: string;
  description: string;
}

export const DEFAULT_SITE_TEXTS: SiteTextItem[] = [
  // 导航与系统
  {
    key: 'site_header_title',
    category: '导航与系统',
    label: '顶部主标题',
    defaultValue: '农技专家智库与全周期精准施肥方案中枢',
    description: '顶部横幅或主界面核心标语',
  },
  {
    key: 'site_brand_tag',
    category: '导航与系统',
    label: '品牌英文副标',
    defaultValue: 'HMHT AGRI TECH · EXPERT KNOWLEDGE BASE',
    description: '品牌标识下方的英文小标',
  },
  {
    key: 'nav_dashboard_label',
    category: '导航与系统',
    label: '导航栏-系统看板名称',
    defaultValue: '系统看板',
    description: '左侧导航看板菜单项文本',
  },
  {
    key: 'nav_crops_label',
    category: '导航与系统',
    label: '导航栏-作物与施肥方案名称',
    defaultValue: '作物与施肥方案',
    description: '左侧导航方案库菜单项文本',
  },
  {
    key: 'nav_pests_label',
    category: '导航与系统',
    label: '导航栏-病虫害图谱名称',
    defaultValue: '病虫害图谱',
    description: '左侧导航病虫害菜单项文本',
  },
  {
    key: 'nav_community_label',
    category: '导航与系统',
    label: '导航栏-互动留言区名称',
    defaultValue: '互动交流与留言',
    description: '左侧导航留言交流菜单项文本',
  },
  {
    key: 'nav_quiz_label',
    category: '导航与系统',
    label: '导航栏-产品实训名称',
    defaultValue: '产品分类实训',
    description: '左侧导航实训库菜单项文本',
  },
  {
    key: 'nav_local_import_label',
    category: '导航与系统',
    label: '导航栏-离线录入名称',
    defaultValue: '本地离线识别录入',
    description: '左侧导航Word/Excel导入菜单项文本',
  },

  // 看板与概览
  {
    key: 'dashboard_welcome_title',
    category: '看板与概览',
    label: '看板欢迎语大标题',
    defaultValue: '欢迎使用惠民皓天农技专家智库',
    description: '看板上方欢迎区域大字标题',
  },
  {
    key: 'dashboard_welcome_desc',
    category: '看板与概览',
    label: '看板副标题说明',
    defaultValue: '专注大田、果树与经济作物全周期水肥配方与精准植保抗逆解决方案',
    description: '看板欢迎语下方描述',
  },
  {
    key: 'dashboard_quick_search_placeholder',
    category: '看板与概览',
    label: '看板全局搜索框提示语',
    defaultValue: '全站搜索作物、施肥方案、病虫害图谱、农药配方或官方肥料产品...',
    description: '顶部全局搜索框内占位文本',
  },

  // 方案与物候
  {
    key: 'crop_detail_scheme_tab',
    category: '方案与物候',
    label: '作物详情-施肥方案选项卡名称',
    defaultValue: '全周期水肥方案',
    description: '作物详情页施肥方案 Tab 标题',
  },
  {
    key: 'crop_detail_pest_tab',
    category: '方案与物候',
    label: '作物详情-病虫防治选项卡名称',
    defaultValue: '专属病虫害防治图谱',
    description: '作物详情页病虫害 Tab 标题',
  },
  {
    key: 'scheme_column_stage',
    category: '方案与物候',
    label: '方案表格-物候期列名',
    defaultValue: '物候期 / 生育关键阶段',
    description: '方案表格第一列标题',
  },
  {
    key: 'scheme_column_purpose',
    category: '方案与物候',
    label: '方案表格-管理目标列名',
    defaultValue: '管理目标 / 生理要点',
    description: '方案表格管理目标列标题',
  },
  {
    key: 'scheme_column_fertilizer',
    category: '方案与物候',
    label: '方案表格-推荐配方产品列名',
    defaultValue: '推荐配方及核心用肥',
    description: '方案表格用肥列标题',
  },
  {
    key: 'scheme_column_dosage',
    category: '方案与物候',
    label: '方案表格-亩用量/浓度列名',
    defaultValue: '亩用量 / 稀释倍数',
    description: '方案表格用量列标题',
  },
  {
    key: 'scheme_column_method',
    category: '方案与物候',
    label: '方案表格-施肥方法列名',
    defaultValue: '施肥方式 / 配套农艺',
    description: '方案表格施肥方式列标题',
  },
  {
    key: 'scheme_column_notes',
    category: '方案与物候',
    label: '方案表格-注意事项列名',
    defaultValue: '技术指导与注意事项',
    description: '方案表格注意事项列标题',
  },

  // 病虫害图谱
  {
    key: 'pest_gallery_title',
    category: '病虫害图谱',
    label: '图谱大标题',
    defaultValue: '病虫害诊断与防治图谱库',
    description: '病虫害图谱页顶部标题',
  },
  {
    key: 'pest_gallery_subtitle',
    category: '病虫害图谱',
    label: '图谱副标题',
    defaultValue: '汇聚作物常见病害、虫害、生理性病害与水肥协同抗逆技术',
    description: '病虫害图谱页副标题',
  },
  {
    key: 'pest_card_symptoms_label',
    category: '病虫害图谱',
    label: '病害卡片-症状识别特征标签',
    defaultValue: '识别特征与危害症状',
    description: '病害卡片上症状小标题',
  },
  {
    key: 'pest_card_chemical_label',
    category: '病虫害图谱',
    label: '病害卡片-化学防治标签',
    defaultValue: '推荐化学防效用药',
    description: '病害卡片化学用药小标题',
  },
  {
    key: 'pest_card_synergy_label',
    category: '病虫害图谱',
    label: '病害卡片-水肥协同标签',
    defaultValue: '水肥协同抗逆技术',
    description: '病害卡片水肥协同小标题',
  },

  // 导出与水印
  {
    key: 'watermark_default_label',
    category: '导出与水印',
    label: '全幅水印默认文案',
    defaultValue: '惠民皓天技术中心内部方案 · 严禁盗用',
    description: '方案导出时铺满全页的防伪水印文字',
  },
  {
    key: 'export_studio_title',
    category: '导出与水印',
    label: '导出工坊大标题',
    defaultValue: '高清方案导出与水印印章定制工坊',
    description: '导出工坊页面大标题',
  },

  // 实训与互动
  {
    key: 'community_welcome_tip',
    category: '实训与互动',
    label: '留言区欢迎引导语',
    defaultValue: '欢迎农技同仁交流田间技术、施肥经验与配方建议，共建专业技术智库！',
    description: '互动交流区顶部的提示语',
  }
];

/**
 * 获取文案函数，如果系统设置中有自定义文案则优先取用，否则取默认值
 */
export function getSiteText(
  key: string,
  siteTexts?: Record<string, string>,
  fallbackText?: string
): string {
  if (siteTexts && siteTexts[key] !== undefined && siteTexts[key].trim() !== '') {
    return siteTexts[key];
  }
  const defaultDef = DEFAULT_SITE_TEXTS.find((item) => item.key === key);
  if (defaultDef) {
    return defaultDef.defaultValue;
  }
  return fallbackText || '';
}
