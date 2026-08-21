import { FertilizationScheme, FertilizerStage, WatermarkConfig } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Generate text content for plain text download
export function generateSchemeText(scheme: FertilizationScheme, watermarkText: string): string {
  let output = `====================================================\n`;
  output += `【${scheme.title}】\n`;
  output += `适用作物: ${scheme.cropName} | 方案类型: ${scheme.schemeType} | 版本: ${scheme.version}\n`;
  output += `编制单位: ${scheme.author} | 水印认证: [${watermarkText}]\n`;
  output += `====================================================\n\n`;

  if (scheme.summary) {
    output += `【方案核心要点】: ${scheme.summary}\n\n`;
  }

  scheme.stages.forEach((stg, idx) => {
    output += `----------------------------------------------------\n`;
    output += `阶段 ${idx + 1}: ${stg.stageName} ${stg.subStageName ? `(${stg.subStageName})` : ''}\n`;
    if (stg.timing) output += `时期说明: ${stg.timing}\n`;
    if (stg.managementTips) output += `管理提示: ${stg.managementTips}\n`;
    output += `施肥明细:\n`;
    stg.items.forEach((item, itemIdx) => {
      output += `  ${itemIdx + 1}. 肥料: ${item.fertilizer.padEnd(24)} | 用量: ${item.dosage.padEnd(16)} | 方式: ${item.method.padEnd(14)} | 备注: ${item.remarks || '-'}\n`;
    });
    output += `\n`;
  });

  if (scheme.generalNotes) {
    output += `\n【通用注意事项】: ${scheme.generalNotes}\n`;
  }
  output += `\n© ${watermarkText} - 保留所有权利`;
  return output;
}

// Generate Markdown format
export function generateSchemeMarkdown(scheme: FertilizationScheme, watermarkText: string): string {
  let md = `# ${scheme.title}\n\n`;
  md += `> **认证水印**: ${watermarkText} | **适用作物**: ${scheme.cropName} | **方案类别**: ${scheme.schemeType} | **版本**: ${scheme.version}\n\n`;
  
  if (scheme.summary) {
    md += `### 方案概要\n${scheme.summary}\n\n`;
  }

  md += `### 水肥一体化施肥明细表\n\n`;
  md += `| 施肥时期 / 阶段 | 子时期 / 节点 | 肥料产品组合 | 数量（亩用量） | 施肥方式 | 备注与管理要点 |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  scheme.stages.forEach((stg) => {
    stg.items.forEach((item, itemIdx) => {
      const stageCol = itemIdx === 0 ? `**${stg.stageName}**` : '';
      const subStageCol = itemIdx === 0 ? (stg.subStageName || '-') : '';
      md += `| ${stageCol} | ${subStageCol} | ${item.fertilizer} | ${item.dosage} | ${item.method} | ${item.remarks || '-'} |\n`;
    });
  });

  if (scheme.generalNotes) {
    md += `\n### 通用管理与施用注意事项\n${scheme.generalNotes}\n`;
  }
  return md;
}

// Generate CSV string
export function generateSchemeCSV(scheme: FertilizationScheme): string {
  const headers = ['施肥时期', '细分时期', '肥料产品', '数量/亩用量', '施肥方式', '备注/技术要点'];
  const rows: string[][] = [headers];

  scheme.stages.forEach((stg) => {
    stg.items.forEach((item) => {
      rows.push([
        `"${stg.stageName.replace(/"/g, '""')}"`,
        `"${(stg.subStageName || '').replace(/"/g, '""')}"`,
        `"${item.fertilizer.replace(/"/g, '""')}"`,
        `"${item.dosage.replace(/"/g, '""')}"`,
        `"${item.method.replace(/"/g, '""')}"`,
        `"${(item.remarks || '').replace(/"/g, '""')}"`,
      ]);
    });
  });

  return '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
}

