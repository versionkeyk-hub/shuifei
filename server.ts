import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy get Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// AI Parse Scheme Endpoint
app.post("/api/ai/parse-scheme", async (req, res) => {
  try {
    const { text, imageBase64, mimeType, cropName } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is not configured" });
    }

    const systemPrompt = `你是一位农业水肥一体化专家。请将用户提供的施肥方案（文字、表格或图片）解析为标准的多阶段施肥方案JSON数据。
每个阶段(stage)包括：
- stageName: 施肥时期/阶段名称 (如: 基肥、秋施基肥、苗期、伸蔓期、促花肥、幼果期、膨果期、壮果肥等)
- subStageName: (可选) 子时期/细分阶段 (如: 缓苗水、团棵期、出苗后、枝叶满架-采收等，若无则为空字符串)
- order: 阶段顺序号 (从1开始)
- items: 该阶段下的施肥记录列表，每项包括:
  - fertilizer: 肥料名称/产品组合 (例如: 傲生、傲脉、施可收平衡型、蓓能高氮、花大夫、磷酸二氢钾、腐熟农家肥等)
  - dosage: 数量/亩用量 (例如: 3-4方、50kg、2-3kg/亩、800-1000倍、30-40g兑水15-20kg等)
  - method: 施肥方式 (例如: 均匀撒施、滴灌或冲施、叶面喷洒、浸种、拌种、沟施/穴施等)
  - remarks: 备注/管理要点 (例如: 避高温强光、稀释后混合、开花前后叶喷2次、结合病虫害防治等)

方案元数据：
- schemeTitle: 方案标题 (例如: "${cropName || "作物"}水肥一体化施肥方案")
- targetCrop: 适用作物名称
- summary: 方案核心管理要点概要总结`;

    const contents: any[] = [];
    if (imageBase64) {
      contents.push({
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, "").replace(/^data:application\/pdf;base64,/, ""),
          mimeType: mimeType || "image/png",
        },
      });
    }

    const userPrompt = text
      ? `请解析以下施肥方案内容，作物提示：${cropName || "未指定"}。\n方案内容：\n${text}`
      : `请识别并解析图片/PDF中的施肥方案表格，作物提示：${cropName || "未指定"}。`;

    contents.push({ text: userPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: contents.length === 1 ? contents[0].text : { parts: contents },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schemeTitle: { type: Type.STRING },
            targetCrop: { type: Type.STRING },
            summary: { type: Type.STRING },
            stages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stageName: { type: Type.STRING },
                  subStageName: { type: Type.STRING },
                  order: { type: Type.INTEGER },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        fertilizer: { type: Type.STRING },
                        dosage: { type: Type.STRING },
                        method: { type: Type.STRING },
                        remarks: { type: Type.STRING },
                      },
                      required: ["fertilizer", "dosage", "method", "remarks"],
                    },
                  },
                },
                required: ["stageName", "order", "items"],
              },
            },
          },
          required: ["schemeTitle", "targetCrop", "stages"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Parse scheme error:", error);
    res.status(500).json({ error: error.message || "Failed to parse fertilization scheme" });
  }
});

// AI Parse Pest & Disease Endpoint
app.post("/api/ai/parse-pest-disease", async (req, res) => {
  try {
    const { text, imageBase64, mimeType, cropName, diseaseName } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ error: "Gemini API key is not configured" });
    }

    const systemPrompt = `你是一位农业植保与病虫害防治专家。请针对用户指定的作物和病虫害进行权威分析，生成结构化防治方案。
包含字段：
- diseaseName: 病害或虫害名称 (如: 霜霉病、炭疽病、白粉病、根结线虫、蓟马、红蜘蛛、盲蝽蟓等)
- cropName: 适用作物
- type: 分类 ("病害" 或 "虫害" 或 "生理性病害")
- dangerLevel: 危害等级 ("低度危害" | "中度危害" | "严重危害" | "爆发性毁灭")
- symptoms: 发病症状与识别特征描述
- occurrenceRules: 发生规律与发病环境条件 (温度、湿度、季节等)
- agriculturalControl: 农业防治与田间管理要点 (如清园消毒、合理修剪、水肥调节)
- chemicalControl: 化学防治推荐药剂与配方 (如保护性杀菌剂与内吸性杀菌剂配伍，包含具体药剂、推荐稀释倍数、安全间隔期)
- fertilizerSynergy: 水肥协同增强抗逆方案 (配合哪些功能性水肥如傲脉、沣硕、氨基酸、磷酸二氢钾提升抗病力)
- keyNotes: 注意事项与混配禁忌`;

    const contents: any[] = [];
    if (imageBase64) {
      contents.push({
        inlineData: {
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ""),
          mimeType: mimeType || "image/png",
        },
      });
    }

    const promptText = `作物：${cropName || "通用作物"}，病虫害：${diseaseName || "请识别"}。\n描述或需求：${text || "请根据提供的信息生成详细病虫害识别与防治方案"}`;
    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: contents.length === 1 ? contents[0].text : { parts: contents },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diseaseName: { type: Type.STRING },
            cropName: { type: Type.STRING },
            type: { type: Type.STRING },
            dangerLevel: { type: Type.STRING },
            symptoms: { type: Type.STRING },
            occurrenceRules: { type: Type.STRING },
            agriculturalControl: { type: Type.STRING },
            chemicalControl: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  formulaName: { type: Type.STRING },
                  dosageRate: { type: Type.STRING },
                  timing: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                },
                required: ["formulaName", "dosageRate", "timing"],
              },
            },
            fertilizerSynergy: { type: Type.STRING },
            keyNotes: { type: Type.STRING },
          },
          required: ["diseaseName", "type", "symptoms", "agriculturalControl", "chemicalControl"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Parse pest error:", error);
    res.status(500).json({ error: error.message || "Failed to parse pest/disease info" });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`农小蛙水肥管理系统服务器运行在端口: ${PORT}`);
  });
}

startServer();
