import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  ArrowRight,
  Layers,
  Sprout,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Crop, FertilizationScheme, FertilizerStage } from '../types';

interface AIImporterViewProps {
  crops: Crop[];
  onImportComplete: (newScheme: FertilizationScheme, targetCropId: string) => void;
  onSelectCrop: (cropId: string) => void;
}

export const AIImporterView: React.FC<AIImporterViewProps> = ({
  crops,
  onImportComplete,
  onSelectCrop,
}) => {
  const [selectedCropId, setSelectedCropId] = useState<string>(crops[0]?.id || '');
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileMimeType, setFileMimeType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedScheme, setParsedScheme] = useState<FertilizationScheme | null>(null);

  const targetCrop = crops.find((c) => c.id === selectedCropId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileBase64(base64);
      setFileMimeType(file.type || 'application/pdf');
    };
    reader.readAsDataURL(file);
  };

  const handleStartParsing = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setParsedScheme(null);

    try {
      const payload: any = {
        cropName: targetCrop?.name || '作物',
      };

      if (uploadMode === 'file' && fileBase64) {
        payload.fileBase64 = fileBase64;
        payload.mimeType = fileMimeType;
      } else if (uploadMode === 'text' && pastedText.trim()) {
        payload.rawText = pastedText.trim();
      } else {
        throw new Error('请先上传PDF/图片文件或粘贴方案文字内容');
      }

      const res = await fetch('/api/ai/parse-scheme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI 解析失败，请检查文件清晰度或重试');
      }

      const schemeData = data.scheme;
      const formattedScheme: FertilizationScheme = {
        id: `scheme-${selectedCropId}-${Date.now()}`,
        cropId: selectedCropId,
        cropName: targetCrop?.name || schemeData.cropName || '作物',
        title: schemeData.title || `${targetCrop?.name}全周期水肥一体化方案`,
        schemeType: schemeData.schemeType || '全周期方案',
        author: schemeData.author || '农小蛙技术中心',
        version: 'v1.0',
        summary: schemeData.summary || '',
        generalNotes: schemeData.generalNotes || '注意施肥前后清水冲洗管网。',
        isPublished: true,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        stages: (schemeData.stages || []).map((stg: any, sIdx: number) => ({
          id: `stg-${Date.now()}-${sIdx}`,
          stageName: stg.stageName || `阶段 ${sIdx + 1}`,
          subStageName: stg.subStageName || '',
          order: sIdx + 1,
          timing: stg.timing || '',
          managementTips: stg.managementTips || '',
          items: (stg.items || []).map((it: any, iIdx: number) => ({
            id: `item-${Date.now()}-${sIdx}-${iIdx}`,
            fertilizer: it.fertilizer || '傲脉',
            dosage: it.dosage || '3-5kg/亩',
            method: it.method || '滴灌或冲施',
            remarks: it.remarks || '',
          })),
        })),
      };

      setParsedScheme(formattedScheme);
    } catch (err: any) {
      console.error('Parse scheme error:', err);
      setErrorMsg(err.message || '解析遇到问题，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToCrop = () => {
    if (!parsedScheme) return;
    onImportComplete(parsedScheme, selectedCropId);
    alert(`成功录入方案【${parsedScheme.title}】到【${targetCrop?.name}】！`);
    onSelectCrop(selectedCropId);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini AI 智能施肥表与PDF自动结构化解析</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            上传方案表格图片或 PDF，一键自动识别填入作物智库
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
            支持自动识别施肥时期、细分子阶段、肥料名称（如傲生、傲脉、施可收）、亩用量、施肥方式与田间管理备注，并自动生成结构化物候阶段数据。
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
        {/* Step 1: Target Crop Picker */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            第一步：选择该方案归属的具体作物
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {crops.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCropId(c.id)}
                className={`p-2.5 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between ${
                  selectedCropId === c.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({c.schemeCount}套)</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Upload source mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              第二步：提供待解析的施肥方案文件或文字
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setUploadMode('file')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  uploadMode === 'file' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                上传 PDF / 表格照片
              </button>
              <button
                onClick={() => setUploadMode('text')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  uploadMode === 'text' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                粘贴方案文本 / Markdown
              </button>
            </div>
          </div>

          {uploadMode === 'file' ? (
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-8 text-center bg-slate-50/60 transition-colors">
              <input
                type="file"
                id="file-upload"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    {selectedFile ? selectedFile.name : '点击选择或拖拽上传 PDF / 方案表格图片'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    支持 PDF、JPG、PNG、WEBP 格式（最大 15MB）
                  </span>
                </div>
              </label>
            </div>
          ) : (
            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="请在此粘贴作物施肥方案文本、表格内容或技术指导文档..."
              className="w-full p-4 text-xs md:text-sm border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
            />
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            由 Google Gemini 模型提供高精度农业表格解析服务
          </span>

          <button
            onClick={handleStartParsing}
            disabled={isLoading || (uploadMode === 'file' && !selectedFile) || (uploadMode === 'text' && !pastedText.trim())}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs md:text-sm font-bold shadow-md transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI 正在识别解析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>开始 AI 智能识别</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Parsed Result Preview & Commit Section */}
      {parsedScheme && (
        <div className="bg-white rounded-3xl border border-emerald-300 p-6 md:p-8 space-y-6 shadow-md animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>AI 识别成功！已结构化提取 {parsedScheme.stages.length} 个物候阶段</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">{parsedScheme.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                目标作物: <strong className="text-emerald-700">{targetCrop?.name}</strong> · 类型: {parsedScheme.schemeType} · 编制: {parsedScheme.author}
              </p>
            </div>

            <button
              onClick={handleSaveToCrop}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-md transition-colors flex items-center gap-2 shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>确认录入到【{targetCrop?.name}】方案库</span>
            </button>
          </div>

          {/* Table Preview */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border-2 border-black text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold">
                  <th className="border border-black p-2 text-center w-28">施肥时期</th>
                  <th className="border border-black p-2 text-center">肥料产品</th>
                  <th className="border border-black p-2 text-center w-36">数量（亩用量）</th>
                  <th className="border border-black p-2 text-center w-32">施肥方式</th>
                  <th className="border border-black p-2 text-center w-48">备注</th>
                </tr>
              </thead>
              <tbody>
                {parsedScheme.stages.map((stg) => {
                  return stg.items.map((item, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <tr key={item.id}>
                        {isFirst && (
                          <td
                            rowSpan={stg.items.length}
                            className="border border-black p-2 text-center font-bold bg-slate-50 align-middle"
                          >
                            <div>{stg.stageName}</div>
                            {stg.subStageName && (
                              <div className="text-[10px] text-emerald-700 font-normal">
                                ({stg.subStageName})
                              </div>
                            )}
                          </td>
                        )}
                        <td className="border border-black p-2 font-medium">{item.fertilizer}</td>
                        <td className="border border-black p-2 text-center">{item.dosage}</td>
                        <td className="border border-black p-2 text-center">{item.method}</td>
                        <td className="border border-black p-2 text-slate-600">{item.remarks || '-'}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          {parsedScheme.generalNotes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <strong>管理要点：</strong> {parsedScheme.generalNotes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
