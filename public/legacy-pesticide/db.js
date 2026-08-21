// ============================================================
// db.js - 云端数据层
// 产品信息和农药扩展信息从 Supabase 云数据库加载
// 后台修改直接保存到云端，改完即生效，不用重新部署
// 静态 JS 文件作为回退（云端不可用时仍可使用）
// ============================================================

var SUPABASE_URL = 'https://alqngmojtbsgzkgrlvuz.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_uzxo5YUZ5cvE5myb522D7g_BCo-RseE';

// 混配关系表（农药成分 ↔ 产品，手动指定的混配规则）
var COMPATIBILITY = [];

var DB = (function() {
  var _loaded = false;
  var _loadingPromise = null;

  // REST API 请求封装
  async function _api(table, method, body, query) {
    var url = SUPABASE_URL + '/rest/v1/' + table;
    if (query) url += '?' + query;

    var headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    };
    if (method === 'POST' || method === 'PATCH') {
      headers['Prefer'] = 'return=representation';
    }
    // POST + merge-duplicates = upsert（有则更新，无则插入）
    if (method === 'POST') {
      headers['Prefer'] = 'return=representation, resolution=merge-duplicates';
    }

    var options = { method: method, headers: headers };
    if (body) options.body = JSON.stringify(body);

    var res = await fetch(url, options);
    if (!res.ok) {
      var text = '';
      try { text = await res.text(); } catch(e) {}
      throw new Error('HTTP ' + res.status + (text ? ': ' + text : ''));
    }
    // DELETE 请求返回 204 No Content，不需要解析 JSON
    if (method === 'DELETE' || res.status === 204) {
      return null;
    }
    return res.json();
  }

  // 从云端加载全部数据，覆盖全局变量
  async function load() {
    if (_loaded) return;
    if (_loadingPromise) return _loadingPromise;
    _loadingPromise = _doLoad();
    return _loadingPromise;
  }

  async function _doLoad() {
    var productsOk = false;
    var extrasOk = false;

    // 加载产品（按 id 合并：云端覆盖静态文件同 id 条目，静态有云端无的保留，云端有静态无的追加）
    try {
      var rows = await _api('products', 'GET', null, 'select=*');
      if (rows && rows.length > 0) {
        var staticMap = {};
        for (var si = 0; si < COMPANY_PRODUCTS.length; si++) {
          staticMap[COMPANY_PRODUCTS[si].id] = COMPANY_PRODUCTS[si];
        }
        var cloudMap = {};
        rows.forEach(function(r) { cloudMap[r.id] = r.data; });
        var merged = [];
        var replaced = 0;
        var appended = 0;
        // 先放静态文件中有的（按云端覆盖后的版本）
        Object.keys(staticMap).forEach(function(id) {
          if (cloudMap[id]) {
            merged.push(cloudMap[id]);
            replaced++;
          } else {
            merged.push(staticMap[id]);
          }
        });
        // 再追加云端有但静态文件中没有的新产品
        Object.keys(cloudMap).forEach(function(id) {
          if (!staticMap[id]) {
            merged.push(cloudMap[id]);
            appended++;
          }
        });
        COMPANY_PRODUCTS = merged;
        console.log('[DB] products: ' + rows.length + ' items from cloud, ' + replaced + ' replaced, ' + appended + ' appended, total ' + COMPANY_PRODUCTS.length);
        productsOk = true;
      } else {
        console.log('[DB] products: cloud empty, using static file (' + COMPANY_PRODUCTS.length + ' items)');
      }
    } catch(e) {
      console.warn('[DB] products load failed, using static file:', e.message);
    }

    // 加载农药扩展信息
    try {
      var extras = await _api('pesticide_extras', 'GET', null, 'select=*');
      if (extras && extras.length > 0) {
        var newExtras = {};
        extras.forEach(function(row) {
          newExtras[row.component] = {
            ph: row.ph || '',
            contraindications: row.contraindications || '',
            flags: row.flags || {}
          };
        });
        // 合并：云端数据覆盖静态文件，但静态文件中有的而云端没有的也保留
        var oldKeys = Object.keys(PESTICIDE_EXTRAS);
        oldKeys.forEach(function(key) {
          if (!newExtras[key]) {
            // 静态文件有但云端没有的，保留静态文件的值
            newExtras[key] = PESTICIDE_EXTRAS[key];
          }
        });
        PESTICIDE_EXTRAS = newExtras;
        console.log('[DB] pesticide_extras: ' + extras.length + ' items from cloud');
        extrasOk = true;
      } else {
        console.log('[DB] pesticide_extras: cloud empty, using static file (' + Object.keys(PESTICIDE_EXTRAS).length + ' items)');
      }
    } catch(e) {
      console.warn('[DB] pesticide_extras load failed, using static file:', e.message);
    }

    // 加载农药数据覆盖（只覆盖被后台修改过的农药条目）
    try {
      var overrides = await _api('pesticide_overrides', 'GET', null, 'select=*');
      if (overrides && overrides.length > 0) {
        var overrideMap = {};
        overrides.forEach(function(row) {
          overrideMap[row.component] = row.data;
        });
        // 用云端覆盖数据替换 PESTICIDES 数组中对应的条目，新条目追加到末尾
        var replaced = 0;
        var existingComponents = {};
        for (var i = 0; i < PESTICIDES.length; i++) {
          existingComponents[PESTICIDES[i].component] = true;
          if (overrideMap[PESTICIDES[i].component]) {
            PESTICIDES[i] = overrideMap[PESTICIDES[i].component];
            replaced++;
          }
        }
        // 追加云端有但静态文件没有的新农药
        var appended = 0;
        Object.keys(overrideMap).forEach(function(comp) {
          if (!existingComponents[comp]) {
            PESTICIDES.push(overrideMap[comp]);
            appended++;
          }
        });
        console.log('[DB] pesticide_overrides: ' + overrides.length + ' items from cloud, ' + replaced + ' replaced, ' + appended + ' appended');
      } else {
        console.log('[DB] pesticide_overrides: cloud empty, using static file');
      }
    } catch(e) {
      console.warn('[DB] pesticide_overrides load failed, using static file:', e.message);
    }

    // 加载混配关系表（农药成分 ↔ 产品）
    try {
      var compRows = await _api('compatibility', 'GET', null, 'select=*');
      if (compRows && compRows.length > 0) {
        COMPATIBILITY = compRows.map(function(r) {
          return {
            pesticide_component: r.pesticide_component,
            product_id: r.product_id,
            product_name: r.product_name || '',
            status: r.status || 'caution',
            reason: r.reason || ''
          };
        });
        console.log('[DB] compatibility: ' + COMPATIBILITY.length + ' items from cloud');
      } else {
        console.log('[DB] compatibility: cloud empty');
      }
    } catch(e) {
      console.warn('[DB] compatibility load failed:', e.message);
    }

    _loaded = true;
    return { products: productsOk, extras: extrasOk };
  }

  // 保存单个产品（upsert）
  async function saveProduct(product) {
    var id = product.id || ('custom_' + Date.now());
    if (!product.id) product.id = id;
    await _api('products', 'POST', { id: id, data: product });
    // 同步更新本地 COMPANY_PRODUCTS 数组
    var found = false;
    for (var i = 0; i < COMPANY_PRODUCTS.length; i++) {
      if (COMPANY_PRODUCTS[i].id === id) {
        COMPANY_PRODUCTS[i] = product;
        found = true;
        break;
      }
    }
    if (!found) COMPANY_PRODUCTS.push(product);
    console.log('[DB] product saved: ' + product.name + (found ? ' (replaced)' : ' (appended)'));
  }

  // 删除产品
  async function deleteProduct(id) {
    await _api('products', 'DELETE', null, 'id=eq.' + encodeURIComponent(id));
    console.log('[DB] product deleted: ' + id);
  }

  // 保存单个农药扩展信息（upsert）
  async function savePesticideExtra(component, ph, contraindications, flags) {
    var body = {
      component: component,
      ph: ph || '',
      contraindications: contraindications || '',
      flags: flags || {}
    };
    await _api('pesticide_extras', 'POST', body);
    // 同步更新全局变量
    PESTICIDE_EXTRAS[component] = {
      ph: ph || '',
      contraindications: contraindications || '',
      flags: flags || {}
    };
    console.log('[DB] pesticide_extra saved: ' + component);
  }

  // 删除农药扩展信息
  async function deletePesticideExtra(component) {
    await _api('pesticide_extras', 'DELETE', null, 'component=eq.' + encodeURIComponent(component));
    delete PESTICIDE_EXTRAS[component];
    console.log('[DB] pesticide_extra deleted: ' + component);
  }

  // 保存农药数据覆盖（后台"农药管理"tab编辑后调用）
  async function savePesticideOverride(pesticide) {
    var component = pesticide.component;
    if (!component) throw new Error('pesticide.component is required');
    await _api('pesticide_overrides', 'POST', { component: component, data: pesticide });
    // 同步更新本地 PESTICIDES 数组：存在则替换，不存在则追加
    var found = false;
    for (var i = 0; i < PESTICIDES.length; i++) {
      if (PESTICIDES[i].component === component) {
        PESTICIDES[i] = pesticide;
        found = true;
        break;
      }
    }
    if (!found) {
      PESTICIDES.push(pesticide);
    }
    console.log('[DB] pesticide_override saved: ' + component + (found ? ' (replaced)' : ' (appended)'));
  }

  // 删除农药数据覆盖
  async function deletePesticideOverride(component) {
    await _api('pesticide_overrides', 'DELETE', null, 'component=eq.' + encodeURIComponent(component));
    console.log('[DB] pesticide_override deleted: ' + component);
  }

  // 批量上传农药数据覆盖（迁移用）
  async function uploadAllPesticideOverrides(pesticides) {
    var ok = 0, fail = 0;
    for (var i = 0; i < pesticides.length; i++) {
      try {
        await savePesticideOverride(pesticides[i]);
        ok++;
      } catch(e) {
        console.error('[DB] upload pesticide override failed: ' + pesticides[i].component, e.message);
        fail++;
      }
    }
    console.log('[DB] batch upload pesticide overrides: ' + ok + ' ok, ' + fail + ' failed');
    return { ok: ok, fail: fail };
  }

  // 批量上传产品（迁移用）
  async function uploadAllProducts(products) {
    var ok = 0, fail = 0;
    for (var i = 0; i < products.length; i++) {
      try {
        await saveProduct(products[i]);
        ok++;
      } catch(e) {
        console.error('[DB] upload product failed: ' + products[i].name, e.message);
        fail++;
      }
    }
    console.log('[DB] batch upload products: ' + ok + ' ok, ' + fail + ' failed');
    return { ok: ok, fail: fail };
  }

  // 批量上传农药扩展信息（迁移用）
  async function uploadAllExtras(extrasObj) {
    var keys = Object.keys(extrasObj);
    var ok = 0, fail = 0;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = extrasObj[key];
      try {
        await savePesticideExtra(key, val.ph, val.contraindications, val.flags || {});
        ok++;
      } catch(e) {
        console.error('[DB] upload extra failed: ' + key, e.message);
        fail++;
      }
    }
    console.log('[DB] batch upload extras: ' + ok + ' ok, ' + fail + ' failed');
    return { ok: ok, fail: fail };
  }

  // ---- 混配关系 CRUD ----

  // 保存单条混配关系（upsert）
  async function saveCompatibility(item) {
    var body = {
      pesticide_component: item.pesticide_component,
      product_id: item.product_id,
      product_name: item.product_name || '',
      status: item.status,
      reason: item.reason || ''
    };
    await _api('compatibility', 'POST', body);
    // 同步更新本地数组
    var found = false;
    for (var i = 0; i < COMPATIBILITY.length; i++) {
      if (COMPATIBILITY[i].pesticide_component === item.pesticide_component && COMPATIBILITY[i].product_id === item.product_id) {
        COMPATIBILITY[i] = body;
        found = true;
        break;
      }
    }
    if (!found) COMPATIBILITY.push(body);
    console.log('[DB] compatibility saved: ' + item.pesticide_component + ' + ' + item.product_id);
  }

  // 删除单条混配关系
  async function deleteCompatibility(pesticide_component, product_id) {
    await _api('compatibility', 'DELETE', null,
      'pesticide_component=eq.' + encodeURIComponent(pesticide_component) +
      '&product_id=eq.' + encodeURIComponent(product_id));
    COMPATIBILITY = COMPATIBILITY.filter(function(c) {
      return !(c.pesticide_component === pesticide_component && c.product_id === product_id);
    });
    console.log('[DB] compatibility deleted: ' + pesticide_component + ' + ' + product_id);
  }

  // 删除某农药的所有混配关系
  async function deleteCompatibilityByPesticide(pesticide_component) {
    await _api('compatibility', 'DELETE', null,
      'pesticide_component=eq.' + encodeURIComponent(pesticide_component));
    COMPATIBILITY = COMPATIBILITY.filter(function(c) {
      return c.pesticide_component !== pesticide_component;
    });
    console.log('[DB] compatibility deleted by pesticide: ' + pesticide_component);
  }

  // 删除某产品的所有混配关系
  async function deleteCompatibilityByProduct(product_id) {
    await _api('compatibility', 'DELETE', null,
      'product_id=eq.' + encodeURIComponent(product_id));
    COMPATIBILITY = COMPATIBILITY.filter(function(c) {
      return c.product_id !== product_id;
    });
    console.log('[DB] compatibility deleted by product: ' + product_id);
  }

  return {
    load: load,
    saveProduct: saveProduct,
    deleteProduct: deleteProduct,
    savePesticideExtra: savePesticideExtra,
    deletePesticideExtra: deletePesticideExtra,
    savePesticideOverride: savePesticideOverride,
    deletePesticideOverride: deletePesticideOverride,
    uploadAllProducts: uploadAllProducts,
    uploadAllExtras: uploadAllExtras,
    uploadAllPesticideOverrides: uploadAllPesticideOverrides,
    saveCompatibility: saveCompatibility,
    deleteCompatibility: deleteCompatibility,
    deleteCompatibilityByPesticide: deleteCompatibilityByPesticide,
    deleteCompatibilityByProduct: deleteCompatibilityByProduct,
    isLoaded: function() { return _loaded; }
  };
})();
