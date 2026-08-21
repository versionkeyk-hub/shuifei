// 产品分类互动 — 5维分类练习数据与题库答案
export interface QuizProduct {
  id: string;
  name: string;
  brand: "nxw" | "ctm" | string;
  brandName?: string;
  seriesId?: string;
  seriesName?: string;
  description?: string;
}

export interface ProductSeriesGroup {
  id: string;
  name: string;
  brand: "nxw" | "ctm" | "mixed";
  badge: string;
  color: string;
  productIds: string[];
  description: string;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  userName: string;
  avatarBg: string;
  roleTitle: string;
  department: string;
  score: number; // 满分 310 分 (每款产品 10 分)
  maxScore: number;
  percentage: number; // 百分比
  durationSeconds: number;
  submittedAt: string;
  rank?: number;
  isCurrentUser?: boolean;
}

export interface QuizSubmissionHistoryItem {
  id: string;
  userId: string;
  userName: string;
  submittedAt: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  durationSeconds: number;
  completedCount: number;
  totalProductsCount: number;
  seriesScores: Record<
    string,
    {
      seriesId: string;
      name: string;
      score: number;
      maxScore: number;
      percentage: number;
      productCount: number;
    }
  >;
  productScores: Record<
    string,
    {
      productId: string;
      productName: string;
      score: number;
      maxScore: number;
      percentage: number;
      correctCount: number;
      wrongCount: number;
      missedCount: number;
    }
  >;
  userSelectionsSnapshot: Record<string, Record<string, string[]>>;
}

export interface QuizCategoryOption {
  id: string;
  label: string;
}

export interface QuizDimension {
  id: "cat" | "use" | "stage" | "func" | "ingr";
  title: string;
  icon: string;
  color: string;
  options: QuizCategoryOption[];
}

export const PRODUCT_SERIES_GROUPS: ProductSeriesGroup[] = [
  {
    id: "series_bn",
    name: "蓓能系列（高氮/平衡/高磷/高钾）",
    brand: "nxw",
    badge: "蓓能全系 4款",
    color: "emerald",
    productIds: ["bn1", "bn2", "bn3", "bn4"],
    description: "高纯全水溶大量元素水溶肥，富含鱼蛋白多肽微量元素，覆盖作物全营养周期",
  },
  {
    id: "series_sk",
    name: "施可收系列（提苗/平衡/膨大）",
    brand: "nxw",
    badge: "施可收全系 3款",
    color: "teal",
    productIds: ["sk1", "sk2", "sk3"],
    description: "功能型大量元素水溶肥，促根提苗、膨果增甜、调土防衰",
  },
  {
    id: "series_ao_bio",
    name: "傲系列·微生物调土生根品系",
    brand: "nxw",
    badge: "傲脉/傲生/傲土/傲净 4款",
    color: "green",
    productIds: ["am", "dp", "at", "aj"],
    description: "以傲生微生物菌剂、傲脉有机水溶肥、傲土傲净为核心的根际抗重茬调酸调碱系",
  },
  {
    id: "series_ao_foliar",
    name: "傲系列·叶面抗逆调光着色品系",
    brand: "nxw",
    badge: "傲叶/傲蕾/傲果/傲美等 7款",
    color: "amber",
    productIds: ["ay", "al", "ls", "lp", "ag", "amg", "sa"],
    description: "包含傲叶多肽、傲蕾促花、傲果靓皮、傲美硅肥、晒安心防晒等叶面喷施功能肥",
  },
  {
    id: "series_df",
    name: "大夫系列·花果养护特种配方",
    brand: "nxw",
    badge: "花大夫/果大夫 2款",
    color: "rose",
    productIds: ["hd", "gd"],
    description: "海藻糖醇螯合微量元素，精准靶向解决落花落果、膨果慢及缺素黄化",
  },
  {
    id: "series_nutri",
    name: "特种营养与中微量元素调配系列",
    brand: "nxw",
    badge: "均施/卓艳/沣硕/黑岩/洁特/沣惠 6款",
    color: "purple",
    productIds: ["js", "zy", "fs", "hy", "jt", "fh"],
    description: "均施中微钙镁、卓艳黄腐酸、沣硕多微螯合、黑岩高浓有机氨基酸全系",
  },
  {
    id: "series_ctm",
    name: "锄头猫系列·全效功能肥系",
    brand: "ctm",
    badge: "锄头猫 5款",
    color: "cyan",
    productIds: ["ctm1", "ctm2", "ctm3", "ctm4", "ctm5"],
    description: "有机水溶肥、多肽氨基酸、花果多、糖醇高钙及高活性微生物菌剂全系",
  },
];

