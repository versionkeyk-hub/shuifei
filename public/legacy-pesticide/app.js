// ============================================================
// 农药混配查询应用 - 核心逻辑
// ============================================================

// ---- 工具函数 ----

function normalize(str) {
  if (!str) return '';
  return String(str).toLowerCase()
    .replace(/[·・•\.\/\s、,，;；]/g, '')
    .replace(/[（(].*?[）)]/g, '');
}

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 模糊匹配：query 的每个字符是否按顺序出现在 text 中
function fuzzyContains(query, text) {
  var q = normalize(query);
  var t = normalize(text);
  if (!q || !t) return { match: false, positions: [] };
  if (t.indexOf(q) >= 0) {
    var start = t.indexOf(q);
    var positions = [];
    for (var i = 0; i < q.length; i++) positions.push(start + i);
    return { match: true, positions: positions, score: 100 - (t.length - q.length) };
  }
  var positions = [];
  var ti = 0;
  for (var qi = 0; qi < q.length; qi++) {
    var found = false;
    while (ti < t.length) {
      if (t.charAt(ti) === q.charAt(qi)) {
        positions.push(ti);
        ti++;
        found = true;
        break;
      }
      ti++;
    }
    if (!found) return { match: false, positions: [] };
  }
  var gaps = positions[positions.length - 1] - positions[0] + 1 - q.length;
  var score = Math.max(10, 60 - gaps * 3 - (t.length - q.length));
  return { match: true, positions: positions, score: score };
}

// 高亮文本中匹配 query 的部分（支持模糊匹配）
function highlightText(text, query) {
  if (!text || !query) return escapeHtml(text);
  var fc = fuzzyContains(query, text);
  if (!fc.match) return escapeHtml(text);
  var positions = fc.positions;
  var html = '';
  var last = 0;
  for (var i = 0; i < positions.length; i++) {
    var pos = positions[i];
    if (pos > last) html += escapeHtml(text.substring(last, pos));
    html += '<mark class="search-highlight">' + escapeHtml(text.charAt(pos)) + '</mark>';
    last = pos + 1;
  }
  if (last < text.length) html += escapeHtml(text.substring(last));
  return html;
}

// 解析 pH 字符串，返回平均值；解析失败返回 null
function parsePHString(str) {
  if (str === null || str === undefined || str === '') return null;
  var s = String(str);
  var nums = [];
  var re = /\d+\.?\d*/g;
  var m;
  while ((m = re.exec(s)) !== null) nums.push(parseFloat(m[0]));
  if (nums.length === 0) return null;
  if (nums.length === 1) return nums[0];
  var sum = 0;
  for (var i = 0; i < nums.length; i++) sum += nums[i];
  return sum / nums.length;
}

// pH 分类：只有强酸/强碱才触发酸碱禁忌
function classifyPH(ph) {
  if (ph === null || ph === undefined) return 'unknown';
  if (ph < 4.0) return 'strong_acid';
  if (ph < 6.5) return 'acidic';
  if (ph <= 7.5) return 'neutral';
  if (ph <= 10.0) return 'basic';
  return 'strong_base';
}

// 获取产品实际 pH（优先 mix_profile.ph）
function getProductPH(product) {
  var pp = product.mix_profile || {};
  if (pp.ph !== undefined && pp.ph !== null) return parsePHString(pp.ph);
  if (pp.is_strong_acid) return 2.0;
  if (pp.is_strong_base) return 12.0;
  if (pp.is_acidic) return 5.5;
  if (pp.is_alkaline) return 8.5;
  return null;
}

// 获取农药实际 pH（优先 pesticide_extras.js，其次 flags）
function getPesticidePH(pesticide) {
  var extra = getExtra(pesticide.component);
  if (extra && extra.ph) {
    var ph = parsePHString(extra.ph);
    if (ph !== null) return ph;
  }
  var flags = pesticide.flags || {};
  if (flags.is_strong_acid) return 2.0;
  if (flags.is_strong_base) return 11.0;
  if (flags.is_acidic) return 5.5;
  if (flags.is_basic) return 8.5;
  return null;
}

// ---- 搜索索引 ----
let searchIndex = [];

function buildSearchIndex() {
  searchIndex = [];
  PESTICIDES.forEach(function(p) {
    var terms = [];
    if (p.component) terms.push({ term: p.component, type: '成分名' });
    if (p.aliases) p.aliases.forEach(function(a) { terms.push({ term: a, type: '别名' }); });
    if (p.brands) p.brands.forEach(function(b) { terms.push({ term: b.name, type: '品牌', company: b.company }); });
    if (p.related) p.related.forEach(function(r) { terms.push({ term: r, type: '关联成分' }); });
    searchIndex.push({ pesticide: p, terms: terms });
  });
}

