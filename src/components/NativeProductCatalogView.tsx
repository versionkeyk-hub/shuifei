import React, { useEffect, useMemo, useState } from 'react';
import { Database, Edit3, Image as ImageIcon, Package, Search, ShieldCheck, Tags, Trash2 } from 'lucide-react';
import { AppUser } from '../types';
import { ImageLightboxModal } from './ImageLightboxModal';
import { DEFAULT_QUIZ_ANSWERS } from '../data/productQuizData';

type Specification = { id?: string; name?: string; capacity?: string; form?: string; payload?: Record<string, any>; package?: Record<string, any>; source?: string; editable?: boolean; native?: boolean };
type Product = Record<string, any> & { id: string; name: string; category?: string; specifications?: Specification[]; images?: string[] };

const FIELD_LABELS: Record<string, string> = { intro: '产品简介', description: '产品描述', advantages: '产品优势', ingredients: '主要成分', functions: '功能作用', usage: '使用方法', applicable_crops: '适用作物', applicable_stages: '适用阶段', application_methods: '施用部位', price_range: '价格参考', manufacturer: '生产厂家', seller: '销售商', origin: '原产地', registrations: '登记/执行信息', mix_profile: '混配特征', pesticide_compat: '产品混配规则', custom_fields: '自定义字段', fertilizer_registration: '肥料登记证号', execution_standard: '执行标准', effective_bacteria: '有效菌种', ph: 'pH（1:250倍稀释）', ph_diluted_250: 'pH（1:250倍稀释）', ph_after_fertilizer: '用户配肥后 pH', ph_label_range: '包装标注 pH 范围', ph_display_note: 'pH 展示说明', has_copper: '含铜', copper_level: '铜含量级别', has_calcium: '含钙', has_humic_acid: '含腐殖酸', has_amino_acid: '含氨基酸', has_microbe: '含微生物', has_phosphorus: '含磷', has_silicon: '含硅', is_alkaline: '呈碱性', is_acidic: '呈酸性', unit_name: '单包装单位', inner_pack_count: '一件数量', inner_pack_unit: '件内单位', case_price: '一件价格', unit_price: '单包装价格', coverage_per_package: '单包装覆盖面积', coverage_unit: '覆盖面积单位', dose_value: '推荐用量', dose_unit: '用量单位', price: '标准价格', price_tier: '价格层级', package_unit: '包装单位', formula: '配方', image: '规格图片' };
const BOOLEAN_KEYS = new Set(['has_copper', 'has_calcium', 'has_humic_acid', 'has_amino_acid', 'has_microbe', 'has_phosphorus', 'has_silicon', 'is_alkaline', 'is_acidic']);
function fieldLabel(key: string): string { return FIELD_LABELS[key] || key.replace(/_/g, ' '); }
function display(value: unknown, key = ''): string {
  if (value === null || value === undefined || value === '') return '';
  if (BOOLEAN_KEYS.has(key)) return value === true || value === 'true' ? '是' : '否';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map((item) => display(item, key)).filter(Boolean).join('、');
  return Object.entries(value as Record<string, unknown>).map(([childKey, item]) => fieldLabel(childKey) + '：' + display(item, childKey)).filter((line) => !line.endsWith('：')).join('\n');
}

function imageUrl(value: string): string {
  if (value.startsWith('http') || value.startsWith('/')) return value;
  return '/legacy-pesticide/' + value;
}

function specValue(specification: Specification, key: string): unknown {
  return specification.package?.[key] ?? specification.payload?.[key] ?? '';
}

function money(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? '¥' + number.toFixed(2).replace(/\.00$/, '') : '';
}

function specificationSummary(specification: Specification): string {
  const unit = String(specValue(specification, 'unit_name') || specValue(specification, 'inner_pack_unit') || '包装');
  const capacity = specification.capacity || specification.name || '';
  const count = specValue(specification, 'inner_pack_count');
  const casePrice = specValue(specification, 'case_price');
  const unitPrice = specValue(specification, 'unit_price') ?? specValue(specification, 'price');
  const countText = count ? String(count) + unit + '/件' : '';
  const pieces = [specification.form, capacity && unit ? capacity + '/' + unit : capacity, countText, money(unitPrice) && money(unitPrice) + '/' + unit, money(casePrice) && money(casePrice) + '/件'];
  return pieces.filter(Boolean).join('　');
}