// Generate standalone HTML
export function generateSchemeHTML(scheme: FertilizationScheme, watermarkText: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${scheme.title} - ${watermarkText}</title>
  <style>
    body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; background: #f8fafc; color: #1e293b; padding: 40px; margin: 0; }
    .container { max-width: 1080px; margin: 0 auto; background: #fff; padding: 36px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); position: relative; overflow: hidden; }
    .watermark-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: 0.12; font-size: 28px; font-weight: bold; color: #059669; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-around; transform: rotate(-25deg); z-index: 1; }
    .watermark-item { padding: 40px; }
    .content { position: relative; z-index: 2; }
    h1 { text-align: center; color: #dc2626; margin-bottom: 8px; font-size: 24px; }
    .meta { text-align: center; color: #64748b; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; border: 2px solid #000; }
    th, td { border: 1px solid #000; padding: 10px 14px; font-size: 14px; }
    th { background: #f1f5f9; font-weight: 600; text-align: center; }
    .notes { margin-top: 24px; padding: 16px; background: #f8fafc; border-left: 4px solid #059669; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="watermark-bg">
      <div class="watermark-item">${watermarkText}</div>
      <div class="watermark-item">${watermarkText}</div>
      <div class="watermark-item">${watermarkText}</div>
      <div class="watermark-item">${watermarkText}</div>
      <div class="watermark-item">${watermarkText}</div>
      <div class="watermark-item">${watermarkText}</div>
    </div>
    <div class="content">
      <h1>${scheme.title}</h1>
      <div class="meta">适用作物: ${scheme.cropName} | 方案类型: ${scheme.schemeType} | 编制单位: ${scheme.author} | 版本: ${scheme.version}</div>
      <table>
        <thead>
          <tr>
            <th>施肥时期</th>
            <th>肥料</th>
            <th>数量（亩用量）</th>
            <th>施肥方式</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          ${scheme.stages.map((stg) => {
            return stg.items.map((item, idx) => {
              const stageHtml = idx === 0 
                ? `<td rowspan="${stg.items.length}" style="text-align:center;font-weight:600;background:#fafafa;">
                    ${stg.stageName}
                    ${stg.subStageName ? `<br><span style="font-size:12px;color:#64748b;font-weight:normal;">(${stg.subStageName})</span>` : ''}
                   </td>` 
                : '';
              return `<tr>
                ${stageHtml}
                <td>${item.fertilizer}</td>
                <td>${item.dosage}</td>
                <td>${item.method}</td>
                <td>${item.remarks || '-'}</td>
              </tr>`;
            }).join('');
          }).join('')}
        </tbody>
      </table>
      ${scheme.generalNotes ? `<div class="notes"><strong>管理要点与注意事项:</strong><br>${scheme.generalNotes}</div>` : ''}
    </div>
  </div>
</body>
</html>`;
}

// Export high resolution PNG / JPG from DOM element with guaranteed watermark
export async function exportElementAsImage(
  element: HTMLElement,
  filename: string,
  type: 'png' | 'jpeg' = 'png'
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL(`image/${type}`, 0.95);
  const link = document.createElement('a');
  link.href = imgData;
  link.download = `${filename}.${type === 'jpeg' ? 'jpg' : 'png'}`;
  link.click();
}

// Export formatted PDF with custom watermark
export async function exportElementAsPDF(
  element: HTMLElement,
  filename: string,
  watermarkConfig: WatermarkConfig
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Apply subtle diagonal watermark text
  if (watermarkConfig?.enabled && watermarkConfig?.text) {
    pdf.setTextColor(180, 200, 190);
    pdf.setFontSize(28);
    for (let x = 20; x < pdfWidth; x += 80) {
      for (let y = 30; y < pdfHeight; y += 70) {
        pdf.text(watermarkConfig.text, x, y, { angle: 30 });
      }
    }
  }

  pdf.save(`${filename}.pdf`);
}

// Helper to trigger file download
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