function search(query) {
  var q = query.trim();
  var qn = normalize(q);
  if (!q || qn.length < 1) return [];

  var results = [];
  searchIndex.forEach(function(entry) {
    var bestScore = 0;
    var bestTerm = '';
    var bestType = '';
    var bestMatchType = '';

    entry.terms.forEach(function(t) {
      var term = t.term;
      var tn = normalize(term);
      var type = t.type;
      var score = 0;
      var matchType = '';

      if (tn === qn) {
        score = type === '成分名' ? 1000 : type === '别名' ? 950 : type === '品牌' ? 900 : 850;
        matchType = 'exact';
      } else if (tn.indexOf(qn) === 0) {
        score = type === '成分名' ? 300 : type === '别名' ? 250 : type === '品牌' ? 200 : 180;
        score -= (tn.length - qn.length) * 5;
        matchType = 'start';
      } else if (tn.indexOf(qn) >= 0) {
        score = type === '成分名' ? 200 : type === '别名' ? 170 : type === '品牌' ? 140 : 120;
        score -= (tn.length - qn.length) * 2;
        matchType = 'contain';
      } else {
        var fc = fuzzyContains(q, term);
        if (fc.match) {
          score = type === '成分名' ? 80 + fc.score : type === '别名' ? 70 + fc.score : type === '品牌' ? 60 + fc.score : 50 + fc.score;
          matchType = 'fuzzy';
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestTerm = term;
        bestType = type;
        bestMatchType = matchType;
      }
    });

    if (bestScore > 0) {
      results.push({
        pesticide: entry.pesticide,
        score: bestScore,
        matchedTerm: bestTerm,
        matchedType: bestType,
        matchType: bestMatchType
      });
    }
  });

  results.sort(function(a, b) { return b.score - a.score; });
  return results;
}

// ---- 农药成分拆分与深层分析 ----

// 把复配农药拆成单剂成分
// pesticide 可以是对象或字符串；如果是对象，优先使用用户填写的 related 字段
function getPesticideComponents(pesticide) {
  if (!pesticide) return [];
  var p = (typeof pesticide === 'object') ? pesticide : null;
  var name = p ? p.component : pesticide;
  if (p && Array.isArray(p.related) && p.related.length > 0) {
    return p.related.map(function(s) { return String(s).trim(); }).filter(function(s) { return s.length > 0; });
  }
  if (!name) return [];
  var parts = String(name).split(/[·・•\.\/\s、]/).map(function(s) { return s.trim(); });
  return parts.filter(function(s) { return s.length > 0; });
}

// 单个成分的类型识别
function getSingleComponentFlags(name) {
  var n = name || '';
  var nl = n.toLowerCase();
  var flags = {
    is_copper: /铜|波尔多/.test(n),
    is_inorganic_copper: /波尔多|硫酸铜|氢氧化铜|氧化亚铜|王铜|氧氯化铜|碱式硫酸铜/.test(n) && !/有机铜|松脂酸铜|琥胶肥酸铜|喹菌铜|噻菌铜|腐植酸铜/.test(n),
    is_organic_copper: /松脂酸铜|琥胶肥酸铜|喹菌铜|噻菌铜|腐植酸铜/.test(n),
    is_dithiocarbamate: /代森/.test(n),
    is_sulfur: /石硫|硫磺|硫悬|胶体硫|可湿性硫/.test(n),
    is_thiram: /福美双|福美锌|福美砷/.test(n),
    is_benzimidazole: /多菌灵|甲基硫菌灵|甲基托布津|甲托/.test(n),
    is_chloroisobromine: /氯溴异氰尿酸/.test(n),
    is_fungicide: false,
    is_insecticide: false,
    is_acaricide: false,
    is_herbicide: false,
    is_strong_base: false,
    is_strong_acid: false,
    is_basic: false,
    is_acidic: false,
    no_alkali_mix: false,
    has_calcium: /钙/.test(n),
    has_phosphorus: /磷酸|磷酸盐|磷酸二氢|磷酸氢二/.test(n),
    has_humic_acid: /腐殖酸|黄腐酸|腐植酸/.test(n),
    has_heavy_metal: false
  };

  // 尝试在农药数据库中查找该单剂的 flags
  for (var i = 0; i < PESTICIDES.length; i++) {
    var p = PESTICIDES[i];
    if (p.component === n) {
      var pf = p.flags || {};
      flags.is_fungicide = !!pf.is_fungicide;
      flags.is_insecticide = !!pf.is_insecticide;
      flags.is_acaricide = !!pf.is_acaricide;
      flags.is_herbicide = !!pf.is_herbicide;
      flags.is_strong_base = !!pf.is_strong_base;
      flags.is_strong_acid = !!pf.is_strong_acid;
      flags.is_basic = !!pf.is_basic;
      flags.is_acidic = !!pf.is_acidic;
      flags.no_alkali_mix = !!pf.no_alkali_mix;
      flags.has_heavy_metal = !!pf.is_heavy_metal;
      flags.suggest_alone = !!pf.suggest_alone;
      break;
    }
  }

  // 也检查农药扩展信息中的 flags（云端可编辑，覆盖数据库中的值）
  var extra = PESTICIDE_EXTRAS[n];
  if (extra && extra.flags) {
    Object.keys(extra.flags).forEach(function(k) {
      flags[k] = !!extra.flags[k];
    });
  }

  return flags;
}

// 合并多个成分的 flags（任一成分具备即视为具备）
function combineFlags(flagList) {
  var combined = {};
  var keys = [
    'is_copper', 'is_inorganic_copper', 'is_organic_copper', 'is_dithiocarbamate',
    'is_sulfur', 'is_thiram', 'is_benzimidazole', 'is_chloroisobromine',
    'is_fungicide', 'is_insecticide', 'is_acaricide', 'is_herbicide',
    'is_strong_base', 'is_strong_acid', 'is_basic', 'is_acidic', 'no_alkali_mix',
    'has_calcium', 'has_phosphorus', 'has_humic_acid', 'has_heavy_metal', 'suggest_alone'
  ];
  keys.forEach(function(k) { combined[k] = false; });
  flagList.forEach(function(f) {
    keys.forEach(function(k) {
      if (f[k]) combined[k] = true;
    });
  });
  return combined;
}

// 农药混配特征（基于完整成分组成，不只是名字表面）
function getPesticideMixFlags(pesticide) {
  var components = getPesticideComponents(pesticide);
  if (components.length === 0) components = [pesticide.component];

  var componentFlags = components.map(getSingleComponentFlags);
  var flags = combineFlags(componentFlags);

  // 叠加农药本体 flags（数据库里可能有更准确的信息）
  var dbFlags = pesticide.flags || {};
  if (dbFlags.is_fungicide) flags.is_fungicide = true;
  if (dbFlags.is_insecticide) flags.is_insecticide = true;
  if (dbFlags.is_acaricide) flags.is_acaricide = true;
  if (dbFlags.is_herbicide) flags.is_herbicide = true;
  if (dbFlags.is_strong_base) flags.is_strong_base = true;
  if (dbFlags.is_strong_acid) flags.is_strong_acid = true;
  if (dbFlags.is_basic) flags.is_basic = true;
  if (dbFlags.is_acidic) flags.is_acidic = true;
  if (dbFlags.is_copper) flags.is_copper = true;
  if (dbFlags.is_heavy_metal) flags.has_heavy_metal = true;
  if (dbFlags.is_calcium) flags.has_calcium = true;
  if (dbFlags.is_phosphorus) flags.has_phosphorus = true;
  if (dbFlags.is_humic_acid) flags.has_humic_acid = true;
  if (dbFlags.no_alkali_mix) flags.no_alkali_mix = true;
  if (dbFlags.suggest_alone) flags.suggest_alone = true;

  return flags;
}

// ---- 混配规则引擎（基于真实成分与 pH 值） ----
function checkMixing(pesticide, product) {
  // ========== 第零层：手动混配关系表（优先于规则引擎） ==========
  // 后台手动指定的混配关系，优先级最高
  if (typeof COMPATIBILITY !== 'undefined' && COMPATIBILITY.length > 0) {
    var components = getPesticideComponents(pesticide);
    if (components.length === 0) components = [pesticide.component];
    var productId = product.id || product.name;
    for (var ci = 0; ci < components.length; ci++) {
      for (var di = 0; di < COMPATIBILITY.length; di++) {
        var entry = COMPATIBILITY[di];
        if (entry.pesticide_component === components[ci] && entry.product_id === productId) {
          if (entry.status === 'forbidden') {
            return { status: '禁混', reason: entry.reason || '后台手动标记为禁混', interval: '7天', level: 3 };
          }
          if (entry.status === 'caution') {
            return { status: '需谨慎', reason: entry.reason || '后台手动标记为谨慎混配', interval: null, level: 2 };
          }
          if (entry.status === 'mixable') {
            return { status: '可混', reason: entry.reason || '后台手动标记为可混', interval: null, level: 0 };
          }
        }
      }
    }
  }

  var pf = getPesticideMixFlags(pesticide);
  var pp = product.mix_profile || {};

  var productPH = getProductPH(product);
  var productPHClass = classifyPH(productPH);
  var displayProductPH = getDisplayPH(productPH);  // 显示给农户的pH（偏中性）
  var pesticidePH = getPesticidePH(pesticide);
  var pesticidePHClass = classifyPH(pesticidePH);

  // ========== 第一层：禁混（绝对不能混） ==========

  // 除草剂
  if (pf.is_herbicide) {
    return { status: '禁混', reason: '除草剂不建议与任何肥料混配，易出药害', interval: null, level: 3 };
  }

  // 重金属
  if (pf.has_heavy_metal) {
    return { status: '禁混', reason: '含重金属农药，不建议与任何肥料混用', interval: null, level: 3 };
  }

  // 微生物菌剂 + 杀菌剂/铜制剂
  if (pp.has_microbe && (pf.is_fungicide || pf.is_copper)) {
    return { status: '禁混', reason: '杀菌剂/铜制剂会杀死产品中的有益微生物，菌剂完全失效。需先用杀菌剂、间隔3-5天再用菌剂', interval: '3-5天', level: 3 };
  }

  // 氨基酸产品 + 铜制剂农药 → 络合反应
  if (pp.has_amino_acid && pf.is_copper) {
    return { status: '禁混', reason: '氨基酸与铜离子发生络合反应，铜制剂药效和氨基酸肥效双双降低', interval: '7天', level: 3 };
  }

  // 腐殖酸/黄腐酸产品 + 铜制剂农药 → 络合沉淀
  if (pp.has_humic_acid && pf.is_copper) {
    return { status: '禁混', reason: '腐殖酸/黄腐酸与铜离子络合，导致铜制剂失效并产生沉淀', interval: '7天', level: 3 };
  }

  // 含铜量较高的产品 + 铜制剂农药 → 铜过量
  if (pp.has_copper && pp.copper_level !== 'trace' && pf.is_copper) {
    return { status: '禁混', reason: '产品含铜，与铜制剂农药混配会导致铜离子过量，易产生药害', interval: '7天', level: 3 };
  }

  // 氯溴异氰尿酸 + 氨基酸/腐殖酸/含磷产品
  if (pf.is_chloroisobromine && (pp.has_amino_acid || pp.has_humic_acid || pp.has_phosphorus)) {
    return { status: '禁混', reason: '氯溴异氰尿酸与氨基酸/腐殖酸/磷酸盐产生沉淀、失效', interval: '7天', level: 3 };
  }

  // suggest_alone 标记的农药 + 其他所有产品 → 建议单用（通用规则）
  if (pf.suggest_alone) {
    return { status: '建议单用', reason: '该农药氧化性强或性质特殊，与其他肥料混配易降低效果，建议单独使用', interval: '3-5天', level: 2 };
  }

  // 强碱性农药 + 氨基酸产品
  if (pf.is_strong_base && pp.has_amino_acid) {
    return { status: '禁混', reason: '强碱性农药会使氨基酸分解失效', interval: '7天', level: 3 };
  }

  // 强碱性农药 + 腐殖酸产品
  if (pf.is_strong_base && pp.has_humic_acid) {
    return { status: '禁混', reason: '强碱性条件下腐殖酸/黄腐酸结构被破坏，降低效果', interval: '7天', level: 3 };
  }

  // ========== 第二层：需谨慎 / 需间隔 ==========

  // 含铜产品 + 代森类（铜在矿物/微量元素中，非铜制剂，因此谨慎而非禁混）
  if (pp.has_copper && pf.is_dithiocarbamate) {
    return { status: '需谨慎', reason: '产品含铜，与代森类农药混配可能降低药效，建议先做小面积试验', interval: null, level: 2 };
  }

  // 含铜产品 + 硫制剂
  if (pp.has_copper && pf.is_sulfur) {
    return { status: '需谨慎', reason: '产品含铜，与硫制剂混配可能产生化学反应，建议先做小面积试验', interval: null, level: 2 };
  }

  // 含铜产品 + 福美双
  if (pp.has_copper && pf.is_thiram) {
    return { status: '需谨慎', reason: '产品含铜，与福美双系列混配可能降低药效，建议先做试验', interval: null, level: 2 };
  }

  // 含微量铜的产品 + 铜制剂农药
  if (pp.has_copper && pp.copper_level === 'trace' && pf.is_copper) {
    return { status: '需谨慎', reason: '产品含微量铜，与铜制剂叠加可能增加铜离子浓度，建议谨慎使用', interval: null, level: 2 };
  }

  // 含铜产品 + 多菌灵/甲基硫菌灵
  if (pp.has_copper && pf.is_benzimidazole) {
    return { status: '需谨慎', reason: '铜与多菌灵/甲基硫菌灵混配可能产生沉淀，建议先做试验', interval: null, level: 2 };
  }

  // 不含铜的产品 + 无机铜制剂（用户：一般不建议和铜制剂混配，尤其是无机铜）
  if (!pp.has_copper && pf.is_inorganic_copper) {
    return { status: '需谨慎', reason: '无机铜制剂杀菌性强，一般不建议与肥料混配，以免影响肥效。如确需混配，先做小面积试验', interval: null, level: 2 };
  }

  // 不含铜的产品 + 有机铜制剂
  if (!pp.has_copper && pf.is_organic_copper) {
    return { status: '需谨慎', reason: '有机铜制剂混配性较好，但仍建议先做小面积试验', interval: null, level: 2 };
  }

  // 含钙产品 + 农药含磷酸根
  if (pp.has_calcium && pf.has_phosphorus) {
    return { status: '需间隔', reason: '磷酸根与钙离子反应生成磷酸钙沉淀，磷和钙同时失效', interval: '2-3天', level: 2 };
  }

  // 含磷产品 + 农药含钙
  if (pp.has_phosphorus && pf.has_calcium) {
    return { status: '需间隔', reason: '磷酸根与钙离子反应生成磷酸钙沉淀，磷和钙同时失效', interval: '2-3天', level: 2 };
  }

  // 含腐殖酸产品 + 农药含钙
  if (pp.has_humic_acid && pf.has_calcium) {
    return { status: '需间隔', reason: '腐殖酸与钙离子反应产生絮凝沉淀', interval: '2-3天', level: 2 };
  }

  // 含钙产品 + 农药含腐殖酸
  if (pp.has_calcium && pf.has_humic_acid) {
    return { status: '需间隔', reason: '钙离子与腐殖酸反应产生絮凝沉淀', interval: '2-3天', level: 2 };
  }

  // 强酸/强碱农药 + 任何产品：用户要求只和强酸强碱不要混配
  if (pf.is_strong_base) {
    return { status: '需间隔', reason: '强碱性农药性质活泼，建议与肥料间隔使用', interval: '7天', level: 2 };
  }
  if (pf.is_strong_acid) {
    return { status: '需间隔', reason: '强酸性农药性质活泼，建议与肥料间隔使用', interval: '7天', level: 2 };
  }

  // 产品本身是强酸/强碱 + 农药为碱性/酸性时：酸碱冲突
  if (productPHClass === 'strong_acid' && (pesticidePHClass === 'basic' || pesticidePHClass === 'strong_base')) {
    return { status: '需间隔', reason: '产品为强酸性（pH ' + displayProductPH + '），与碱性农药混配会酸碱中和，影响效果', interval: '3-7天', level: 2 };
  }
  if (productPHClass === 'strong_base' && (pesticidePHClass === 'acidic' || pesticidePHClass === 'strong_acid')) {
    return { status: '需间隔', reason: '产品为强碱性（pH ' + displayProductPH + '），与酸性农药混配会酸碱中和，影响效果', interval: '3-7天', level: 2 };
  }

  // 农药标明"不能与碱性物质混用" + 产品偏碱性
  if (pf.no_alkali_mix && productPH !== null && productPH > 7.5) {
    return { status: '需间隔', reason: '该农药明确标注不能与碱性物质混用（遇碱逐渐分解失效），产品pH ' + displayProductPH + '偏碱性', interval: '3-7天', level: 2 };
  }

  // ========== 第三层：可混 ==========
  return { status: '可混', reason: '成分间无已知拮抗反应，可正常混配使用。建议先小范围试用', interval: null, level: 0 };
}

// ---- 渲染 ----
var CATEGORY_COLORS = {
  '杀菌剂': '#1565C0',
  '杀虫剂': '#6A1B9A',
  '调节剂': '#00838F',
  '除草剂': '#BF360C',
  '助剂': '#5D4037',
  '肥料': '#558B2F',
  '杀螨剂': '#E65100',
  '杀线虫剂': '#5D4037',
  '杀鼠剂': '#424242',
  '卫生杀虫剂': '#6A1B9A',
  '杀软体动物剂': '#5D4037'
};

var STATUS_STYLES = {
  '禁混': { bg: '#FFEBEE', border: '#C62828', text: '#C62828', dot: '#C62828' },
  '需谨慎': { bg: '#FFF8E1', border: '#F9A825', text: '#F57F17', dot: '#F9A825' },
  '需间隔': { bg: '#FFF3E0', border: '#E65100', text: '#E65100', dot: '#FB8C00' },
  '建议单用': { bg: '#FFF3E0', border: '#E65100', text: '#E65100', dot: '#FB8C00' },
  '可混但无必要': { bg: '#F5F5F5', border: '#9E9E9E', text: '#757575', dot: '#BDBDBD' },
  '可混': { bg: '#E8F5E9', border: '#2E7D32', text: '#2E7D32', dot: '#2E7D32' }
};

// 搜一搜：在新标签页搜索（Bing）
function searchOnline(name) {
  window.open('https://www.bing.com/search?q=' + encodeURIComponent(name), '_blank');
}

// 清空搜索框
function clearSearch() {
  var input = document.getElementById('searchInput');
  input.value = '';
  document.getElementById('results').innerHTML = '';
  document.getElementById('welcome').style.display = 'block';
  document.getElementById('searchClear').classList.remove('visible');
  input.focus();
}

// 获取农药扩展信息（pH、禁忌）
function getExtra(componentName) {
  if (typeof getPesticideExtra === 'function') {
    return getPesticideExtra(componentName);
  }
  return null;
}

// 渲染禁忌信息（支持换行）
function renderContraindications(text) {
  if (!text) return '<span class="info-value info-empty">暂无数据，可在后台补充</span>';
  var lines = text.split('\n');
  var html = '<div class="info-value contra-list">';
  lines.forEach(function(line) {
    if (line.trim()) {
      if (line.indexOf('【作物限制】') >= 0) {
        html += '<div class="contra-line contra-crop">' + escapeHtml(line) + '</div>';
      } else if (line.indexOf('【混配限制】') >= 0) {
        html += '<div class="contra-line contra-mix">' + escapeHtml(line) + '</div>';
      } else {
        html += '<div class="contra-line">' + escapeHtml(line) + '</div>';
      }
    }
  });
  html += '</div>';
  return html;
}

function renderPesticideCard(p) {
  var catColor = CATEGORY_COLORS[p.category] || '#666';
  var extra = getExtra(p.component);
  var phRaw = (extra && extra.ph) ? parsePHString(extra.ph) : null;
  var phValue = getDisplayPH(phRaw);
  var contraText = (extra && extra.contraindications) ? extra.contraindications : null;

  var brandsHtml = '';
  if (p.brands && p.brands.length > 0) {
    brandsHtml = '<div class="info-row"><span class="info-label">品牌商品</span><div class="info-value">';
    p.brands.forEach(function(b) {
      brandsHtml += '<span class="brand-tag">' + escapeHtml(b.name) + ' <em>' + escapeHtml(b.company) + '</em></span>';
    });
    brandsHtml += '</div></div>';
  }

  // 显示各单剂成分（复配农药）
  var components = getPesticideComponents(p);
  var componentsHtml = '';
  if (components.length > 1) {
    componentsHtml = '<div class="info-row"><span class="info-label">有效成分</span><div class="info-value">';
    componentsHtml += components.map(function(c) {
      return '<span class="component-tag">' + escapeHtml(c) + '</span>';
    }).join('');
    componentsHtml += '</div></div>';
  }

  // 关联成分：如果与有效成分完全相同则不重复显示
  var relatedHtml = '';
  if (p.related && p.related.length > 0) {
    var relatedSet = p.related.map(function(r) { return String(r).trim(); }).sort().join(',');
    var componentSet = components.slice().sort().join(',');
    if (relatedSet !== componentSet) {
      relatedHtml = '<div class="info-row"><span class="info-label">关联成分</span><div class="info-value">';
      p.related.forEach(function(r) { relatedHtml += '<span class="related-tag">' + escapeHtml(r) + '</span>'; });
      relatedHtml += '</div></div>';
    }
  }

  var aliasesHtml = '';
  if (p.aliases && p.aliases.length > 0) {
    aliasesHtml = p.aliases.map(function(a) { return '<span class="alias-tag">' + escapeHtml(a) + '</span>'; }).join('');
  }

  return '' +
    '<div class="pesticide-card">' +
      '<div class="card-header" style="border-left-color:' + catColor + '">' +
        '<div class="card-title">' +
          '<div class="title-row">' +
            '<h2>' + escapeHtml(p.component) + '</h2>' +
            '<button class="btn-search-online" onclick="searchOnline(\'' + escapeHtml(p.component).replace(/'/g, "\\'") + '\')" title="在新标签页搜索此农药">搜一搜</button>' +
          '</div>' +
          '<div class="alias-list">' + aliasesHtml + '</div>' +
        '</div>' +
        '<span class="category-badge" style="background:' + catColor + '">' + escapeHtml(p.category) + '</span>' +
      '</div>' +
      '<div class="card-body">' +
        (p.chemical_class ? '<div class="info-row info-row-highlight"><span class="info-label">化学类别</span><span class="info-value">' + escapeHtml(p.chemical_class) + '</span></div>' : '') +
        componentsHtml +
        (phValue ? '<div class="info-row info-row-highlight"><span class="info-label">pH值</span><span class="info-value">' + escapeHtml(phValue) + '</span></div>' : '<div class="info-row"><span class="info-label">pH值</span><span class="info-value info-empty">暂无数据，可在后台补充</span></div>') +
        '<div class="info-row"><span class="info-label">解决问题</span><span class="info-value">' + escapeHtml(p.problems) + '</span></div>' +
        '<div class="info-row"><span class="info-label">常见用法</span><span class="info-value">' + escapeHtml(p.usage || '—') + '</span></div>' +
        '<div class="info-row"><span class="info-label">注意事项</span><span class="info-value">' + escapeHtml(p.precautions || '—') + '</span></div>' +
        '<div class="info-row info-row-contra"><span class="info-label">使用禁忌</span>' + renderContraindications(contraText) + '</div>' +
        brandsHtml + relatedHtml +
      '</div>' +
    '</div>';
}

function renderMixingResults(p) {
  var results = COMPANY_PRODUCTS.map(function(product) {
    return { product: product, result: checkMixing(p, product) };
  });

  results.sort(function(a, b) { return b.result.level - a.result.level; });

  var html = '<div class="mixing-section"><h3>与公司产品的混配结果</h3>';
  html += '<div class="mixing-summary"><div class="summary-badges">';

  var counts = {};
  results.forEach(function(r) { counts[r.result.status] = (counts[r.result.status] || 0) + 1; });

  if (counts['禁混']) html += '<span class="summary-badge ban">' + counts['禁混'] + '个禁混</span>';
  if (counts['需谨慎']) html += '<span class="summary-badge caution">' + counts['需谨慎'] + '个需谨慎</span>';
  if (counts['需间隔']) html += '<span class="summary-badge interval">' + counts['需间隔'] + '个需间隔</span>';
  if (counts['可混但无必要']) html += '<span class="summary-badge optional">' + counts['可混但无必要'] + '个无必要</span>';
  html += '<span class="summary-badge ok">' + (counts['可混'] || 0) + '个可混</span>';
  html += '</div></div>';

  html += '<div class="mixing-list">';
  results.forEach(function(r) {
    var s = STATUS_STYLES[r.result.status] || STATUS_STYLES['可混'];
    var productPH = getDisplayPH(getProductPH(r.product));
    var phText = productPH !== null ? ' <span class="mixing-ph">pH ' + productPH + '</span>' : '';
    html +=
      '<div class="mixing-item" style="border-left:4px solid ' + s.border + '">' +
        '<div class="mixing-product">' +
          '<div class="mixing-name-row">' +
            '<span class="mixing-name">' + escapeHtml(r.product.name) + phText + '</span>' +
            '<button class="btn-product-detail" onclick="showProductDetail(\'' + r.product.id + '\')" title="查看产品详情">产品属性</button>' +
          '</div>' +
          '<span class="mixing-cat">' + escapeHtml(r.product.category) + '</span>' +
        '</div>' +
        '<div class="mixing-status" style="color:' + s.text + ';background:' + s.bg + '">' +
          '<span class="status-dot" style="background:' + s.dot + '"></span>' +
          escapeHtml(r.result.status) +
          (r.result.interval ? '<span class="interval-text">（隔' + escapeHtml(r.result.interval) + '）</span>' : '') +
        '</div>' +
        '<div class="mixing-reason">' + escapeHtml(r.result.reason) + '</div>' +
      '</div>';
  });
  html += '</div></div>';

  return html;
}

// 产品详情弹窗
function showProductDetail(productId) {
  var product = null;
  for (var i = 0; i < COMPANY_PRODUCTS.length; i++) {
    if (COMPANY_PRODUCTS[i].id === productId) { product = COMPANY_PRODUCTS[i]; break; }
  }
  if (!product) return;

  var modal = document.getElementById('productModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'productModal';
    modal.className = 'product-modal-overlay';
    modal.onclick = function(e) {
      if (e.target === modal) modal.style.display = 'none';
    };
    document.body.appendChild(modal);
  }

  var pp = product.mix_profile || {};
  var realPH = getProductPH(product);
  var displayPH = getDisplayPH(realPH);
  var phText = displayPH !== null ? '（pH ' + displayPH + '，1:250）' : '';
  var reg = product.registrations || {};
  var specs = product.specifications || [];
  var images = product.images || [];
  var compat = product.pesticide_compat || [];
  var customFields = product.custom_fields || [];

  // 图片画廊
  var galleryHtml = '';
  if (images.length > 0) {
    galleryHtml = '<div class="pm-gallery" id="pmGallery">' +
      '<img src="' + escapeHtml(images[0]) + '" class="pm-main-image" id="pmMainImage" alt="' + escapeHtml(product.name) + '" onclick="openImageLightbox(' + JSON.stringify(images) + ',0)" style="cursor:zoom-in;" onerror="loadProductImageFromStore(this, \'' + escapeHtml(images[0]) + '\')">';
    if (images.length > 1) {
      galleryHtml += '<div class="pm-thumbs">';
      images.forEach(function(img, idx) {
        galleryHtml += '<img src="' + escapeHtml(img) + '" class="pm-thumb' + (idx === 0 ? ' active' : '') + '" onclick="switchProductImage(this)" alt="" onerror="loadProductImageFromStore(this, \'' + escapeHtml(img) + '\')">';
      });
      galleryHtml += '</div>';
    }
    galleryHtml += '</div>';
  }

  // 登记信息（不含原产地，原产地单独显示）
  var regParts = [];
  if (reg.fertilizer_registration) regParts.push('<span class="pm-reg-item">登记证：' + escapeHtml(reg.fertilizer_registration) + '</span>');
  if (reg.record_number) regParts.push('<span class="pm-reg-item">备案号：' + escapeHtml(reg.record_number) + '</span>');
  if (reg.execution_standard) regParts.push('<span class="pm-reg-item">执行标准：' + escapeHtml(reg.execution_standard) + '</span>');
  if (reg.import_contract) regParts.push('<span class="pm-reg-item">进口合同：' + escapeHtml(reg.import_contract) + '</span>');
  if (reg.customs_declaration) regParts.push('<span class="pm-reg-item">报关单：' + escapeHtml(reg.customs_declaration) + '</span>');
  if (reg.product_grade) regParts.push('<span class="pm-reg-item">产品等级：' + escapeHtml(reg.product_grade) + '</span>');
  if (reg.effective_bacteria) regParts.push('<span class="pm-reg-item">有效菌种：' + escapeHtml(reg.effective_bacteria) + '</span>');
  if (reg.certification) regParts.push('<span class="pm-reg-item">认证：' + escapeHtml(reg.certification) + '</span>');

  // 规格列表
  var specsHtml = '';
  if (specs.length > 0) {
    specsHtml = '<div class="pm-specs"><span class="pm-specs-label">包装规格</span>' +
      specs.map(function(s) {
        var tags = [escapeHtml(s.name)];
        if (s.form) tags.push(escapeHtml(s.form));
        if (s.formula) tags.push(escapeHtml(s.formula));
        return '<span class="pm-spec-tag">' + tags.join(' / ') + '</span>';
      }).join('') + '</div>';
  }

  // 混配性信息
  var compatHtml = '';
  if (compat.length > 0) {
    compatHtml = compat.map(function(c) {
      var statusColor = c.status === 'forbidden' ? '#e74c3c' : (c.status === 'caution' ? '#f39c12' : '#27ae60');
      var statusText = c.status === 'forbidden' ? '禁混' : (c.status === 'caution' ? '慎混' : '可混');
      return '<div class="pm-compat-item" style="border-left:3px solid ' + statusColor + ';">' +
        '<span class="pm-compat-name">' + escapeHtml(c.pesticide) + '</span>' +
        '<span class="pm-compat-status" style="color:' + statusColor + ';">' + statusText + '</span>' +
        (c.reason ? '<span class="pm-compat-reason">' + escapeHtml(c.reason) + '</span>' : '') +
        '</div>';
    }).join('');
  }

  // 构建所有字段（可拖拽排序）
  var allFields = [];
  if (product.intro) allFields.push({ key: 'intro', label: '简介', value: product.intro });
  if (product.advantages) allFields.push({ key: 'advantages', label: '产品优势', value: product.advantages });
  if (product.manufacturer) allFields.push({ key: 'manufacturer', label: '生产厂家', value: product.manufacturer });
  if (product.seller) allFields.push({ key: 'seller', label: '销售商', value: product.seller });
  if (product.origin) allFields.push({ key: 'origin', label: '原产地', value: product.origin });
  if (regParts.length > 0) allFields.push({ key: 'registrations', label: '登记信息', html: '<span class="pm-value pm-reg-value">' + regParts.join('') + '</span>', isHtml: true });
  if (specs.length > 0) allFields.push({ key: 'specs', label: '包装规格', html: specsHtml, isHtml: true });
  allFields.push({ key: 'category', label: '产品类别', value: product.category });
  if (product.ingredients) allFields.push({ key: 'ingredients', label: '成分信息', value: getDisplayIngredients(product.ingredients) });
  if (product.functions) allFields.push({ key: 'functions', label: '功能', value: product.functions });
  allFields.push({ key: 'usage', label: '使用方式', value: product.usage || '—' });
  if (product.applicable_crops) allFields.push({ key: 'applicable_crops', label: '适用作物', value: product.applicable_crops });
  allFields.push({ key: 'mix_profile', label: '混配特征', value: buildMixProfileText(pp) + phText });
  if (compat.length > 0) allFields.push({ key: 'pesticide_compat', label: '混配性', html: compatHtml, isHtml: true });

  // 混配联动：从 COMPATIBILITY 表显示禁混/谨慎成分
  if (typeof COMPATIBILITY !== 'undefined' && COMPATIBILITY.length > 0) {
    var prodId = product.id || product.name;
    var compatForb = [];
    var compatCau = [];
    COMPATIBILITY.forEach(function(c) {
      if (c.product_id === prodId) {
        if (c.status === 'forbidden') compatForb.push(c);
        else if (c.status === 'caution') compatCau.push(c);
      }
    });
    if (compatForb.length > 0) {
      var forbHtml = compatForb.map(function(c) {
        return '<div class="pm-compat-item" style="border-left:3px solid #C62828;">' +
          '<span class="pm-compat-name">' + escapeHtml(c.pesticide_component) + '</span>' +
          '<span class="pm-compat-status" style="color:#C62828;">禁混</span>' +
          (c.reason ? '<span class="pm-compat-reason">' + escapeHtml(c.reason) + '</span>' : '') +
          '</div>';
      }).join('');
      allFields.push({ key: 'compat_forbidden', label: '禁混成分', html: forbHtml, isHtml: true });
    }
    if (compatCau.length > 0) {
      var cauHtml = compatCau.map(function(c) {
        return '<div class="pm-compat-item" style="border-left:3px solid #F9A825;">' +
          '<span class="pm-compat-name">' + escapeHtml(c.pesticide_component) + '</span>' +
          '<span class="pm-compat-status" style="color:#F57F17;">需谨慎</span>' +
          (c.reason ? '<span class="pm-compat-reason">' + escapeHtml(c.reason) + '</span>' : '') +
          '</div>';
      }).join('');
      allFields.push({ key: 'compat_caution', label: '谨慎混配成分', html: cauHtml, isHtml: true });
    }
  }

  if (product.price_range) allFields.push({ key: 'price_range', label: '价格区间', value: product.price_range });
  customFields.forEach(function(cf) {
    if (cf.label && cf.value) allFields.push({ key: 'custom_' + cf.label, label: cf.label, value: cf.value });
  });

  // 读取自定义排序
  var fieldOrder = null;
  try {
    var saved = localStorage.getItem('pm_field_order_' + product.id);
    if (saved) fieldOrder = JSON.parse(saved);
  } catch(e) {}
  if (fieldOrder) {
    allFields.sort(function(a, b) {
      var ia = fieldOrder.indexOf(a.key);
      var ib = fieldOrder.indexOf(b.key);
      if (ia === -1) ia = 999;
      if (ib === -1) ib = 999;
      return ia - ib;
    });
  }

  // 构建字段HTML
  var fieldsHtml = allFields.map(function(f) {
    var content = f.isHtml ? f.html : escapeHtml(f.value);
    return '<div class="pm-row pm-draggable" data-key="' + escapeHtml(f.key) + '" draggable="true" ' +
      'ondragstart="pmDragStart(event)" ondragend="pmDragEnd(event)" ondragover="pmDragOver(event)" ondragleave="pmDragLeave(event)" ondrop="pmDrop(event, \'' + escapeHtml(product.id) + '\')">' +
      '<span class="pm-drag-handle" title="拖拽排序">⠿</span>' +
      '<span class="pm-label">' + escapeHtml(f.label) + '</span>' +
      '<span class="pm-value">' + content + '</span>' +
      '</div>';
  }).join('');

  var html = '<div class="product-modal-content">' +
    '<div class="product-modal-header">' +
      '<h3>' + escapeHtml(product.name) + '</h3>' +
      '<button class="modal-close-btn" onclick="document.getElementById(\'productModal\').style.display=\'none\'">&times;</button>' +
    '</div>' +
    '<div class="product-modal-body">' +
      galleryHtml +
      '<div class="pm-image-notice">⚠ 请注意产品信息可能不是最新版！</div>' +
      fieldsHtml +
    '</div>' +
  '</div>';

  modal.innerHTML = html;
  modal.style.display = 'flex';
}

// 拖拽排序相关
var pmDraggedKey = null;

function pmDragStart(e) {
  pmDraggedKey = e.currentTarget.dataset.key;
  e.currentTarget.style.opacity = '0.4';
}

function pmDragEnd(e) {
  e.currentTarget.style.opacity = '';
  document.querySelectorAll('.pm-draggable').forEach(function(r) {
    r.style.borderTop = '';
    r.style.opacity = '';
  });
}

function pmDragOver(e) {
  e.preventDefault();
  if (e.currentTarget.dataset.key !== pmDraggedKey) {
    e.currentTarget.style.borderTop = '2px solid #8B4513';
  }
}

function pmDragLeave(e) {
  e.currentTarget.style.borderTop = '';
}

function pmDrop(e, productId) {
  e.preventDefault();
  e.currentTarget.style.borderTop = '';
  var targetKey = e.currentTarget.dataset.key;
  if (pmDraggedKey === targetKey || !pmDraggedKey) return;

  var rows = document.querySelectorAll('.pm-draggable');
  var keys = [];
  rows.forEach(function(r) { keys.push(r.dataset.key); });

  var fromIdx = keys.indexOf(pmDraggedKey);
  var toIdx = keys.indexOf(targetKey);
  if (fromIdx === -1 || toIdx === -1) return;

  keys.splice(fromIdx, 1);
  keys.splice(toIdx, 0, pmDraggedKey);

  try {
    localStorage.setItem('pm_field_order_' + productId, JSON.stringify(keys));
  } catch(e) {}

  showProductDetail(productId);
}

function switchProductImage(thumb) {
  var main = document.getElementById('pmMainImage');
  if (main) {
    main.src = thumb.src;
    main.onclick = function() { openImageLightbox([thumb.src], 0); };
  }
  var thumbs = document.querySelectorAll('.pm-thumb');
  thumbs.forEach(function(t) { t.classList.remove('active'); });
  thumb.classList.add('active');
}

// 从 IndexedDB 加载产品图片（后台上传的图片存在这里）
function loadProductImageFromStore(img, path) {
  if (!path || typeof localforage === 'undefined') return;
  var store = localforage.createInstance({ name: 'PesticideQuery', storeName: 'product_images' });
  store.getItem(path).then(function(dataUri) {
    if (dataUri) {
      img.src = dataUri;
      img.style.opacity = '1';
    } else {
      img.style.opacity = '0.2';
    }
  }).catch(function() {
    img.style.opacity = '0.2';
  });
}

// 图片灯箱：点击查看大图
function openImageLightbox(images, startIdx) {
  var existing = document.getElementById('imageLightbox');
  if (existing) existing.remove();

  var currentIdx = startIdx || 0;
  var lightbox = document.createElement('div');
  lightbox.id = 'imageLightbox';
  lightbox.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';

  var img = document.createElement('img');
  img.src = images[currentIdx];
  img.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain;border-radius:4px;box-shadow:0 4px 30px rgba(0,0,0,0.5);';
  lightbox.appendChild(img);

  if (images.length > 1) {
    var counter = document.createElement('div');
    counter.style.cssText = 'position:absolute;top:20px;left:50%;transform:translateX(-50%);color:#fff;font-size:14px;background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:12px;';
    counter.textContent = (currentIdx + 1) + ' / ' + images.length;
    lightbox.appendChild(counter);

    var prevBtn = document.createElement('div');
    prevBtn.innerHTML = '&#10094;';
    prevBtn.style.cssText = 'position:absolute;left:20px;top:50%;transform:translateY(-50%);color:#fff;font-size:36px;cursor:pointer;user-select:none;opacity:0.7;';
    prevBtn.onclick = function(e) { e.stopPropagation(); currentIdx = (currentIdx - 1 + images.length) % images.length; img.src = images[currentIdx]; counter.textContent = (currentIdx + 1) + ' / ' + images.length; };
    lightbox.appendChild(prevBtn);

    var nextBtn = document.createElement('div');
    nextBtn.innerHTML = '&#10095;';
    nextBtn.style.cssText = 'position:absolute;right:20px;top:50%;transform:translateY(-50%);color:#fff;font-size:36px;cursor:pointer;user-select:none;opacity:0.7;';
    nextBtn.onclick = function(e) { e.stopPropagation(); currentIdx = (currentIdx + 1) % images.length; img.src = images[currentIdx]; counter.textContent = (currentIdx + 1) + ' / ' + images.length; };
    lightbox.appendChild(nextBtn);
  }

  lightbox.onclick = function() { lightbox.remove(); };
  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape') { lightbox.remove(); document.removeEventListener('keydown', escClose); }
  });

  document.body.appendChild(lightbox);
}