const STRUCTURAL_PRODUCT_KEYS = new Set(['id', 'name', 'category', 'specifications', 'images', 'field_order', 'field_labels', 'mix_profile', 'pesticide_compat', 'custom_fields', 'intro', 'description', 'advantages', 'ingredients', 'functions', 'usage', 'applicable_crops', 'applicable_stages', 'application_methods', 'price_range', 'manufacturer', 'seller', 'origin', 'registrations']);

const QUIZ_TO_NATIVE: Record<string, string> = { am: 'aomai', dp: 'aosheng', sk1: 'shikeshou', sk2: 'shikeshou', sk3: 'shikeshou', bn1: 'beineng', bn2: 'beineng', bn3: 'beineng', bn4: 'beineng', js: 'junshi', zy: 'zhuoyan', at: 'aotu', aj: 'aojing', fs: 'fengshuo', hy: 'heiyan', ay: 'aoye', al: 'aolei', hd: 'huadaifu', gd: 'guodaifu', ls: 'aolan', lp: 'aoliang', ag: 'aoguo', amg: 'aomei', sa: 'shaianxin', jt: 'jiete', fh: 'fenghui' };
const STAGE_LABELS: Record<string, string> = { seedling: '苗期', growth: '生长期', flower: '花期/保花保果', expand: '膨果期', color: '着色增甜期', after: '采后恢复期' };
function quizAttributes(product: Product): { stages: string[]; methods: string[] } {
  const quizId = Object.keys(QUIZ_TO_NATIVE).find((key) => QUIZ_TO_NATIVE[key] === product.id);
  const answer = quizId ? DEFAULT_QUIZ_ANSWERS[quizId] : undefined;
  return { stages: (answer?.stage || []).map((stage) => STAGE_LABELS[stage] || stage), methods: (answer?.use || []).map((method) => method === 'foliar' ? '叶面' : method === 'root' ? '根际' : method) };
}

function mixProfileText(profile: unknown, technicalView: boolean): string {
  if (!profile || typeof profile !== 'object') return display(profile);
  const source = profile as Record<string, unknown>;
  const lines = technicalView
    ? [['pH（1:250倍稀释）', source.ph_diluted_250 || source.ph], ['用户配肥后 pH', source.ph_after_fertilizer], ['包装标注 pH', source.ph_label_range]].filter(([, value]) => value !== null && value !== undefined && value !== '').map(([label, value]) => label + '：' + String(value))
    : (source.ph_label_range || source.ph) ? ['pH：' + String(source.ph_label_range || source.ph)] : [];
  const rules: string[] = [];
  if (source.has_copper) rules.push('含铜制剂：不建议与强酸、强碱及其他铜制剂直接混配。');
  if (source.has_microbe) rules.push('含微生物：避免与杀菌剂、铜制剂同时使用，建议错开 3—5 天。');
  if (source.has_calcium && source.has_phosphorus) rules.push('同时含钙、磷：与磷酸盐类产品混配前应先做小试，避免沉淀。');
  if (source.is_alkaline) rules.push('产品偏碱性：避免与强酸性农药直接混配。');
  if (source.is_acidic) rules.push('产品偏酸性：避免与强碱性农药直接混配。');
  if (source.compatibility_note || source.mix_note) rules.push(String(source.compatibility_note || source.mix_note));
  return [...lines, ...rules].filter(Boolean).join('\n');
}

const Field: React.FC<{ label: string; value: unknown; keyName?: string; tone?: string }> = ({ label, value, keyName = '', tone = 'border-slate-200 bg-white' }) => {
  const text = display(value, keyName);
  if (!text) return null;
  return <div className={'rounded-2xl border p-4 ' + tone}><div className="text-base font-black tracking-wide text-slate-800">{label}</div><div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{text}</div></div>;
 };

