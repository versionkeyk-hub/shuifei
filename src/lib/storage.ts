import { Crop, CropCategory, FertilizationScheme, PestDiseaseItem, AppUser, SystemSettings } from '../types';
import { INITIAL_CATEGORIES, INITIAL_CROPS, INITIAL_SCHEMES, INITIAL_PESTS, INITIAL_USERS, INITIAL_SETTINGS } from '../data/initialData';
import { DEFAULT_STAMP_PRESETS } from './stampPresets';

const STORAGE_KEYS = {
  VERSION: 'hmht_data_version_v3',
  CATEGORIES: 'hmht_categories_v3',
  CROPS: 'hmht_crops_v3',
  SCHEMES: 'hmht_schemes_v3',
  PESTS: 'hmht_pests_v3',
  USERS: 'hmht_users_v3',
  SETTINGS: 'hmht_settings_v3',
  CURRENT_USER: 'hmht_current_user_v3',
  QUIZ_ANSWERS: 'hmht_quiz_answers_v3',
};

export const getStorageData = () => {
  try {
    let categories: CropCategory[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || 'null');
    let crops: Crop[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CROPS) || 'null');
    let schemes: FertilizationScheme[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEMES) || 'null');
    let pests: PestDiseaseItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PESTS) || 'null');
    let users: AppUser[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || 'null');
    let settings: SystemSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || 'null');
    let currentUser: AppUser | null = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');

    // 智能无损数据合并逻辑：确保新增的作物/方案/大类/印章不丢失
    if (!categories || categories.length === 0) {
      categories = INITIAL_CATEGORIES;
    } else {
      const existingCatIds = new Set(categories.map(cat => cat.id));
      INITIAL_CATEGORIES.forEach(initCat => {
        if (!existingCatIds.has(initCat.id)) {
          categories.push(initCat);
        }
      });
    }

    if (!crops || crops.length === 0) {
      crops = INITIAL_CROPS;
    } else {
      // 补齐缺失的官方作物
      const existingCropIds = new Set(crops.map(c => c.id));
      INITIAL_CROPS.forEach(initCrop => {
        if (!existingCropIds.has(initCrop.id)) {
          crops.push(initCrop);
        }
      });
    }

    if (!schemes || schemes.length === 0) {
      schemes = INITIAL_SCHEMES;
    } else {
      // 补齐缺失的官方方案
      const existingSchemeIds = new Set(schemes.map(s => s.id));
      INITIAL_SCHEMES.forEach(initSch => {
        if (!existingSchemeIds.has(initSch.id)) {
          schemes.push(initSch);
        }
      });
    }

    if (!pests || pests.length === 0) {
      pests = INITIAL_PESTS;
    } else {
      // 补齐缺失的病虫害
      const existingPestIds = new Set(pests.map(p => p.id));
      INITIAL_PESTS.forEach(initPest => {
        if (!existingPestIds.has(initPest.id)) {
          pests.push(initPest);
        }
      });
    }

    if (!users || users.length === 0) {
      users = INITIAL_USERS;
    } else {
      // 确保 super_admin 存在
      if (!users.some(u => u.role === 'super_admin')) {
        users.unshift(INITIAL_USERS[0]);
      }
    }

    if (!settings) {
      settings = INITIAL_SETTINGS;
    } else {
      // 确保水印印章预设和新字段存在
      if (!settings.watermarkImagePresets || settings.watermarkImagePresets.length === 0) {
        settings.watermarkImagePresets = DEFAULT_STAMP_PRESETS;
      }
      if (!settings.siteName) {
        settings.siteName = '惠民皓天内部技术综合平台';
      }
      if (!settings.siteLogo) {
        settings.siteLogo = '惠';
      }
    }

    if (!currentUser) {
      currentUser = users.find(u => u.role === 'super_admin') || users[0];
    }

    return { categories, crops, schemes, pests, users, settings, currentUser };
  } catch (err) {
    console.error('Storage read error:', err);
    return {
      categories: INITIAL_CATEGORIES,
      crops: INITIAL_CROPS,
      schemes: INITIAL_SCHEMES,
      pests: INITIAL_PESTS,
      users: INITIAL_USERS,
      settings: INITIAL_SETTINGS,
      currentUser: INITIAL_USERS[0],
    };
  }
};

export const saveStorageData = (
  data: Partial<{
    categories: CropCategory[];
    crops: Crop[];
    schemes: FertilizationScheme[];
    pests: PestDiseaseItem[];
    users: AppUser[];
    settings: SystemSettings;
    currentUser: AppUser | null;
  }>
) => {
  try {
    if (data.categories) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data.categories));
    if (data.crops) localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(data.crops));
    if (data.schemes) localStorage.setItem(STORAGE_KEYS.SCHEMES, JSON.stringify(data.schemes));
    if (data.pests) localStorage.setItem(STORAGE_KEYS.PESTS, JSON.stringify(data.pests));
    if (data.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
    if (data.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    if (data.currentUser !== undefined) {
      if (data.currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data.currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    }
  } catch (err) {
    console.error('Storage write error:', err);
  }
};

export const resetToInitialData = () => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.CROPS, JSON.stringify(INITIAL_CROPS));
  localStorage.setItem(STORAGE_KEYS.SCHEMES, JSON.stringify(INITIAL_SCHEMES));
  localStorage.setItem(STORAGE_KEYS.PESTS, JSON.stringify(INITIAL_PESTS));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
  return getStorageData();
};

// 一键无损全量同步最新官方智库与方案
export const syncAllOfficialData = () => {
  const current = getStorageData();
  const existingCropIds = new Set(current.crops.map(c => c.id));
  const mergedCrops = [...current.crops];
  INITIAL_CROPS.forEach(c => {
    if (!existingCropIds.has(c.id)) {
      mergedCrops.push(c);
    }
  });

  const existingSchemeIds = new Set(current.schemes.map(s => s.id));
  const mergedSchemes = [...current.schemes];
  INITIAL_SCHEMES.forEach(s => {
    if (!existingSchemeIds.has(s.id)) {
      mergedSchemes.push(s);
    }
  });

  const existingPestIds = new Set(current.pests.map(p => p.id));
  const mergedPests = [...current.pests];
  INITIAL_PESTS.forEach(p => {
    if (!existingPestIds.has(p.id)) {
      mergedPests.push(p);
    }
  });

  saveStorageData({
    categories: INITIAL_CATEGORIES,
    crops: mergedCrops,
    schemes: mergedSchemes,
    pests: mergedPests,
  });

  return getStorageData();
};

export const exportAllDataAsJSON = () => {
  const data = getStorageData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `huiminhaotian_data_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importAllDataFromJSON = async (file: File): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.crops && parsed.schemes) {
          saveStorageData(parsed);
          resolve(true);
        } else {
          reject(new Error('Invalid format'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};