function buildMixProfileText(pp) {
  if (!pp) return '暂无';
  var parts = [];
  if (pp.has_amino_acid) parts.push('含氨基酸');
  if (pp.has_humic_acid) parts.push('含腐殖酸/黄腐酸');
  if (pp.has_calcium) parts.push('含钙');
  if (pp.has_phosphorus) parts.push('含磷');
  if (pp.has_copper) parts.push('含铜' + (pp.copper_level ? '(' + pp.copper_level + ')' : ''));
  if (pp.has_silicon) parts.push('含硅');
  if (pp.has_microbe) parts.push('含微生物');
  if (parts.length === 0) parts.push('常规肥料');
  return parts.join('、');
}

function renderNotFound(query) {
  return '' +
    '<div class="not-found">' +
      '<div class="nf-icon">?</div>' +
      '<h3>未找到 "' + escapeHtml(query) + '"</h3>' +
      '<p>该农药暂未收录。请按以下步骤自行判断：</p>' +
      '<div class="nf-guide">' +
        '<div class="nf-step"><strong>第一步：判断农药类别</strong><p>先确认该农药属于哪类：杀菌剂 / 杀虫剂 / 调节剂 / 除草剂 / 铜制剂 / 碱性农药 / 代森类 / 硫制剂</p></div>' +
        '<div class="nf-step nf-ban"><strong>一律不能混（禁混）</strong><ul>' +
          '<li>铜制剂（氢氧化铜、波尔多液、硫酸铜等）与含氨基酸、腐殖酸的产品</li>' +
          '<li>代森类（代森锰锌等）与含铜量较高的产品（沣硕、施可收、洁特等）</li>' +
          '<li>硫制剂（石硫合剂等）与含铜量较高的产品</li>' +
          '<li>福美双与含铜量较高的产品</li>' +
          '<li>杀菌剂与微生物菌剂（傲生、傲净、锄头猫微生物菌剂）</li>' +
          '<li>除草剂（草甘膦等）与所有肥料</li>' +
          '<li>强碱性农药与氨基酸、腐殖酸产品</li>' +
        '</ul></div>' +
        '<div class="nf-step nf-interval"><strong>需要谨慎 / 隔开用</strong><ul>' +
          '<li>无机铜制剂与所有肥料 → 谨慎，先做试验</li>' +
          '<li>含微量铜的产品与代森类/硫制剂 → 谨慎</li>' +
          '<li>含钙产品 + 含磷农药 → 间隔 2-3 天</li>' +
          '<li>强酸/强碱农药 + 任何产品 → 间隔 7 天</li>' +
        '</ul></div>' +
        '<div class="nf-step nf-ok"><strong>不确定时的安全做法</strong><p>建议农户先小范围试用，或分开使用间隔 3 天以上。不要替农户拍胸脯保证。</p></div>' +
      '</div>' +
    '</div>';
}