export const NativeProductCatalogView: React.FC<{ currentUser?: AppUser | null }> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [category, setCategory] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const canEdit = ['super_admin', 'admin'].includes(currentUser?.role || '');
  const authHeaders = useMemo(() => {
    const token = sessionStorage.getItem('hmht_api_token') || '';
    return token ? { authorization: 'Bearer ' + token } : {};
  }, [currentUser?.id]);
  const loadProducts = () => {
    setLoading(true);
    fetch('/api/native/products?limit=200', { headers: authHeaders }).then((response) => response.json()).then((payload: { products?: Product[] }) => setProducts(payload.products || [])).finally(() => setLoading(false));
  };
  useEffect(() => { loadProducts(); }, [authHeaders]);
  const categories = useMemo(() => ['全部', ...Array.from(new Set(products.map((product) => product.category || '未分类'))).sort()], [products]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => (category === '全部' || (product.category || '未分类') === category) && (!needle || display(product).toLowerCase().includes(needle)));
  }, [products, query, category]);
  const selected = products.find((product) => product.id === selectedId) || filtered[0] || products[0];
  return <div className="mx-auto max-w-[1500px] space-y-5 p-4 md:p-8">
    <header className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-emerald-950 p-6 text-white shadow-lg md:p-8"><div className="flex items-center gap-2 text-xs font-bold text-emerald-200"><Database className="h-4 w-4" />产品主数据</div><h1 className="mt-3 text-2xl font-black md:text-3xl">产品信息库</h1><p className="mt-2 max-w-none text-sm leading-6 text-slate-300">按产品类别浏览卡片，进入后直接查看图片、简介、成分、登记、规格、用法、适用作物、混配特征、价格和自定义字段。该资料库是后续施肥方案的统一产品参数来源。</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">{products.length} 个产品</span><span className="rounded-full bg-white/10 px-3 py-1.5">{products.reduce((sum, product) => sum + (product.specifications || []).length, 0)} 个包装规格</span></div></header>
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{categories.map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={'rounded-full px-3 py-2 text-xs font-bold transition ' + (category === item ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-emerald-50')}>{item}</button>)}</div><label className="relative block lg:w-80"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索产品、成分、规格、厂家" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label></div></section>
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-xs text-slate-500"><span>{loading ? '正在加载…' : '当前分类 ' + filtered.length + ' 个产品'}</span><span>点击卡片查看</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{filtered.map((product) => <button type="button" key={product.id} onClick={() => setSelectedId(product.id)} className={'overflow-hidden rounded-2xl border text-left transition ' + (selected?.id === product.id ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-emerald-300')}><div className="flex gap-3 p-3"><div className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 bg-white p-1">{product.images?.[0] ? <img src={imageUrl(product.images[0])} alt={product.name} className="h-full w-full object-contain" /> : <Package className="m-4 h-8 w-8 text-slate-300" />}</div><div className="min-w-0"><div className="truncate font-black text-slate-900">{product.name}</div><div className="mt-1 truncate text-xs text-emerald-700">{product.category || '未分类'}</div><div className="mt-1 text-xs text-slate-500">{(product.specifications || []).length} 个规格</div></div></div></button>)}</div>{!loading && !filtered.length && <div className="p-8 text-center text-sm text-slate-500">没有匹配的产品。</div>}</section>
      <ProductDetail product={selected} canEdit={canEdit} technicalView={['super_admin', 'admin', 'staff', 'expert'].includes(currentUser?.role || '')} authHeaders={authHeaders} onSaved={(notice) => { setMessage(notice); loadProducts(); }} />
    </div>
    {message && <div className="fixed bottom-5 right-5 z-30 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg">{message}</div>}
  </div>;
};

