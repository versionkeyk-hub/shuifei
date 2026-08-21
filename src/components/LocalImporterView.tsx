import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Sprout,
  Bug,
  Plus,
  RefreshCw,
  Eye,
  FileCode,
  Sparkles,
  Database,
  Copy,
  Check,
  Trash2,
  Edit3,
  Search,
  CheckSquare,
  Square,
  Image as ImageIcon,
  ZoomIn,
  ExternalLink,
  ChevronRight,
  Filter,
  ShieldCheck,
  Star,
  Info
} from 'lucide-react';
import {
  Crop,
  CropCategory,
  FertilizationScheme,
  FertilizerStage,
  PestDiseaseItem,
  ChemicalFormula,
  PestCategoryGroup
} from '../types';
import { ImageLightboxModal } from './ImageLightboxModal';
import { MultiImageUploader } from './MultiImageUploader';

interface LocalImporterViewProps {
  crops: Crop[];
  categories: CropCategory[];
  onImportScheme: (newScheme: FertilizationScheme, targetCropId: string) => void;
  onImportPest: (newPest: PestDiseaseItem) => void;
  onAddCrop: (newCrop: Crop) => void;
  onSelectCrop: (cropId: string) => void;
}

// Unified Recognized Item Model
export interface RecognizedResultItem {
  id: string;
  kind: 'scheme' | 'pest';
  targetCropId: string; // specific crop ID or 'general'
  targetCropName: string;
  isImported: boolean;
  importedAt?: string;
  selected: boolean;
  schemeData?: FertilizationScheme;
  pestData?: PestDiseaseItem;
  rawTextPreview?: string;
}

