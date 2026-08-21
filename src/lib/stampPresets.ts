import { WatermarkImagePreset } from '../types';

// 使用 Canvas 动态生成标准透明 PNG 电子印章 Data URL
export function generateOfficialStampPNG(
  companyName: string,
  subText: string,
  stampType: 'circle' | 'oval' | 'rect',
  color: 'red' | 'blue' | 'emerald' | 'amber' = 'red'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const colorMap = {
    red: '#dc2626',
    blue: '#2563eb',
    emerald: '#059669',
    amber: '#d97706',
  };
  const mainColor = colorMap[color] || '#dc2626';

  ctx.clearRect(0, 0, 300, 300);
  ctx.strokeStyle = mainColor;
  ctx.fillStyle = mainColor;

  if (stampType === 'circle') {
    const cx = 150;
    const cy = 150;
    const radius = 130;

    // Outer thick circle
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner thin circle
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Center 5-point star
    ctx.save();
    ctx.translate(cx, cy - 8);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        Math.cos(((18 + i * 72) * Math.PI) / 180) * 26,
        -Math.sin(((18 + i * 72) * Math.PI) / 180) * 26
      );
      ctx.lineTo(
        Math.cos(((54 + i * 72) * Math.PI) / 180) * 12,
        -Math.sin(((54 + i * 72) * Math.PI) / 180) * 12
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Arc text around upper half
    ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = companyName.split('');
    const totalAngle = Math.PI * 0.85;
    const startAngle = -Math.PI / 2 - totalAngle / 2;
    const stepAngle = totalAngle / (chars.length - 1 || 1);

    chars.forEach((char, i) => {
      const angle = startAngle + i * stepAngle;
      ctx.save();
      ctx.translate(cx + (radius - 32) * Math.cos(angle), cy + (radius - 32) * Math.sin(angle));
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });

    // Subtext at bottom
    ctx.font = 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(subText, cx, cy + 56);

    // Date / Serial
    ctx.font = '11px monospace';
    ctx.fillText('★ 2026 官方认证 ★', cx, cy + 82);
  } else if (stampType === 'oval') {
    // Oval stamp
    const cx = 150;
    const cy = 150;
    const rx = 135;
    const ry = 95;

    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 7, ry - 7, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 20px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(companyName, cx, cy - 25);

    ctx.font = 'bold 24px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(subText, cx, cy + 12);

    ctx.font = '12px sans-serif';
    ctx.fillText('技术中心批准专用', cx, cy + 42);
  } else {
    // Double rectangle
    ctx.lineWidth = 5;
    ctx.strokeRect(20, 70, 260, 160);
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 78, 244, 144);

    ctx.font = 'bold 20px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(companyName, 150, 120);

    ctx.font = 'bold 26px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(subText, 150, 165);

    ctx.font = '12px monospace';
    ctx.fillText('内部技术资料 · 严禁翻印', 150, 198);
  }

  return canvas.toDataURL('image/png');
}