const ProductDetail: React.FC<{ product?: Product; canEdit: boolean; technicalView: boolean; authHeaders: Record<string, string>; onSaved: (message: string) => void }> = ({ product, canEdit, technicalView, authHeaders, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [specDraft, setSpecDraft] = useState({ name: '', capacity: '', form: '', payload: {} as Record<string, unknown> });
  const [imageBusy, setImageBusy] = useState(false);
  if (!product) return <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">没有找到产品资料。</div>;
  const images = (product.images || []).map(imageUrl);
  const quiz = quizAttributes(product);
  const applicableStages = product.applicable_stages || quiz.stages;
  const applicationMethods = product.application_methods || quiz.methods;
  const saveProduct = async () => {
    try {
      const payload = JSON.parse(draft) as Record<string, unknown>;
      const response = await fetch('/api/admin/native/products/' + encodeURIComponent(product.id), { method: 'PATCH', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ payload }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || '产品保存失败');
      setEditing(false); onSaved('产品属性已保存。');
    } catch (error) { onSaved(error instanceof Error ? error.message : '产品保存失败'); }
  };
  const addSpecification = async () => {
    const response = await fetch('/api/admin/native/products/' + encodeURIComponent(product.id) + '/specs', { method: 'POST', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify(specDraft) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { onSaved(result.error || '规格新增失败'); return; }
    setSpecDraft({ name: '', capacity: '', form: '', payload: {} }); onSaved('规格已新增。');
  };
  const updateSpecification = async (specification: Specification) => {
    if (!specification.id || specification.source === 'product_skus') return;
    const response = await fetch('/api/admin/native/specs/' + encodeURIComponent(specification.id), { method: 'PATCH', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify(specification) });
    const result = await response.json() as { error?: string };
    onSaved(response.ok ? '规格已保存。' : result.error || '规格保存失败');
  };
  const saveImages = async (nextImages: string[]) => {
    const response = await fetch('/api/admin/native/products/' + encodeURIComponent(product.id), { method: 'PATCH', headers: { ...authHeaders, 'content-type': 'application/json' }, body: JSON.stringify({ payload: { images: nextImages } }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || '产品图片资料保存失败');
  };
  const uploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) { onSaved('请选择图片文件。'); return; }
    setImageBusy(true);
    try {
      const safeName = file.name.replace(/[^\w\-.\u4e00-\u9fff]/g, '_');
      const key = 'products/' + product.id + '/' + Date.now() + '-' + safeName;
      const response = await fetch('/api/admin/assets/' + encodeURIComponent(key), { method: 'PUT', headers: { ...authHeaders, 'content-type': file.type }, body: file });
      const payload = await response.json() as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || '图片上传失败');
      await saveImages([...(product.images || []), payload.url]);
      onSaved('产品图片已上传并关联。');
    } catch (error) { onSaved(error instanceof Error ? error.message : '图片上传失败'); } finally { setImageBusy(false); }
  };
  const removeImage = async (image: string) => {
    if (!window.confirm('确定从产品资料中移除这张图片吗？')) return;
    setImageBusy(true);
    try {
      if (image.startsWith('/api/assets/')) await fetch('/api/admin/assets/' + image.slice('/api/assets/'.length), { method: 'DELETE', headers: authHeaders });
      await saveImages((product.images || []).filter((item) => item !== image));
      onSaved('产品图片已移除。');
    } catch (error) { onSaved(error instanceof Error ? error.message : '图片移除失败'); } finally { setImageBusy(false); }
  };
  const handleImagePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const file = (Array.from(event.clipboardData.files) as File[])[0];
    if (file) { event.preventDefault(); void uploadImage(file); }
  };
  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void uploadImage(file);
  };
  const deleteSpecification = async (specification: Specification) => {
    if (!specification.id || !window.confirm('确定删除这个产品规格吗？')) return;
    const response = await fetch('/api/admin/native/specs/' + encodeURIComponent(specification.id), { method: 'DELETE', headers: authHeaders });
    const result = await response.json() as { error?: string };
    onSaved(response.ok ? '规格已删除。' : result.error || '规格删除失败');
  };
  const fieldDefinitions: Array<[string, string, unknown, string?]> = [['intro', '产品简介', product.intro], ['description', '产品描述', product.description], ['advantages', '产品优势', product.advantages, 'border-emerald-100 bg-emerald-50/40'], ['ingredients', '主要成分', product.ingredients, 'border-blue-100 bg-blue-50/40'], ['functions', '功能作用', product.functions], ['usage', '使用方法', product.usage], ['applicable_crops', '适用作物', product.applicable_crops], ['applicable_stages', '适用阶段', applicableStages], ['application_methods', '施用部位', applicationMethods], ['price_range', '价格参考', product.price_range, 'border-amber-100 bg-amber-50/40'], ['manufacturer', '生产厂家', product.manufacturer], ['seller', '销售商', product.seller], ['origin', '原产地', product.origin], ['registrations', '登记/执行信息', product.registrations, 'border-indigo-100 bg-indigo-50/40'], ['mix_profile', '混配特征', mixProfileText(product.mix_profile, technicalView), 'border-rose-100 bg-rose-50/40'], ['pesticide_compat', '产品混配规则', product.pesticide_compat], ['custom_fields', '自定义字段', product.custom_fields, 'border-purple-100 bg-purple-50/40'], ...Object.entries(product).filter(([key, value]) => !STRUCTURAL_PRODUCT_KEYS.has(key) && Boolean(display(value))).map(([key, value]) => [key, fieldLabel(key), value] as [string, string, unknown])];
  const fieldOrder = Array.isArray(product.field_order) ? product.field_order.map((item: unknown) => String(item)) : [];
  const fields = [...fieldDefinitions].sort(([left], [right]) => {
    const leftIndex = fieldOrder.indexOf(left);
    const rightIndex = fieldOrder.indexOf(right);
    return (leftIndex < 0 ? fieldDefinitions.length : leftIndex) - (rightIndex < 0 ? fieldDefinitions.length : rightIndex);
  });
  return <section className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex flex-col gap-5 lg:flex-row"><div className="lg:w-96"><div className="grid grid-cols-3 gap-2">{images.length ? images.slice(0, 9).map((image, index) => <div key={image} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1"><button type="button" onClick={() => setLightboxIndex(index)} className="h-full w-full hover:border-emerald-400"><img src={image} alt={product.name} className="h-full w-full object-contain" /></button>{canEdit && <button type="button" onClick={() => removeImage(product.images?.[index] || image)} disabled={imageBusy} className="absolute right-1 top-1 hidden rounded-lg bg-rose-600 px-1.5 py-1 text-[10px] font-bold text-white group-hover:block">删除</button>}</div>) : <div className="col-span-3 flex min-h-44 items-center justify-center rounded-2xl bg-slate-50 text-slate-400"><ImageIcon className="h-10 w-10" /></div>}</div>{canEdit && <div onPaste={handleImagePaste} onDragOver={(event) => event.preventDefault()} onDrop={handleImageDrop} className="mt-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 p-3 text-center text-xs text-indigo-700"><label className="cursor-pointer font-bold">{imageBusy ? '正在处理图片…' : '添加图片：选择文件、拖拽或粘贴'}<input type="file" accept="image/*" multiple className="hidden" onChange={(event) => { (Array.from(event.target.files || []) as File[]).forEach((file) => void uploadImage(file)); event.currentTarget.value = ''; }} /></label></div>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" />{product.category || '产品资料'}</div><h2 className="mt-2 text-3xl font-black text-slate-900">{product.name}</h2></div>{canEdit && <button type="button" onClick={() => { setDraft(JSON.stringify({ ...product, specifications: undefined, pesticide_compat: undefined }, null, 2)); setEditing(true); }} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"><Edit3 className="mr-1 inline h-3.5 w-3.5" />编辑属性</button>}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{display(product.intro || product.description)}</p><div className="mt-4 flex flex-wrap gap-2">{(product.specifications || []).map((specification) => <span key={specification.id || specification.name} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">{specification.name || specification.capacity}{specification.form ? ' · ' + specification.form : ''}</span>)}</div></div></div>{editing && <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><div className="mb-2 text-xs font-black text-indigo-800">JSON 属性编辑（保留原站字段）</div><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={18} className="w-full rounded-xl border border-indigo-200 bg-white p-3 font-mono text-xs leading-5 text-slate-800" /><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold">取消</button><button type="button" onClick={saveProduct} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">保存属性</button></div></div>}</div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-lg font-black text-slate-900"><Tags className="h-5 w-5 text-indigo-600" />包装规格与价格</div>{canEdit && <span className="text-xs font-bold text-indigo-600">管理员可新增、修改、删除</span>}</div>{!canEdit && <div className="mt-4 space-y-2">{(product.specifications || []).map((specification, index) => <div key={specification.id || index} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"><span className="mr-2 font-black text-indigo-700">规格 {index + 1}</span>{specificationSummary(specification)}</div>)}</div>}{canEdit && <><p className="mt-2 text-xs leading-5 text-slate-500">管理员在这里维护剂型、容量、单包装单位、每件数量、单包装价格、一件价格和覆盖面积。</p><div className="mt-4 grid gap-3 md:grid-cols-2">{(product.specifications || []).map((specification, index) => <div key={specification.id || index} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4"><div className="grid gap-2 md:grid-cols-3"><input defaultValue={specification.name || ''} onBlur={(event) => { specification.name = event.target.value; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2 text-sm font-bold" placeholder="规格名称" /><input defaultValue={specification.capacity || ''} onBlur={(event) => { specification.capacity = event.target.value; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2 text-sm" placeholder="容量" /><input defaultValue={specification.form || ''} onBlur={(event) => { specification.form = event.target.value; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2 text-sm" placeholder="剂型" /></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs"><input defaultValue={String(specValue(specification, 'unit_name'))} onBlur={(event) => { specification.payload = { ...(specification.payload || {}), unit_name: event.target.value }; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2" placeholder="单包装单位：瓶/袋/桶" /><input type="number" defaultValue={String(specValue(specification, 'inner_pack_count'))} onBlur={(event) => { specification.payload = { ...(specification.payload || {}), inner_pack_count: event.target.value ? Number(event.target.value) : null }; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2" placeholder="一件多少个" /><input defaultValue={String(specValue(specification, 'inner_pack_unit'))} onBlur={(event) => { specification.payload = { ...(specification.payload || {}), inner_pack_unit: event.target.value }; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2" placeholder="件内单位" /><input type="number" step="0.01" defaultValue={String(specValue(specification, 'unit_price') || specValue(specification, 'price'))} onBlur={(event) => { specification.payload = { ...(specification.payload || {}), unit_price: event.target.value ? Number(event.target.value) : null, price: event.target.value ? Number(event.target.value) : null }; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2" placeholder="单包装价格" /><input type="number" step="0.01" defaultValue={String(specValue(specification, 'case_price'))} onBlur={(event) => { specification.payload = { ...(specification.payload || {}), case_price: event.target.value ? Number(event.target.value) : null }; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2" placeholder="一件价格" /><input type="number" step="0.01" defaultValue={String(specValue(specification, 'coverage_per_package'))} onBlur={(event) => { specification.payload = { ...(specification.payload || {}), coverage_per_package: event.target.value ? Number(event.target.value) : null, coverage_unit: '亩' }; }} className="rounded-lg border border-indigo-100 bg-white px-2 py-2" placeholder="单包装覆盖面积" /></div><div className="mt-3 flex items-center justify-between gap-2"><pre className="whitespace-pre-wrap text-xs text-slate-500">{display(specification.payload)}</pre>{canEdit && <div className="flex shrink-0 gap-2"><button type="button" onClick={() => updateSpecification(specification)} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white">保存</button><button type="button" onClick={() => deleteSpecification(specification)} className="rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs font-bold text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button></div>}</div></div>)}</div><div className="mt-4 rounded-2xl border border-dashed border-indigo-200 p-4"><div className="text-xs font-black text-slate-700">新增规格</div><div className="mt-2 grid gap-2 md:grid-cols-4"><input value={specDraft.name} onChange={(event) => setSpecDraft((current) => ({ ...current, name: event.target.value }))} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="规格名称" /><input value={specDraft.capacity} onChange={(event) => setSpecDraft((current) => ({ ...current, capacity: event.target.value }))} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="容量" /><input value={specDraft.form} onChange={(event) => setSpecDraft((current) => ({ ...current, form: event.target.value }))} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="剂型" /><input value={String(specDraft.payload.unit_name || '')} onChange={(event) => setSpecDraft((current) => ({ ...current, payload: { ...current.payload, unit_name: event.target.value } }))} className="rounded-lg border border-slate-200 px-2 py-2 text-sm" placeholder="单位" /></div><button type="button" onClick={addSpecification} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">新增规格</button></div></>}</div>
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex items-center gap-2 text-lg font-black text-slate-900"><Package className="h-5 w-5 text-emerald-600" />产品资料</div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{fields.map(([key, label, value, tone]) => <Field key={key} label={product.field_labels?.[key] || label} keyName={key} value={value} tone={tone} />)}</div></div>
    {lightboxIndex !== null && <ImageLightboxModal images={images} initialIndex={lightboxIndex} title={product.name + ' 产品图片'} onClose={() => setLightboxIndex(null)} />}
  </section>;
};