export const LocalImporterView: React.FC<LocalImporterViewProps> = ({
  crops,
  categories,
  onImportScheme,
  onImportPest,
  onAddCrop,
  onSelectCrop,
}) => {
  // Input states
  const [uploadMode, setUploadMode] = useState<'text' | 'file' | 'image' | 'template'>('text');
  const [pastedText, setPastedText] = useState('');
  const [sourceImage, setSourceImage] = useState<string>('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Recognized Items Staging List
  const [recognizedItems, setRecognizedItems] = useState<RecognizedResultItem[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'scheme' | 'pest' | 'pending' | 'imported'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing Modal for "修改导入"
  const [editingItem, setEditingItem] = useState<RecognizedResultItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Copy Feedback Toast
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lightbox for source image & item images
  const [lightboxData, setLightboxData] = useState<{
    images: string[];
    initialIndex: number;
    title: string;
  } | null>(null);

  // Batch Import Progress
  const [batchProgress, setBatchProgress] = useState<{
    total: number;
    current: number;
    isRunning: boolean;
    isDone: boolean;
  } | null>(null);

  // Helper: Extract crop name from text or fallback to universal general crop
  const detectCrop = (text: string): { id: string; name: string } => {
    for (const c of crops) {
      if (text.includes(c.name)) {
        return { id: c.id, name: c.name };
      }
      if (c.aliases && c.aliases.some((a) => text.includes(a))) {
        return { id: c.id, name: c.name };
      }
    }

    const commonCrops = [
      '柑橘', '沃柑', '砂糖橘', '脐橙', '蜜柚', '柠檬', '葡萄', '阳光玫瑰', '巨峰',
      '黄瓜', '番茄', '西红柿', '辣椒', '朝天椒', '茄子', '生菜', '大蒜', '大葱', '韭菜',
      '甜瓜', '香瓜', '哈密瓜', '西瓜', '冬瓜', '南瓜', '苹果', '梨', '桃', '蓝莓',
      '草莓', '生姜', '大姜', '山药', '玉米', '水稻', '小麦', '花生', '大豆', '马铃薯', '土豆'
    ];

    for (const name of commonCrops) {
      if (text.includes(name)) {
        const found = crops.find((c) => c.name.includes(name) || name.includes(c.name));
        if (found) return { id: found.id, name: found.name };
        return { id: `crop-detected-${Date.now()}`, name };
      }
    }

    return { id: 'general', name: '通用作物' };
  };

  // Automated Omnivorous Recognition Engine
  const runRecognition = (content: string, sourceImgUrl: string = '') => {
    if (!content.trim() && !sourceImgUrl) return;

    setIsProcessing(true);
    setStatusMessage('正在执行本地规则智能识别（自动研判水肥方案与病虫害防治）...');

    setTimeout(() => {
      try {
        const newResults: RecognizedResultItem[] = [];

        // 1. Check if contains HTML or markdown or plaintext tables/paragraphs
        const isHtml = content.includes('<table') || content.includes('<div') || content.includes('<html');

        let rawChunks: string[] = [];

        if (isHtml) {
          const domParser = new DOMParser();
          const doc = domParser.parseFromString(content, 'text/html');

          // Extract tables as schemes
          const tables = doc.querySelectorAll('table');
          tables.forEach((tbl) => {
            rawChunks.push(tbl.outerHTML);
          });

          // Extract disease blocks / headings
          const sections = doc.querySelectorAll('h1, h2, h3, .pest-card, .disease-block, p');
          let currentText = '';
          sections.forEach((sec) => {
            const txt = sec.textContent?.trim() || '';
            if (txt.length > 20) {
              rawChunks.push(txt);
            }
          });
        }

        if (rawChunks.length === 0) {
          // Split plaintext by common section delimiters
          rawChunks = content
            .split(/\n{2,}|(?=【|一、|二、|三、|四、|五、|1\.|2\.|3\.|4\.|5\.|方案|病害|虫害)/)
            .map((s) => s.trim())
            .filter((s) => s.length > 10);
        }

        if (rawChunks.length === 0 && (content.trim() || sourceImgUrl)) {
          rawChunks = [content.trim() || '图文识别方案/病害'];
        }

        rawChunks.forEach((chunk, index) => {
          const detectedCrop = detectCrop(chunk);

          // Test if chunk is primarily a Pest / Disease
          const isPestDisease =
            /病|虫|螨|斑|霜霉|炭疽|溃疡|白粉|青枯|疫病|蚜虫|蓟马|粉虱|木虱|红蜘蛛|潜叶|夜蛾|蛴螬|线虫|症状|药剂|防效|危害|发生规律/.test(
              chunk
            ) &&
            !/施肥时期|滴灌|冲施|复合肥|高氮|平衡型|高钾|微量元素|底肥|基肥|每亩用量/.test(
              chunk.slice(0, 100)
            );

          if (isPestDisease) {
            // Extract pest details
            const nameMatch = chunk.match(
              /(?:【|第[\d一二三四五]+[条个]|\d+[\.、])?\s*([^：:\n,，]{2,15}(?:病|虫|螨|虱|蛾|蝇|线虫|黄化|危害))/
            );
            const pestName = nameMatch ? nameMatch[1].trim() : `${detectedCrop.name}常见病虫害-${index + 1}`;

            let categoryGroup: PestCategoryGroup = '真菌性病害（高等真菌）';
            let pType = '病害';
            if (/蚜|蓟马|粉虱|木虱|盲蝽|青虫|夜蛾|潜叶|食心|蛴螬|蝼蛄|金针虫|地老虎/.test(chunk)) {
              categoryGroup = '虫害';
              pType = '虫害';
            } else if (/红蜘蛛|白蜘蛛|锈壁虱|二斑叶螨/.test(chunk)) {
              categoryGroup = '虫害';
              pType = '虫害';
            } else if (/霜霉|疫病|猝倒|晚疫/.test(chunk)) {
              categoryGroup = '真菌性病害（低等真菌）';
            } else if (/软腐|青枯|溃疡|细菌|角斑|疮痂/.test(chunk)) {
              categoryGroup = '细菌性病害';
            } else if (/病毒|花叶|曲叶/.test(chunk)) {
              categoryGroup = '病毒病';
            } else if (/线虫/.test(chunk)) {
              categoryGroup = '线虫病';
            } else if (/缺素|生理|黄化|脐腐|日灼|裂果/.test(chunk)) {
              categoryGroup = '生理性病害';
            } else if (/草害|杂草|除草/.test(chunk)) {
              categoryGroup = '环境与灾害胁迫';
            }

            // Chemical formulas extraction
            const chemicalFormulas: ChemicalFormula[] = [];
            const chemMatches = chunk.match(
              /([^\n，,。；;]+?(?:悬浮剂|乳油|可湿性粉剂|水分散粒剂|微乳剂|水剂|克|毫升|倍液|克\/亩))/g
            );
            if (chemMatches) {
              chemMatches.slice(0, 3).forEach((cm, cIdx) => {
                chemicalFormulas.push({
                  id: `f-${Date.now()}-${cIdx}`,
                  formulaName: cm.replace(/推荐用药|防治药剂|使用|用/g, '').trim(),
                  dosageRate: cm.includes('倍') ? cm.match(/\d+[-~至]?\d*倍/)?.[0] || '1500倍液' : '30-50ml/亩',
                  timing: '发病初期或虫口初发期均匀喷雾',
                });
              });
            }

            if (chemicalFormulas.length === 0) {
              chemicalFormulas.push({
                id: `f-${Date.now()}-1`,
                formulaName: '针对性高效低毒复配药剂',
                dosageRate: '1500-2000倍液',
                timing: '发病初期均匀喷施',
              });
            }

            const pestItem: PestDiseaseItem = {
              id: `pest-rec-${Date.now()}-${index}`,
              cropId: detectedCrop.id,
              cropName: detectedCrop.name,
              cropIds: detectedCrop.id !== 'general' ? [detectedCrop.id] : [],
              cropNames: [detectedCrop.name],
              isGeneralCrop: detectedCrop.id === 'general',
              name: pestName,
              type: pType,
              categoryGroup,
              dangerLevel: '中度危害',
              symptoms: chunk.slice(0, 200) || '叶片及果实受损，出现典型病斑或刺吸褪绿点。',
              occurrencePeriod: '生育中后期及温湿度适宜期',
              occurrenceRules: '高温高湿或通风不良环境下易爆发流行。',
              agriculturalControl: '加强田间通透性，增施有机肥与微生物菌剂，清除病残体。',
              chemicalControl: chemicalFormulas,
              fertilizerSynergy: '随水冲施复合微生物菌剂，叶面喷施糖醇钙与氨基酸水溶肥增强植株韧性。',
              keyNotes: '轮换不同作用机理药剂，避免产生抗药性。',
              images: sourceImgUrl
                ? [sourceImgUrl]
                : ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'],
              updatedAt: new Date().toISOString().slice(0, 10),
            };

            newResults.push({
              id: `res-${Date.now()}-${index}`,
              kind: 'pest',
              targetCropId: detectedCrop.id,
              targetCropName: detectedCrop.name,
              isImported: false,
              selected: true,
              pestData: pestItem,
              rawTextPreview: chunk.slice(0, 160),
            });
          } else {
            // Treat as Fertilization Scheme
            const schemeNameMatch = chunk.match(
              /(?:【|第[\d一二三四五]+[套个]|\d+[\.、])?\s*([^：:\n]{2,20}(?:方案|水肥|管理|套餐|施肥规程))/
            );
            const schemeName = schemeNameMatch
              ? schemeNameMatch[1].trim()
              : `${detectedCrop.name}高产水肥一体化管理方案-${index + 1}`;

            const stages: FertilizerStage[] = [];
            const stageMatches = chunk.split(/阶段|时期|期：|期:|【/).filter((s) => s.length > 5);

            if (stageMatches.length >= 2) {
              stageMatches.slice(0, 6).forEach((sm, sIdx) => {
                const lines = sm.split(/[\n，,。；]/).filter((l) => l.trim().length > 0);
                const stageTitle = lines[0]?.slice(0, 15) || `第${sIdx + 1}阶段`;

                stages.push({
                  id: `stg-rec-${Date.now()}-${sIdx}`,
                  order: sIdx + 1,
                  stageName: stageTitle,
                  subStageName: '关键物候期',
                  timing: '根据作物长势与物候节点施用',
                  items: [
                    {
                      id: `item-${Date.now()}-${sIdx}-1`,
                      fertilizer: '平衡型大量元素水溶肥 (20-20-20) + 傲生复合微生物菌剂',
                      dosage: '5-10kg/亩',
                      method: '滴灌 / 冲施',
                      remarks: '配合生根剂促进须根萌发',
                      isKeyPoint: true,
                    },
                  ],
                  managementTips: '保持土壤湿润，少量多次，严禁大水漫灌。',
                });
              });
            } else {
              // Standard 4-Stage Fallback template
              stages.push(
                {
                  id: `stg-${Date.now()}-1`,
                  order: 1,
                  stageName: '底肥 / 苗期提苗',
                  subStageName: '定植成活至缓苗期',
                  timing: '移栽定植后 7-10 天',
                  items: [
                    {
                      id: `it-${Date.now()}-1`,
                      fertilizer: '傲生复合微生物菌剂 + 高氮生根型水溶肥',
                      dosage: '5kg/亩',
                      method: '滴灌 / 浇根',
                      remarks: '养根壮苗，预防死苗烂棵',
                      isKeyPoint: true,
                    },
                  ],
                  managementTips: '促根壮棵，增强抗逆性',
                },
                {
                  id: `stg-${Date.now()}-2`,
                  order: 2,
                  stageName: '促花保果期',
                  subStageName: '现蕾至初花谢花期',
                  timing: '花前及花后 5-7 天',
                  items: [
                    {
                      id: `it-${Date.now()}-2`,
                      fertilizer: '平衡型大量元素水溶肥 (20-20-20) + 流体硼/螯合锌',
                      dosage: '5-8kg/亩',
                      method: '滴灌 / 叶面喷施',
                      remarks: '促进花芽分化，提高坐果率',
                      isKeyPoint: true,
                    },
                  ],
                  managementTips: '控制氮肥，防止枝叶徒长导致落花落果',
                },
                {
                  id: `stg-${Date.now()}-3`,
                  order: 3,
                  stageName: '膨果转色期',
                  subStageName: '果实快速膨大至成熟',
                  timing: '膨大盛期，间隔 7-10 天一次',
                  items: [
                    {
                      id: `it-${Date.now()}-3`,
                      fertilizer: '高钾型大量元素水溶肥 (12-6-40) + 糖醇钙镁肥',
                      dosage: '8-10kg/亩',
                      method: '滴灌 / 冲施',
                      remarks: '膨果增甜，防止裂果与日灼',
                      isKeyPoint: true,
                    },
                  ],
                  managementTips: '适度控水，增加光照与通风',
                }
              );
            }

            const schemeItem: FertilizationScheme = {
              id: `scheme-rec-${Date.now()}-${index}`,
              cropId: detectedCrop.id,
              cropName: detectedCrop.name,
              title: schemeName,
              schemeType: '全周期高产水肥方案',
              author: '本地智能解析',
              version: '1.0',
              isPublished: true,
              stages,
              summary: chunk.slice(0, 150),
              generalNotes: '全周期水肥一体化管理方案，随水冲施与叶面喷施协同。',
              createdAt: new Date().toISOString().slice(0, 10),
              updatedAt: new Date().toISOString().slice(0, 10),
            };

            newResults.push({
              id: `res-${Date.now()}-${index}`,
              kind: 'scheme',
              targetCropId: detectedCrop.id,
              targetCropName: detectedCrop.name,
              isImported: false,
              selected: true,
              schemeData: schemeItem,
              rawTextPreview: chunk.slice(0, 160),
            });
          }
        });

        // Merge or replace recognized list
        setRecognizedItems((prev) => [...newResults, ...prev]);
        setStatusMessage(
          `✨ 智能识别完成！共解析出 ${newResults.length} 条方案与防治记录，均已分类框选展示于右侧。`
        );
      } catch (err: any) {
        setStatusMessage(`解析异常：${err?.message || '未知错误'}`);
      } finally {
        setIsProcessing(false);
      }
    }, 150);
  };

  // File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setStatusMessage(`正在读取文件：${file.name}...`);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgData = event.target?.result as string;
        setSourceImage(imgData);
        setUploadMode('image');
        runRecognition(`图片识别档案：${file.name}`, imgData);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || '';
        setPastedText(content);
        runRecognition(content);
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  // Direct Image Paste or Upload in Left Panel
  const handleImageLoaded = (imgUrl: string) => {
    setSourceImage(imgUrl);
    setUploadMode('image');
    runRecognition(`图文扫描识别图谱`, imgUrl);
  };

  // Clipboard Paste Detection on Container
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const url = ev.target?.result as string;
              handleImageLoaded(url);
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [crops]);

  // Format recognized item into clean text for copying
  const formatItemToText = (item: RecognizedResultItem): string => {
    if (item.kind === 'scheme' && item.schemeData) {
      const s = item.schemeData;
      let text = `【水肥一体化方案】${s.title}\n`;
      text += `适用作物：${item.targetCropName}\n`;
      text += `方案类型：${s.schemeType || '水肥一体化方案'} | 版本：${s.version || '1.0'}\n`;
      text += `----------------------------------------\n`;
      s.stages.forEach((stg) => {
        text += `\n▶ 阶段${stg.order}：${stg.stageName} (${stg.subStageName || ''}) [${stg.timing || '适期'}]\n`;
        stg.items.forEach((it) => {
          text += `  • 肥料配方：${it.fertilizer}\n`;
          text += `    用量与方法：${it.dosage} (${it.method})\n`;
          if (it.remarks) text += `    要点备注：${it.remarks}\n`;
        });
        if (stg.managementTips) text += `  💡 管理要点：${stg.managementTips}\n`;
      });
      if (s.summary || s.generalNotes) text += `\n综合说明：${s.summary || s.generalNotes}\n`;
      return text;
    } else if (item.kind === 'pest' && item.pestData) {
      const p = item.pestData;
      let text = `【病虫害防治档案】${p.name}\n`;
      text += `归属分类：${p.categoryGroup || p.type} | 危害程度：${p.dangerLevel}\n`;
      text += `关联作物：${item.targetCropName}\n`;
      text += `----------------------------------------\n`;
      text += `【症状识别特征】\n${p.symptoms}\n\n`;
      text += `【发生时期与规律】\n${p.occurrencePeriod} | ${p.occurrenceRules}\n\n`;
      text += `【推荐化学防治方案】\n`;
      p.chemicalControl.forEach((c, idx) => {
        text += `  ${idx + 1}. 药剂配方：${c.formulaName}\n`;
        text += `     稀释用量：${c.dosageRate} | 施用时机：${c.timing}\n`;
      });
      text += `\n【水肥协同抗逆】\n${p.fertilizerSynergy}\n`;
      if (p.keyNotes) text += `【防效注意事项】\n${p.keyNotes}\n`;
      return text;
    }
    return '';
  };

  // Copy single item formatted text
  const handleCopyItem = (item: RecognizedResultItem) => {
    const text = formatItemToText(item);
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Commit single item to library
  const handleCommitSingle = (item: RecognizedResultItem) => {
    const targetCropId = item.targetCropId || 'general';

    if (item.kind === 'scheme' && item.schemeData) {
      onImportScheme(item.schemeData, targetCropId);
    } else if (item.kind === 'pest' && item.pestData) {
      onImportPest({
        ...item.pestData,
        cropId: targetCropId,
        cropName: item.targetCropName,
        isGeneralCrop: targetCropId === 'general',
      });
    }

    // Mark as imported in list
    setRecognizedItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? { ...it, isImported: true, importedAt: new Date().toLocaleTimeString() }
          : it
      )
    );
  };

  // Confirm in Edit Modal ("修改导入")
  const handleConfirmEditModal = () => {
    if (!editingItem) return;

    handleCommitSingle(editingItem);
    setIsEditModalOpen(false);
    setEditingItem(null);
  };

  // Delete single item from staged list
  const handleDeleteItem = (id: string) => {
    setRecognizedItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setRecognizedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  // Toggle select all
  const handleToggleSelectAll = (checked: boolean) => {
    setRecognizedItems((prev) => prev.map((it) => ({ ...it, selected: checked })));
  };

  // Batch import selected items with sequential progress
  const handleBatchImport = () => {
    const selectedList = recognizedItems.filter((it) => it.selected && !it.isImported);
    if (selectedList.length === 0) {
      alert('请勾选尚未导入的识别结果项！');
      return;
    }

    setBatchProgress({
      total: selectedList.length,
      current: 0,
      isRunning: true,
      isDone: false,
    });

    let count = 0;
    const interval = setInterval(() => {
      if (count < selectedList.length) {
        const item = selectedList[count];
        handleCommitSingle(item);
        count++;
        setBatchProgress({
          total: selectedList.length,
          current: count,
          isRunning: true,
          isDone: count === selectedList.length,
        });
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setBatchProgress((p) => (p ? { ...p, isRunning: false } : null));
        }, 1200);
      }
    }, 180);
  };

  // Manually add a custom recognized result card
  const handleAddNewRecognizedCard = (kind: 'scheme' | 'pest') => {
    const defaultCrop = crops[0] || { id: 'general', name: '通用作物' };

    if (kind === 'scheme') {
      const newScheme: FertilizationScheme = {
        id: `scheme-custom-${Date.now()}`,
        cropId: defaultCrop.id,
        cropName: defaultCrop.name,
        title: `${defaultCrop.name}标准施肥方案`,
        schemeType: '水肥一体化方案',
        author: '本地录入',
        version: '1.0',
        isPublished: true,
        stages: [
          {
            id: `stg-${Date.now()}-1`,
            order: 1,
            stageName: '苗期/生长期',
            subStageName: '缓苗及营养生长',
            timing: '适期施用',
            items: [
              {
                id: `it-${Date.now()}-1`,
                fertilizer: '平衡型大量元素水溶肥 + 傲生菌剂',
                dosage: '5-8kg/亩',
                method: '滴灌 / 冲施',
                remarks: '促根壮苗',
                isKeyPoint: true,
              },
            ],
            managementTips: '保持根系通气良好',
          },
        ],
        summary: '自定义录入的水肥一体化方案。',
        generalNotes: '全周期水肥协同管理方案。',
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      };

      const newItem: RecognizedResultItem = {
        id: `res-${Date.now()}`,
        kind: 'scheme',
        targetCropId: defaultCrop.id,
        targetCropName: defaultCrop.name,
        isImported: false,
        selected: true,
        schemeData: newScheme,
        rawTextPreview: '手动新增施肥方案',
      };
      setRecognizedItems((prev) => [newItem, ...prev]);
      setEditingItem(newItem);
      setIsEditModalOpen(true);
    } else {
      const newPest: PestDiseaseItem = {
        id: `pest-custom-${Date.now()}`,
        cropId: defaultCrop.id,
        cropName: defaultCrop.name,
        cropIds: [defaultCrop.id],
        cropNames: [defaultCrop.name],
        isGeneralCrop: defaultCrop.id === 'general',
        name: '新建病虫害防治记录',
        type: '病害',
        categoryGroup: '真菌性病害（高等真菌）',
        dangerLevel: '中度危害',
        symptoms: '请在此输入典型危害症状及发病表现...',
        occurrencePeriod: '生育中期',
        occurrenceRules: '高温高湿或通风不良时易发。',
        agriculturalControl: '加强田间通透性，清除病残体。',
        chemicalControl: [
          {
            id: `f-${Date.now()}-1`,
            formulaName: '针对性高效复配药剂',
            dosageRate: '1500倍液',
            timing: '发病初期喷施',
          },
        ],
        fertilizerSynergy: '随水冲施微生物菌剂，叶面喷施糖醇钙与氨基酸水溶肥。',
        keyNotes: '轮换用药，避免抗药性。',
        images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&auto=format&fit=crop&q=80'],
        updatedAt: new Date().toISOString().slice(0, 10),
      };

      const newItem: RecognizedResultItem = {
        id: `res-${Date.now()}`,
        kind: 'pest',
        targetCropId: defaultCrop.id,
        targetCropName: defaultCrop.name,
        isImported: false,
        selected: true,
        pestData: newPest,
        rawTextPreview: '手动新增病虫害记录',
      };
      setRecognizedItems((prev) => [newItem, ...prev]);
      setEditingItem(newItem);
      setIsEditModalOpen(true);
    }
  };

  // Filtered results list
  const filteredResults = recognizedItems.filter((item) => {
    if (filterTab === 'scheme' && item.kind !== 'scheme') return false;
    if (filterTab === 'pest' && item.kind !== 'pest') return false;
    if (filterTab === 'pending' && item.isImported) return false;
    if (filterTab === 'imported' && !item.isImported) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = item.kind === 'scheme' ? item.schemeData?.title : item.pestData?.name;
      const crop = item.targetCropName;
      const raw = item.rawTextPreview || '';
      return (
        name?.toLowerCase().includes(q) ||
        crop?.toLowerCase().includes(q) ||
        raw?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingCount = recognizedItems.filter((it) => !it.isImported).length;
  const importedCount = recognizedItems.filter((it) => it.isImported).length;
  const selectedCount = recognizedItems.filter((it) => it.selected).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>全自动离线多源识别与结构化智库录入引擎</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            本地免选作物全能识别录入与方案建档
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
            无需先选定作物！自动研判「水肥方案」与「病虫害防治」，支持图文缩放审阅、逐条修改导入、一键格式化复制及批量一键同步入库。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddNewRecognizedCard('scheme')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 新增水肥识别项</span>
          </button>
          <button
            onClick={() => handleAddNewRecognizedCard('pest')}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ 新增病虫识别项</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols): Multi-Format Input & Image Zoom Preview */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>1. 输入识别源 (图文 / 文本 / 文件)</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                支持直接 Ctrl+V 粘贴
              </span>
            </div>

            {/* Input Mode Selector */}
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setUploadMode('text')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  uploadMode === 'text'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3 h-3 text-blue-600" />
                <span>文本/段落</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('image')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  uploadMode === 'image'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3 h-3 text-amber-600" />
                <span>截图/图片</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  uploadMode === 'file'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCode className="w-3 h-3 text-emerald-600" />
                <span>文件上传</span>
              </button>
            </div>

            {/* Mode 1: Plaintext input */}
            {uploadMode === 'text' && (
              <div className="space-y-2">
                <textarea
                  rows={8}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="在此粘贴方案文字、病虫害描述、HTML表格或农药配方...
例如：
【柑橘溃疡病防治方案】
症状：叶片针头大浓黄色油渍状点，后扩大隆起呈火山口状开裂。
推荐药剂：噻菌铜 500倍液 或 氢氧化铜 800倍液，发病初期喷雾。
水肥协同：随水冲施傲生菌剂增强树势，叶面补充糖醇钙。"
                  className="w-full p-3 text-xs border border-slate-200 rounded-2xl outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => runRecognition(pastedText)}
                    disabled={!pastedText.trim()}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>执行本地智能识别分词</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPastedText(`【黄瓜高产水肥一体化管理方案】
苗期缓苗：滴灌傲生复合微生物菌剂 5kg/亩 + 生根水溶肥
促花保果：滴灌平衡型水溶肥(20-20-20) 8kg/亩 + 流体硼喷施
膨果盛期：滴灌高钾水溶肥(12-6-40) 10kg/亩 + 糖醇钙

【黄瓜霜霉病防治方案】
症状：叶片正面多角形黄褐色病斑，背面潮湿时长出紫黑色霉层。
推荐药剂：氟菌·霜霉威 600倍液 或 烯酰吗啉 1000倍液，发病初期均匀喷雾。
协同管理：叶面增喷氨基酸水溶肥提高抗病力。`);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    填入示例
                  </button>
                </div>
              </div>
            )}

            {/* Mode 2: Screenshot Image Input with Zoom Preview */}
            {uploadMode === 'image' && (
              <div className="space-y-3">
                {sourceImage ? (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-amber-300 bg-slate-900 group">
                      <img
                        src={sourceImage}
                        alt="识别源图"
                        referrerPolicy="no-referrer"
                        className="w-full max-h-56 object-contain"
                      />

                      {/* Click to Zoom Overlay */}
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxData({
                            images: [sourceImage],
                            initialIndex: 0,
                            title: '识别源图 - 高清原图无损放大审阅',
                          })
                        }
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-bold cursor-pointer"
                      >
                        <ZoomIn className="w-6 h-6 text-amber-400 animate-pulse" />
                        <span>点击开启放大镜 (支持滚轮缩放/拖动查看细小文字)</span>
                      </button>

                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] rounded-md font-mono pointer-events-none">
                        📸 截图源图 · 悬停可放大
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxData({
                            images: [sourceImage],
                            initialIndex: 0,
                            title: '识别源图 - 高清原图无损放大审阅',
                          })
                        }
                        className="flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <ZoomIn className="w-3.5 h-3.5 text-amber-600" />
                        <span>🔍 放大审阅图片细部</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSourceImage('')}
                        className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                      >
                        更换图片
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      支持直接截图后 <strong className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded font-mono">Ctrl+V</strong> 粘贴图片
                    </div>
                    <p className="text-[11px] text-slate-400">
                      或点击选择本地图片 (JPG, PNG, WebP)
                    </p>
                    <label className="inline-block mt-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs">
                      <span>选择本地截图</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Mode 3: File Upload Input */}
            {uploadMode === 'file' && (
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center transition-colors relative bg-slate-50/50 space-y-2">
                <input
                  type="file"
                  accept=".html,.htm,.txt,.csv,.json,.md,image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-800 font-bold">
                  {fileName ? `已选择：${fileName}` : '点击选择或拖拽文件到此处'}
                </div>
                <p className="text-[11px] text-slate-400">
                  支持 HTML 网页导出、TXT、CSV、JSON 或各类图片
                </p>
              </div>
            )}

            {/* Status Message */}
            {statusMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 Cols): Recognized Result Cards & Batch Import */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            {/* Header & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>2. 识别结果列表 ({recognizedItems.length} 条)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  待导入 <strong className="text-amber-700 font-bold">{pendingCount}</strong> 条 · 已入库{' '}
                  <strong className="text-emerald-700 font-bold">{importedCount}</strong> 条
                </p>
              </div>

              {/* Batch Import Button */}
              {recognizedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchImport}
                  disabled={pendingCount === 0 || batchProgress?.isRunning}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>批量一键导入已勾选 ({selectedCount})</span>
                </button>
              )}
            </div>

            {/* Filter Tabs & Quick Search */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                    filterTab === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  全部 ({recognizedItems.length})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab('scheme')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                    filterTab === 'scheme'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Sprout className="w-3 h-3" />
                  <span>水肥方案</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab('pest')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                    filterTab === 'pest'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Bug className="w-3 h-3" />
                  <span>病虫档案</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab('pending')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                    filterTab === 'pending'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  仅看未导入 ({pendingCount})
                </button>
              </div>

              {/* Select All Checkbox */}
              {recognizedItems.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleSelectAll(recognizedItems.some((it) => !it.selected))
                    }
                    className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1"
                  >
                    {recognizedItems.every((it) => it.selected) ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>全选 / 反选</span>
                  </button>
                </div>
              )}
            </div>

            {/* List of Boxed Results */}
            <div className="max-h-[560px] overflow-y-auto space-y-3 p-1">
              {filteredResults.length === 0 ? (
                <div className="p-10 bg-slate-50 rounded-3xl border border-slate-200 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">暂无匹配的识别结果</p>
                  <p className="text-[11px] text-slate-400">
                    请在左侧粘贴文本、截图或上传文档，系统将自动识别提取。
                  </p>
                </div>
              ) : (
                filteredResults.map((item) => {
                  const isScheme = item.kind === 'scheme';
                  const title = isScheme ? item.schemeData?.name : item.pestData?.name;
                  const isImported = item.isImported;

                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-3xl border-2 p-4 transition-all duration-200 shadow-2xs flex flex-col justify-between gap-3 ${
                        isImported
                          ? 'border-emerald-400 bg-emerald-50/20 ring-1 ring-emerald-300/40'
                          : item.selected
                          ? 'border-slate-300 bg-white hover:border-slate-400'
                          : 'border-slate-200 bg-slate-50/60 opacity-80'
                      }`}
                    >
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(item.id)}
                            className="text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
                          >
                            {item.selected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>

                          {/* Kind Badge */}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black rounded-lg shrink-0 flex items-center gap-1 ${
                              isScheme
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isScheme ? <Sprout className="w-3 h-3" /> : <Bug className="w-3 h-3" />}
                            <span>{isScheme ? '水肥方案' : '病虫档案'}</span>
                          </span>

                          {/* Title */}
                          <h4 className="font-black text-slate-900 text-xs md:text-sm truncate">
                            {title}
                          </h4>
                        </div>

                        {/* Status Badge & Copy Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Status Badge */}
                          {isImported ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black rounded-lg flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>已导入智库</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-lg">
                              未导入 (待入库)
                            </span>
                          )}

                          {/* Copy formatted text button */}
                          <button
                            type="button"
                            onClick={() => handleCopyItem(item)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                            title="复制格式化方案文本到剪贴板"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Content Preview Details */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1.5 text-slate-600">
                        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200/60">
                          <span className="font-semibold text-slate-700">
                            归属作物: <strong className="text-emerald-700">{item.targetCropName}</strong>
                          </span>
                          <span className="text-slate-400">
                            {isScheme
                              ? `${item.schemeData?.stages.length || 0} 个阶段`
                              : item.pestData?.categoryGroup || item.pestData?.type}
                          </span>
                        </div>

                        {isScheme && item.schemeData && (
                          <div className="space-y-1 pt-0.5">
                            {item.schemeData.stages.slice(0, 3).map((stg, sIdx) => (
                              <div key={sIdx} className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-800">
                                  阶段{stg.order}·{stg.stageName}
                                </span>
                                <span className="text-slate-500 font-mono truncate max-w-[200px]">
                                  {stg.items[0]?.fertilizer}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {!isScheme && item.pestData && (
                          <div className="space-y-1 pt-0.5">
                            <p className="text-[11px] text-slate-700 line-clamp-2">
                              {item.pestData.symptoms}
                            </p>
                            {item.pestData.chemicalControl.length > 0 && (
                              <div className="text-[10px] text-amber-900 font-bold bg-amber-50/80 p-1 rounded-lg">
                                💊 防治配方：{item.pestData.chemicalControl[0].formulaName} ({item.pestData.chemicalControl[0].dosageRate})
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Buttons: Modify Import & Delete */}
                      <div className="flex items-center justify-between pt-1 text-xs gap-2">
                        <div className="text-[10px] text-slate-400">
                          {item.importedAt ? `导入时间：${item.importedAt}` : '可点击修改导入调整配方'}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            title="删除此识别结果项"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>删除</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsEditModalOpen(true);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer ${
                              isImported
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isImported ? '再次修改并同步' : '修改导入'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Progress Bar if running batch import */}
            {batchProgress && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-emerald-600 ${
                        batchProgress.isRunning ? 'animate-spin' : ''
                      }`}
                    />
                    <span>
                      {batchProgress.isDone
                        ? '🎉 批量导入完成！'
                        : `正在逐条同步入库... [ ${batchProgress.current} / ${batchProgress.total} ]`}
                    </span>
                  </div>
                  <span className="font-mono">
                    {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                  </span>
                </div>

                {/* Progress track */}
                <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-200"
                    style={{
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual "修改导入" Modal Window */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    editingItem.kind === 'scheme'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {editingItem.kind === 'scheme' ? (
                    <Sprout className="w-5 h-5" />
                  ) : (
                    <Bug className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    修改导入 · {editingItem.kind === 'scheme' ? '水肥方案精细化调整' : '病虫害防治档案精细化调整'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    核对并调整识别出的物候阶段、肥料用量、农药配方，点击确认即可导入智库。
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Target Crop Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                归属作物 (未指定时默认作为通用跨作物方案)
              </label>
              <select
                value={editingItem.targetCropId}
                onChange={(e) => {
                  const val = e.target.value;
                  const cName = crops.find((c) => c.id === val)?.name || '通用作物';
                  setEditingItem({
                    ...editingItem,
                    targetCropId: val,
                    targetCropName: cName,
                  });
                }}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
              >
                <option value="general">🌐 通用作物 (跨作物标准方案)</option>
                {crops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.categoryId || '标准作物'})
                  </option>
                ))}
              </select>
            </div>

            {/* If Scheme */}
            {editingItem.kind === 'scheme' && editingItem.schemeData && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">方案名称 *</label>
                  <input
                    type="text"
                    value={editingItem.schemeData.title}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        schemeData: { ...editingItem.schemeData!, title: e.target.value },
                      })
                    }
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl font-bold bg-white"
                  />
                </div>

                {/* Stages List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>物候阶段与肥料配方 ({editingItem.schemeData.stages.length} 个阶段)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextOrder = editingItem.schemeData!.stages.length + 1;
                        const newStage: FertilizerStage = {
                          id: `stg-${Date.now()}`,
                          order: nextOrder,
                          stageName: `第${nextOrder}阶段`,
                          subStageName: '关键物候期',
                          timing: '适期施用',
                          items: [
                            {
                              id: `it-${Date.now()}`,
                              fertilizer: '平衡型大量元素水溶肥',
                              dosage: '5-10kg/亩',
                              method: '滴灌',
                              remarks: '',
                              isKeyPoint: true,
                            },
                          ],
                          managementTips: '',
                        };
                        setEditingItem({
                          ...editingItem,
                          schemeData: {
                            ...editingItem.schemeData!,
                            stages: [...editingItem.schemeData!.stages, newStage],
                          },
                        });
                      }}
                      className="text-emerald-700 hover:text-emerald-900 font-bold"
                    >
                      + 增加阶段
                    </button>
                  </div>

                  {editingItem.schemeData.stages.map((stg, sIdx) => (
                    <div
                      key={stg.id || sIdx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={stg.stageName}
                          onChange={(e) => {
                            const stages = [...editingItem.schemeData!.stages];
                            stages[sIdx].stageName = e.target.value;
                            setEditingItem({
                              ...editingItem,
                              schemeData: { ...editingItem.schemeData!, stages },
                            });
                          }}
                          placeholder="阶段名称 (如: 膨果期)"
                          className="p-1.5 bg-white border border-slate-300 rounded-lg font-bold text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const stages = editingItem.schemeData!.stages.filter(
                              (_, i) => i !== sIdx
                            );
                            setEditingItem({
                              ...editingItem,
                              schemeData: { ...editingItem.schemeData!, stages },
                            });
                          }}
                          className="text-rose-600 hover:text-rose-800 text-[11px]"
                        >
                          删除此阶段
                        </button>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        {stg.items.map((it, itIdx) => (
                          <div
                            key={it.id || itIdx}
                            className="grid grid-cols-3 gap-2 bg-white p-2 rounded-xl border border-slate-200"
                          >
                            <input
                              type="text"
                              value={it.fertilizer}
                              onChange={(e) => {
                                const stages = [...editingItem.schemeData!.stages];
                                stages[sIdx].items[itIdx].fertilizer = e.target.value;
                                setEditingItem({
                                  ...editingItem,
                                  schemeData: { ...editingItem.schemeData!, stages },
                                });
                              }}
                              placeholder="肥料品名/配方"
                              className="p-1 border border-slate-300 rounded text-xs col-span-2"
                            />
                            <input
                              type="text"
                              value={it.dosage}
                              onChange={(e) => {
                                const stages = [...editingItem.schemeData!.stages];
                                stages[sIdx].items[itIdx].dosage = e.target.value;
                                setEditingItem({
                                  ...editingItem,
                                  schemeData: { ...editingItem.schemeData!, stages },
                                });
                              }}
                              placeholder="亩用量"
                              className="p-1 border border-slate-300 rounded text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* If Pest */}
            {editingItem.kind === 'pest' && editingItem.pestData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      病虫害名称 *
                    </label>
                    <input
                      type="text"
                      value={editingItem.pestData.name}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          pestData: { ...editingItem.pestData!, name: e.target.value },
                        })
                      }
                      className="w-full p-2.5 text-xs border border-slate-300 rounded-xl font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      危害程度
                    </label>
                    <select
                      value={editingItem.pestData.dangerLevel}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          pestData: { ...editingItem.pestData!, dangerLevel: e.target.value },
                        })
                      }
                      className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                    >
                      <option value="低度危害">低度危害</option>
                      <option value="中度危害">中度危害</option>
                      <option value="严重危害">严重危害</option>
                      <option value="爆发性毁灭">爆发性毁灭</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    症状识别特征
                  </label>
                  <textarea
                    rows={3}
                    value={editingItem.pestData.symptoms}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        pestData: { ...editingItem.pestData!, symptoms: e.target.value },
                      })
                    }
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                  />
                </div>

                {/* Multi-Image Uploader for Pest Item */}
                <div>
                  <MultiImageUploader
                    images={editingItem.pestData.images || []}
                    onChange={(imgs) => {
                      setEditingItem({
                        ...editingItem,
                        pestData: { ...editingItem.pestData!, images: imgs },
                      });
                    }}
                    onPreviewOriginal={(url, idx) => {
                      setLightboxData({
                        images: editingItem.pestData?.images || [url],
                        initialIndex: idx,
                        title: `${editingItem.pestData?.name} - 高清图`,
                      });
                    }}
                  />
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmEditModal}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>确认导入智库</span>
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