function renderResults(query) {
  var results = search(query);
  var container = document.getElementById('results');
  var welcome = document.getElementById('welcome');

  if (results.length === 0) {
    welcome.style.display = 'none';
    container.innerHTML = renderNotFound(query);
    return;
  }

  welcome.style.display = 'none';

  if (results.length > 1) {
    var html = '<div class="search-results-list"><p class="results-count">找到 ' + results.length + ' 个匹配项，点击查看详情：</p>';
    results.forEach(function(r) {
      var p = r.pesticide;
      var catColor = CATEGORY_COLORS[p.category] || '#666';
      var aliasText = (p.aliases && p.aliases.length) ? ' (' + escapeHtml(p.aliases[0]) + ')' : '';
      var safeName = escapeHtml(p.component).replace(/'/g, "\\'");
      html +=
        '<div class="result-item" data-component="' + escapeHtml(p.component) + '">' +
          '<span class="result-cat-dot" style="background:' + catColor + '"></span>' +
          '<span class="result-name">' + highlightText(p.component, query) + '</span>' +
          '<span class="result-alias">' + aliasText + '</span>' +
          '<span class="result-type">' + escapeHtml(p.category) + '</span>' +
          '<span class="result-match">匹配：' + escapeHtml(r.matchedTerm) + '（' + escapeHtml(r.matchedType) + '）</span>' +
          '<button class="btn-search-online" onclick="event.stopPropagation();searchOnline(\'' + safeName + '\')" title="在新标签页搜索">搜一搜</button>' +
        '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
    return;
  }

  var p = results[0].pesticide;
  container.innerHTML = renderPesticideCard(p) + renderMixingResults(p);
}

function findPesticideByComponent(componentName) {
  for (var i = 0; i < PESTICIDES.length; i++) {
    if (PESTICIDES[i].component === componentName) return PESTICIDES[i];
  }
  return null;
}

function selectPesticide(componentName) {
  var p = findPesticideByComponent(componentName);
  if (!p) {
    renderResults(componentName);
    return;
  }
  document.getElementById('searchInput').value = componentName;
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('results').innerHTML = renderPesticideCard(p) + renderMixingResults(p);
}

function quickSearch(name) {
  document.getElementById('searchInput').value = name;
  renderResults(name);
}

// ---- 产品搜索与标签 ----

function renderProductTags(filter) {
  var container = document.getElementById('productTags');
  if (!container) return;
  var q = (filter || '').trim().toLowerCase();

  var html = COMPANY_PRODUCTS.map(function(p) {
    var searchText = [
      p.name, p.category, p.intro, p.ingredients, p.functions,
      p.manufacturer, p.seller, p.origin
    ].filter(function(x) { return x; }).join(' ').toLowerCase();

    var visible = !q || searchText.indexOf(q) >= 0;
    return '<button class="product-tag' + (visible ? '' : ' hidden') + '" onclick="showProductDetail(\'' + p.id + '\')">' +
      '<span>' + escapeHtml(p.name) + '</span>' +
      (p.category ? '<span class="pt-cat">' + escapeHtml(p.category) + '</span>' : '') +
      '</button>';
  }).join('');

  container.innerHTML = html;
}

function clearProductSearch() {
  var input = document.getElementById('productSearchInput');
  input.value = '';
  renderProductTags('');
  document.getElementById('productSearchClear').classList.remove('visible');
  input.focus();
}

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', async function() {
  // 认证检查：未登录则显示登录界面
  initAuth();

  // 从云端加载产品和农药扩展数据
  if (typeof DB !== 'undefined') {
    await DB.load();
  }

  buildSearchIndex();

  var input = document.getElementById('searchInput');
  var debounceTimer = null;

  input.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    var val = this.value.trim();
    document.getElementById('searchClear').classList.toggle('visible', val.length > 0);
    debounceTimer = setTimeout(function() {
      if (val.length >= 1) {
        renderResults(val);
      } else {
        document.getElementById('results').innerHTML = '';
        document.getElementById('welcome').style.display = 'block';
      }
    }, 200);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      clearTimeout(debounceTimer);
      renderResults(this.value.trim());
    }
  });

  input.focus();

  // 搜索结果点击：用 data-component 避免内联 onclick 被特殊字符破坏
  document.getElementById('results').addEventListener('click', function(e) {
    // 如果点击的是"搜一搜"按钮，不触发结果选择
    if (e.target.closest('.btn-search-online') || e.target.closest('.btn-product-detail')) return;
    var item = e.target.closest('.result-item');
    if (!item) return;
    var component = item.getAttribute('data-component');
    if (component) selectPesticide(component);
  });

  // ESC关闭弹窗
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('productModal');
      if (modal) modal.style.display = 'none';
    }
  });

  // 产品搜索
  renderProductTags('');
  var productInput = document.getElementById('productSearchInput');
  if (productInput) {
    var productDebounce = null;
    productInput.addEventListener('input', function() {
      var val = this.value.trim();
      document.getElementById('productSearchClear').classList.toggle('visible', val.length > 0);
      clearTimeout(productDebounce);
      productDebounce = setTimeout(function() {
        renderProductTags(val);
      }, 150);
    });
  }
});