export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: "lb-1",
    userId: "usr-expert-01",
    userName: "张总农艺师",
    avatarBg: "bg-emerald-600",
    roleTitle: "水肥一体化专家组组长",
    department: "集团技术与信息化管理中心",
    score: 304,
    maxScore: 310,
    percentage: 98,
    durationSeconds: 742,
    submittedAt: "2026-08-20 20:15",
  },
  {
    id: "lb-2",
    userId: "usr-expert-02",
    userName: "李工（新疆基地）",
    avatarBg: "bg-teal-600",
    roleTitle: "高级水肥技术顾问",
    department: "新疆哈密瓜/棉花示范基地",
    score: 298,
    maxScore: 310,
    percentage: 96,
    durationSeconds: 885,
    submittedAt: "2026-08-20 19:30",
  },
  {
    id: "lb-3",
    userId: "usr-partner-01",
    userName: "李经理",
    avatarBg: "bg-blue-600",
    roleTitle: "技术服务专家",
    department: "华南农业技术服务中心",
    score: 288,
    maxScore: 310,
    percentage: 93,
    durationSeconds: 960,
    submittedAt: "2026-08-20 18:40",
  },
  {
    id: "lb-4",
    userId: "usr-agri-04",
    userName: "陈农艺师（云南柑橘站）",
    avatarBg: "bg-purple-600",
    roleTitle: "果树技术农艺师",
    department: "云南哀牢山柑橘示范园",
    score: 279,
    maxScore: 310,
    percentage: 90,
    durationSeconds: 1020,
    submittedAt: "2026-08-20 17:22",
  },
  {
    id: "lb-5",
    userId: "usr-agri-05",
    userName: "王技术员（寿光蔬菜组）",
    avatarBg: "bg-amber-600",
    roleTitle: "大棚水肥调配员",
    department: "寿光设施蔬菜实验中心",
    score: 267,
    maxScore: 310,
    percentage: 86,
    durationSeconds: 1140,
    submittedAt: "2026-08-20 16:50",
  },
];

export const QUIZ_PRODUCTS: QuizProduct[] = [
  {id:'am',   name:'傲脉',           brand:'nxw', seriesId: 'series_ao_bio', seriesName: '傲系列·微生物调土生根品系'},
  {id:'dp',   name:'傲生',           brand:'nxw', seriesId: 'series_ao_bio', seriesName: '傲系列·微生物调土生根品系'},
  {id:'sk1',  name:'施可收·提苗',    brand:'nxw', seriesId: 'series_sk', seriesName: '施可收系列'},
  {id:'sk2',  name:'施可收·平衡',    brand:'nxw', seriesId: 'series_sk', seriesName: '施可收系列'},
  {id:'sk3',  name:'施可收·膨大',    brand:'nxw', seriesId: 'series_sk', seriesName: '施可收系列'},
  {id:'bn1',  name:'蓓能·高氮',      brand:'nxw', seriesId: 'series_bn', seriesName: '蓓能系列'},
  {id:'bn2',  name:'蓓能·平衡',      brand:'nxw', seriesId: 'series_bn', seriesName: '蓓能系列'},
  {id:'bn3',  name:'蓓能·高磷',      brand:'nxw', seriesId: 'series_bn', seriesName: '蓓能系列'},
  {id:'bn4',  name:'蓓能·高钾',      brand:'nxw', seriesId: 'series_bn', seriesName: '蓓能系列'},
  {id:'js',   name:'均施',           brand:'nxw', seriesId: 'series_nutri', seriesName: '特种营养与中微量系列'},
  {id:'zy',   name:'卓艳',           brand:'nxw', seriesId: 'series_nutri', seriesName: '特种营养与中微量系列'},
  {id:'at',   name:'傲土',           brand:'nxw', seriesId: 'series_ao_bio', seriesName: '傲系列·微生物调土生根品系'},
  {id:'aj',   name:'傲净',           brand:'nxw', seriesId: 'series_ao_bio', seriesName: '傲系列·微生物调土生根品系'},
  {id:'fs',   name:'沣硕',           brand:'nxw', seriesId: 'series_nutri', seriesName: '特种营养与中微量系列'},
  {id:'hy',   name:'黑岩',           brand:'nxw', seriesId: 'series_nutri', seriesName: '特种营养与中微量系列'},
  {id:'ay',   name:'傲叶',           brand:'nxw', seriesId: 'series_ao_foliar', seriesName: '傲系列·叶面抗逆调光品系'},
  {id:'al',   name:'傲蕾',           brand:'nxw', seriesId: 'series_ao_foliar', seriesName: '傲系列·叶面抗逆调光品系'},
  {id:'hd',   name:'花大夫',         brand:'nxw', seriesId: 'series_df', seriesName: '大夫系列·花果养护特种配方'},
  {id:'gd',   name:'果大夫',         brand:'nxw', seriesId: 'series_df', seriesName: '大夫系列·花果养护特种配方'},
  {id:'ls',   name:'傲岚',           brand:'nxw', seriesId: 'series_ao_foliar', seriesName: '傲系列·叶面抗逆调光品系'},
  {id:'lp',   name:'傲靓',           brand:'nxw', seriesId: 'series_ao_foliar', seriesName: '傲系列·叶面抗逆调光品系'},
  {id:'ag',   name:'傲果',           brand:'nxw', seriesId: 'series_ao_foliar', seriesName: '傲系列·叶面抗逆调光品系'},
  {id:'amg',  name:'傲美',           brand:'nxw', seriesId: 'series_ao_foliar', seriesName: '傲系列·叶面抗逆调光品系'},
  {id:'sa',   name:'晒安心',         brand:'nxw', seriesId: 'series_ao_foliar', seriesName: '傲系列·叶面抗逆调光品系'},
  {id:'jt',   name:'洁特',           brand:'nxw', seriesId: 'series_nutri', seriesName: '特种营养与中微量系列'},
  {id:'fh',   name:'沣惠',           brand:'nxw', seriesId: 'series_nutri', seriesName: '特种营养与中微量系列'},
  {id:'ctm1', name:'有机水溶肥',      brand:'ctm', seriesId: 'series_ctm', seriesName: '锄头猫全系功能肥'},
  {id:'ctm2', name:'多肽氨基酸',      brand:'ctm', seriesId: 'series_ctm', seriesName: '锄头猫全系功能肥'},
  {id:'ctm3', name:'花果多',         brand:'ctm', seriesId: 'series_ctm', seriesName: '锄头猫全系功能肥'},
  {id:'ctm4', name:'高钙',           brand:'ctm', seriesId: 'series_ctm', seriesName: '锄头猫全系功能肥'},
  {id:'ctm5', name:'微生物菌剂',      brand:'ctm', seriesId: 'series_ctm', seriesName: '锄头猫全系功能肥'},
];