// 预设 4 款精美官方透明 PNG 印章（直接使用 SVG Data URL，无需等待浏览器加载，性能极其优异）
export const DEFAULT_STAMP_PRESETS: WatermarkImagePreset[] = [
  {
    id: 'stamp-official-red',
    title: '预设 1：惠民皓天 官方认证方案章',
    subtitle: '红头标准印章 · 适合对外输出与农户方案定稿',
    tag: '官方认证',
    stampColor: 'red',
    imageUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
        <circle cx="150" cy="150" r="138" fill="none" stroke="#dc2626" stroke-width="6" opacity="0.88"/>
        <circle cx="150" cy="150" r="128" fill="none" stroke="#dc2626" stroke-width="2" opacity="0.88"/>
        <polygon points="150,118 158,142 184,142 163,158 171,182 150,166 129,182 137,158 116,142 142,142" fill="#dc2626" opacity="0.88"/>
        <path id="textPath1" d="M 38,150 A 112,112 0 0,1 262,150" fill="none" stroke="none"/>
        <text font-size="21" font-weight="900" fill="#dc2626" opacity="0.88" letter-spacing="4">
          <textPath href="#textPath1" startOffset="50%" text-anchor="middle">惠民皓天农业科技有限公司</textPath>
        </text>
        <text x="150" y="215" font-size="20" font-weight="bold" fill="#dc2626" text-anchor="middle" opacity="0.88" letter-spacing="2">水肥方案专用章</text>
        <text x="150" y="242" font-size="11" font-family="monospace" fill="#dc2626" text-anchor="middle" opacity="0.88">★ 技术中心官方审定 ★</text>
      </svg>
    `),
  },
  {
    id: 'stamp-tech-approval',
    title: '预设 2：农小蛙 专家组审核批准章',
    subtitle: '椭圆审核印章 · 适合经作高端基地定制方案',
    tag: '专家审定',
    stampColor: 'red',
    imageUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220" width="300" height="220">
        <ellipse cx="150" cy="110" rx="140" ry="98" fill="none" stroke="#e11d48" stroke-width="6" opacity="0.88"/>
        <ellipse cx="150" cy="110" rx="130" ry="88" fill="none" stroke="#e11d48" stroke-width="2" opacity="0.88"/>
        <text x="150" y="72" font-size="20" font-weight="900" fill="#e11d48" text-anchor="middle" opacity="0.88" letter-spacing="2">农小蛙技术研发中心</text>
        <text x="150" y="118" font-size="24" font-weight="900" fill="#e11d48" text-anchor="middle" opacity="0.88" letter-spacing="4">【审核批准】</text>
        <text x="150" y="152" font-size="14" font-weight="bold" fill="#e11d48" text-anchor="middle" opacity="0.88">作物精准水肥管理技术专章</text>
        <text x="150" y="176" font-size="10" font-family="monospace" fill="#e11d48" text-anchor="middle" opacity="0.88">编号：NXW-TECH-2026</text>
      </svg>
    `),
  },
  {
    id: 'stamp-eco-cert',
    title: '预设 3：绿色生态植保 认证印章',
    subtitle: '翡翠绿生态印章 · 适合绿色防控与微生物菌肥方案',
    tag: '生态认证',
    stampColor: 'emerald',
    imageUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
        <circle cx="150" cy="150" r="138" fill="none" stroke="#059669" stroke-width="6" opacity="0.88"/>
        <circle cx="150" cy="150" r="128" fill="none" stroke="#059669" stroke-width="2" opacity="0.88"/>
        <path d="M 150,110 C 130,135 125,160 150,175 C 175,160 170,135 150,110 Z" fill="#059669" opacity="0.88"/>
        <path id="textPath3" d="M 38,150 A 112,112 0 0,1 262,150" fill="none" stroke="none"/>
        <text font-size="21" font-weight="900" fill="#059669" opacity="0.88" letter-spacing="3">
          <textPath href="#textPath3" startOffset="50%" text-anchor="middle">惠民皓天生态农业体系</textPath>
        </text>
        <text x="150" y="215" font-size="19" font-weight="bold" fill="#059669" text-anchor="middle" opacity="0.88" letter-spacing="2">水肥一体化示范</text>
        <text x="150" y="242" font-size="11" font-family="monospace" fill="#059669" text-anchor="middle" opacity="0.88">★ 生物增效·提质减量 ★</text>
      </svg>
    `),
  },
  {
    id: 'stamp-internal-confidential',
    title: '预设 4：内部核心技术 严禁外传',
    subtitle: '深蓝双框密件印章 · 适合公司内部培训与农技师保密方案',
    tag: '内部密件',
    stampColor: 'blue',
    imageUrl: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
        <rect x="15" y="20" width="270" height="160" rx="10" fill="none" stroke="#2563eb" stroke-width="6" opacity="0.88"/>
        <rect x="25" y="30" width="250" height="140" rx="6" fill="none" stroke="#2563eb" stroke-width="2" opacity="0.88"/>
        <text x="150" y="70" font-size="18" font-weight="bold" fill="#2563eb" text-anchor="middle" opacity="0.88">惠民皓天 内部技术档案</text>
        <text x="150" y="115" font-size="28" font-weight="900" fill="#2563eb" text-anchor="middle" opacity="0.88" letter-spacing="4">【机密资料】</text>
        <text x="150" y="148" font-size="13" font-weight="bold" fill="#2563eb" text-anchor="middle" opacity="0.88">未经许可 · 严禁对外翻印或商用</text>
      </svg>
    `),
  },
];