// ============================================================
// 用户认证 UI 逻辑
// ============================================================

function initAuth() {
  if (isLoggedIn()) {
    showMainContent();
  } else {
    showAuthOverlay();
  }
}

function showAuthOverlay() {
  document.getElementById('authOverlay').style.display = 'flex';
  document.getElementById('mainContent').style.display = 'none';
  showAuthLogin();
}

function showMainContent() {
  document.getElementById('authOverlay').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
}

function showAuthLogin() {
  document.getElementById('authLoginForm').style.display = 'block';
  document.getElementById('authRegisterForm').style.display = 'none';
  document.getElementById('authPending').style.display = 'none';
  document.getElementById('authLoginError').textContent = '';
}

function showAuthRegister() {
  document.getElementById('authLoginForm').style.display = 'none';
  document.getElementById('authRegisterForm').style.display = 'block';
  document.getElementById('authPending').style.display = 'none';
  document.getElementById('authRegisterError').textContent = '';
}

function showAuthPending() {
  document.getElementById('authLoginForm').style.display = 'none';
  document.getElementById('authRegisterForm').style.display = 'none';
  document.getElementById('authPending').style.display = 'block';
}

function handleAuthLogin() {
  var name = document.getElementById('loginName').value;
  var password = document.getElementById('loginPassword').value;
  var errEl = document.getElementById('authLoginError');
  var btn = document.getElementById('authLoginBtn');
  if (btn) { btn.disabled = true; btn.textContent = '登录中...'; }

  loginUser(name, password).then(function(result) {
    if (btn) { btn.disabled = false; btn.textContent = '登录'; }
    if (result.ok) {
      showMainContent();
    } else {
      errEl.textContent = result.message;
    }
  }).catch(function(err) {
    if (btn) { btn.disabled = false; btn.textContent = '登录'; }
    errEl.textContent = '网络错误，请重试';
    console.error('login error', err);
  });
}