export const QUIZ_CATEGORIES: Record<string, QuizCategoryOption[]> = {
  cat: [
    {id:'macro',   label:'大量元素水溶肥料'},
    {id:'meso',    label:'中量元素水溶肥料'},
    {id:'micro',   label:'微量元素水溶肥料'},
    {id:'amino',   label:'含氨基酸水溶肥料'},
    {id:'humic',   label:'含腐殖酸水溶肥料'},
    {id:'organic', label:'有机水溶肥料'},
    {id:'microbe', label:'微生物菌剂'},
    {id:'other',   label:'其他功能型'},
  ],
  use: [
    {id:'foliar', label:'叶面喷施'},
    {id:'root',   label:'根际'},
  ],
  stage: [
    {id:'seedling', label:'苗期/萌芽期'},
    {id:'growth',   label:'营养生长期'},
    {id:'flower',   label:'开花坐果期'},
    {id:'expand',   label:'膨果期'},
    {id:'color',    label:'转色/成熟期'},
    {id:'after',    label:'采后/休眠期'},
  ],
  func: [
    {id:'rootprom',   label:'促根壮苗'},
    {id:'flowerprom', label:'促花保果'},
    {id:'expandfun',  label:'膨果增甜'},
    {id:'colorfun',   label:'转色提质'},
    {id:'resist',     label:'抗逆抗冻'},
    {id:'soil',       label:'调土防病'},
    {id:'sunblock',   label:'防晒护果'},
    {id:'microsupp',  label:'中微量补充'},
    {id:'organicfun', label:'有机营养'},
  ],
  ingr: [
    {id:'n',        label:'氮(N)'},
    {id:'p',        label:'磷(P)'},
    {id:'k',        label:'钾(K)'},
    {id:'ca',       label:'钙(Ca)'},
    {id:'mg',       label:'镁(Mg)'},
    {id:'si',       label:'硅(Si)'},
    {id:'b',        label:'硼(B)'},
    {id:'zn',       label:'锌(Zn)'},
    {id:'fe',       label:'铁(Fe)'},
    {id:'mn',       label:'锰(Mn)'},
    {id:'cu',       label:'铜(Cu)'},
    {id:'mo',       label:'钼(Mo)'},
    {id:'amino_a',  label:'氨基酸'},
    {id:'humic_a',  label:'腐殖酸/黄腐酸'},
    {id:'organic_a',label:'有机质'},
    {id:'microbe_a',label:'微生物'},
    {id:'seaweed',  label:'海藻提取物'},
    {id:'fishpro',  label:'蛋白质'},
    {id:'special',  label:'特殊成分(LPE/糖醇/防晒剂等)'},
  ],
};;

