import React, { useState } from 'react';
import {
  Cloud,
  Github,
  Database,
  HardDrive,
  Copy,
  CheckCircle2,
  Terminal,
  ExternalLink,
  ShieldCheck,
  FolderGit2
} from 'lucide-react';

export const CloudflareDeployGuideView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const wranglerConfig = `// wrangler.jsonc (Cloudflare Pages / Workers 绑定配置)
{
  "name": "nongxiaowa-fertilizer-system",
  "compatibility_date": "2024-09-23",
  "pages_build_output_dir": "dist",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "nongxiaowa_db",
      "database_id": "YOUR_D1_DATABASE_ID"
    }
  ],
  "r2_buckets": [
    {
      "binding": "R2_ASSETS",
      "bucket_name": "nongxiaowa-crop-images"
    }
  ]
}`;

  const githubActionWorkflow = `# .github/workflows/cloudflare-deploy.yml
name: Deploy to Cloudflare Pages
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Application
        run: npm run build
        env:
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=nongxiaowa-system`;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-gradient-to-r from-orange-950 via-slate-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded-full text-xs font-semibold mb-2">
            <Cloud className="w-3.5 h-3.5" />
            <span>GitHub + Cloudflare Pages / R2 / D1 自动部署指引</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            静态打包与自动化部署配置
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
            系统完全支持作为静态应用托管在 Cloudflare，并无缝对接 R2 高性能对象存储桶（存储海量病害高清图）与 D1 数据库。
          </p>
        </div>
      </div>

      {/* 3 Step Deployment Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <Github className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">1. 推送至 GitHub 仓库</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            将本项目代码推送到 GitHub，配置主分支触发 Cloudflare 自动拉取构建。
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center">
            <Cloud className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">2. Cloudflare Pages 托管</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            全球 CDN 秒级加载，构建命令为 <code className="bg-slate-100 px-1 font-mono">npm run build</code>，输出目录为 <code className="bg-slate-100 px-1 font-mono">dist</code>。
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">3. R2 存储桶与 D1 绑定</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            绑定 Cloudflare R2 用于海量作物大图直链存储，0 外网流出费用。
          </p>
        </div>
      </div>

      {/* Code Snippets */}
      <div className="space-y-4">
        {/* GitHub Actions workflow file */}
        <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-emerald-400 font-bold flex items-center gap-2">
              <FolderGit2 className="w-4 h-4" />
              <span>.github/workflows/cloudflare-deploy.yml (自动构建流水线)</span>
            </span>
            <button
              onClick={() => copyToClipboard(githubActionWorkflow, 'gh')}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'gh' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'gh' ? '已复制！' : '复制代码'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-3 bg-slate-950 rounded-xl">
            {githubActionWorkflow}
          </pre>
        </div>

        {/* Wrangler R2/D1 Config */}
        <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-orange-400 font-bold flex items-center gap-2">
              <Database className="w-4 h-4" />
              <span>wrangler.jsonc (R2 存储桶与 D1 数据库绑定文件)</span>
            </span>
            <button
              onClick={() => copyToClipboard(wranglerConfig, 'wrangler')}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'wrangler' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'wrangler' ? '已复制！' : '复制代码'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-3 bg-slate-950 rounded-xl">
            {wranglerConfig}
          </pre>
        </div>
      </div>
    </div>
  );
};