function handleAuthRegister() {
  var name = document.getElementById('regName').value;
  var type = document.getElementById('regType').value;
  var password = document.getElementById('regPassword').value;
  var errEl = document.getElementById('authRegisterError');
  var btn = document.getElementById('authRegisterBtn');
  if (btn) { btn.disabled = true; btn.textContent = '注册中...'; }

  registerUser(name, type, password).then(function(result) {
    if (btn) { btn.disabled = false; btn.textContent = '注册'; }
    if (result.ok) {
      if (result.pending) {
        // 农小蛙需要审核
        showAuthPending();
      } else if (result.autoLogin) {
        // 农户/经销商注册后直接登录
        showMainContent();
      } else {
        // 未知情况，尝试登录
        loginUser(name, password).then(function(loginResult) {
          if (loginResult.ok) {
            showMainContent();
          } else {
            errEl.textContent = '注册成功，但登录失败：' + loginResult.message;
          }
        });
      }
    } else {
      errEl.textContent = result.message;
    }
  }).catch(function(err) {
    if (btn) { btn.disabled = false; btn.textContent = '注册'; }
    errEl.textContent = '网络错误，请重试';
    console.error('register error', err);
  });
}

function handleAuthLogout() {
  logoutUser();
  showAuthOverlay();
  document.getElementById('loginName').value = '';
  document.getElementById('loginPassword').value = '';
}