export const QUIZ_DIMENSIONS: QuizDimension[] = [
  { id: "cat", title: "产品大类（登记品类）", icon: "Tag", color: "emerald", options: QUIZ_CATEGORIES.cat || [] },
  { id: "use", title: "施用方式与部位", icon: "Droplets", color: "blue", options: QUIZ_CATEGORIES.use || [] },
  { id: "stage", title: "主要适期（生育时期）", icon: "Calendar", color: "amber", options: QUIZ_CATEGORIES.stage || [] },
  { id: "func", title: "核心功效与作用定位", icon: "Sparkles", color: "purple", options: QUIZ_CATEGORIES.func || [] },
  { id: "ingr", title: "核心养分与功能成分", icon: "Layers", color: "rose", options: QUIZ_CATEGORIES.ingr || [] },
];

export const DEFAULT_QUIZ_ANSWERS: Record<string, Record<string, string[]>> = {
  "am": {
    "cat": [
      "organic"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "after"
    ],
    "func": [
      "rootprom",
      "resist",
      "soil",
      "organicfun"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "ca",
      "mg",
      "b",
      "zn",
      "amino_a",
      "humic_a",
      "organic_a"
    ]
  },
  "dp": {
    "cat": [
      "microbe"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "rootprom",
      "soil"
    ],
    "ingr": [
      "microbe_a"
    ]
  },
  "sk1": {
    "cat": [
      "macro"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "after"
    ],
    "func": [
      "rootprom",
      "expandfun",
      "soil",
      "organicfun"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "mn",
      "cu",
      "organic_a"
    ]
  },
  "sk2": {
    "cat": [
      "macro"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "rootprom",
      "expandfun",
      "soil",
      "organicfun"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "mn",
      "cu",
      "organic_a"
    ]
  },
  "sk3": {
    "cat": [
      "macro"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "expand",
      "color"
    ],
    "func": [
      "rootprom",
      "expandfun",
      "colorfun",
      "soil",
      "organicfun"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "mn",
      "cu",
      "organic_a"
    ]
  },
  "bn1": {
    "cat": [
      "macro"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "after"
    ],
    "func": [
      "rootprom",
      "microsupp"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "b",
      "zn",
      "fe",
      "mn",
      "cu",
      "mo",
      "fishpro"
    ]
  },
  "bn2": {
    "cat": [
      "macro"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "rootprom",
      "expandfun",
      "microsupp"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "b",
      "zn",
      "fe",
      "mn",
      "cu",
      "mo",
      "fishpro"
    ]
  },
  "bn3": {
    "cat": [
      "macro"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "flower",
      "expand",
      "after"
    ],
    "func": [
      "rootprom",
      "flowerprom",
      "expandfun",
      "microsupp"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "b",
      "zn",
      "fe",
      "mn",
      "cu",
      "mo",
      "fishpro"
    ]
  },
  "bn4": {
    "cat": [
      "macro"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "expand",
      "color"
    ],
    "func": [
      "expandfun",
      "colorfun",
      "microsupp"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "b",
      "zn",
      "fe",
      "mn",
      "cu",
      "mo",
      "fishpro"
    ]
  },
  "js": {
    "cat": [
      "meso"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "microsupp"
    ],
    "ingr": [
      "ca",
      "mg",
      "b",
      "zn",
      "fe"
    ]
  },
  "zy": {
    "cat": [
      "macro"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "expand",
      "color"
    ],
    "func": [
      "expandfun",
      "colorfun",
      "soil",
      "microsupp",
      "organicfun"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "b",
      "zn",
      "amino_a",
      "humic_a",
      "organic_a"
    ]
  },
  "at": {
    "cat": [
      "other"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "rootprom",
      "soil"
    ],
    "ingr": [
      "k",
      "b",
      "humic_a"
    ]
  },
  "aj": {
    "cat": [
      "microbe"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "soil"
    ],
    "ingr": [
      "microbe_a"
    ]
  },
  "fs": {
    "cat": [
      "micro"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "flowerprom",
      "microsupp"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "ca",
      "mg",
      "si",
      "b",
      "zn",
      "fe",
      "mn",
      "cu",
      "mo"
    ]
  },
  "hy": {
    "cat": [
      "amino"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "after"
    ],
    "func": [
      "rootprom",
      "flowerprom",
      "expandfun",
      "resist",
      "organicfun"
    ],
    "ingr": [
      "b",
      "zn",
      "fe",
      "mn",
      "cu",
      "mo",
      "amino_a",
      "organic_a"
    ]
  },
  "ay": {
    "cat": [
      "amino"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "after"
    ],
    "func": [
      "resist",
      "organicfun"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "b",
      "zn",
      "amino_a",
      "organic_a",
      "fishpro"
    ]
  },
  "al": {
    "cat": [
      "organic"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower"
    ],
    "func": [
      "flowerprom",
      "resist"
    ],
    "ingr": [
      "b",
      "zn",
      "fe",
      "mn",
      "cu",
      "mo",
      "amino_a",
      "special"
    ]
  },
  "hd": {
    "cat": [
      "micro"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "seedling",
      "flower",
      "expand"
    ],
    "func": [
      "flowerprom",
      "organicfun"
    ],
    "ingr": [
      "b",
      "zn",
      "fe",
      "cu",
      "mo",
      "amino_a",
      "seaweed"
    ]
  },
  "gd": {
    "cat": [
      "macro"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "expand",
      "color"
    ],
    "func": [
      "expandfun",
      "colorfun",
      "organicfun"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "mg",
      "b",
      "zn",
      "fe",
      "seaweed"
    ]
  },
  "ls": {
    "cat": [
      "other"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "rootprom",
      "flowerprom",
      "expandfun",
      "colorfun",
      "resist"
    ],
    "ingr": [
      "p",
      "k"
    ]
  },
  "lp": {
    "cat": [
      "organic"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "color"
    ],
    "func": [
      "colorfun"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "organic_a",
      "special"
    ]
  },
  "ag": {
    "cat": [
      "meso"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand"
    ],
    "func": [
      "colorfun",
      "microsupp"
    ],
    "ingr": [
      "n",
      "ca",
      "mg",
      "b",
      "zn",
      "fe",
      "mn",
      "cu",
      "mo",
      "special"
    ]
  },
  "amg": {
    "cat": [
      "other"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color"
    ],
    "func": [
      "colorfun"
    ],
    "ingr": [
      "si"
    ]
  },
  "sa": {
    "cat": [
      "other"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "expand",
      "color"
    ],
    "func": [
      "sunblock"
    ],
    "ingr": [
      "ca",
      "special"
    ]
  },
  "jt": {
    "cat": [
      "micro"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "flowerprom",
      "microsupp"
    ],
    "ingr": [
      "ca",
      "mg",
      "b",
      "zn",
      "fe",
      "mn",
      "cu",
      "mo"
    ]
  },
  "fh": {
    "cat": [
      "meso"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "growth",
      "flower",
      "expand",
      "color"
    ],
    "func": [
      "microsupp"
    ],
    "ingr": [
      "ca",
      "b",
      "zn",
      "cu"
    ]
  },
  "ctm1": {
    "cat": [
      "organic"
    ],
    "use": [
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "after"
    ],
    "func": [
      "soil",
      "organicfun"
    ],
    "ingr": [
      "n",
      "p",
      "k",
      "ca",
      "mg",
      "b",
      "zn",
      "fe",
      "humic_a",
      "organic_a"
    ]
  },
  "ctm2": {
    "cat": [
      "amino"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "after"
    ],
    "func": [
      "resist",
      "organicfun"
    ],
    "ingr": [
      "n",
      "b",
      "zn",
      "fe",
      "amino_a",
      "organic_a"
    ]
  },
  "ctm3": {
    "cat": [
      "micro"
    ],
    "use": [
      "foliar"
    ],
    "stage": [
      "flower",
      "expand"
    ],
    "func": [
      "flowerprom",
      "expandfun"
    ],
    "ingr": [
      "b",
      "mo",
      "seaweed"
    ]
  },
  "ctm4": {
    "cat": [
      "meso"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "growth",
      "flower",
      "expand",
      "color"
    ],
    "func": [
      "microsupp"
    ],
    "ingr": [
      "ca",
      "b",
      "zn",
      "cu"
    ]
  },
  "ctm5": {
    "cat": [
      "microbe"
    ],
    "use": [
      "foliar",
      "root"
    ],
    "stage": [
      "seedling",
      "growth",
      "flower",
      "expand",
      "color",
      "after"
    ],
    "func": [
      "rootprom",
      "soil"
    ],
    "ingr": [
      "microbe_a"
    ]
  }
};;