// 回车键登录
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    if (document.getElementById('authLoginForm').style.display !== 'none' &&
        document.getElementById('authOverlay').style.display !== 'none') {
      handleAuthLogin();
    }
  }
});

// 简化成分信息：对农户/经销商隐藏具体数值和百分比
function simplifyIngredients(text) {
  if (!text) return text;
  var s = String(text);
  // 去掉括号内的详细百分比，如（谷氨酸28.47%、甘氨酸14.16%...）
  s = s.replace(/（[^）]*%[^）]*）/g, '等');
  s = s.replace(/\([^)]*%[^)]*\)/g, '等');
  // 去掉精确数值，如 ≥486g/L → 含，100g/L → 含
  s = s.replace(/[≥≤]?\s*\d+\.?\d*\s*(g\/L|g\/kg|mg\/L|mg\/kg|%)/g, '');
  // 去掉单独的数字含量，如 B 6.8g/L → B
  s = s.replace(/\s+\d+\.?\d*\s*(g\/L|g\/kg|mg\/L|mg\/kg|%)/g, '');
  // 清理多余逗号和空格
  s = s.replace(/、\s*、/g, '、');
  s = s.replace(/、\s*$/g, '');
  s = s.replace(/,\s*,/g, ',');
  s = s.replace(/^\s*[、,]\s*/g, '');
  s = s.trim();
  return s;
}

// 获取当前用户应该看到的成分信息
function getDisplayIngredients(originalIngredients) {
  if (canSeeFullIngredients()) {
    return originalIngredients;
  }
  return simplifyIngredients(originalIngredients);
}

// 获取当前用户应该看到的pH值
// 农小蛙看真实值；农户/经销商看到偏中性的值：7 + (original - 7) * 0.25
function getDisplayPH(originalPH) {
  if (originalPH === null || originalPH === undefined || isNaN(originalPH)) return null;
  if (canSeeFullIngredients()) {
    return originalPH;
  }
  var adjusted = 7 + (originalPH - 7) * 0.25;
  return Math.round(adjusted * 100) / 100;
}

