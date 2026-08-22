import React, { useCallback, useEffect, useState } from 'react';
import {
  Crop,
  CropCategory,
  FertilizationScheme,
  PestDiseaseItem,
  AppUser,
  SystemSettings,
  NavTab,
  WatermarkConfig,
  CommunityComment
} from './types';
import { getStorageData, saveStorageData, resetToInitialData } from './lib/storage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CropListView } from './components/CropListView';
import { CropDetailView } from './components/CropDetailView';
import { PestGalleryView } from './components/PestGalleryView';
import { LocalImporterView } from './components/LocalImporterView';
import { ExportStudioView } from './components/ExportStudioView';
import { ProductQuizView } from './components/ProductQuizView';
import { CatalogStats, ProductLibraryView } from './components/ProductLibraryView';
import { NativePesticideMixingView } from './components/NativePesticideMixingView';
import { NativeProductCatalogView } from './components/NativeProductCatalogView';
import { NavigationSettingsView } from './components/NavigationSettingsView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { UserApprovalView } from './components/UserApprovalView';
import { CommunityView } from './components/CommunityView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { AuthModal } from './components/AuthModal';
import { VersionModal } from './components/VersionModal';
import { VisualEditProvider } from './context/VisualEditContext';

const INITIAL_COMMENTS: CommunityComment[] = [
  {
    id: 'comm-1',
    authorId: 'super-admin-1',
    authorName: '惠民皓天技术部（总管理员）',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    authorRole: 'super_admin',
    content: '欢迎各位专家农艺师与经销商伙伴入驻惠民皓天数字技术智库！平台现已开放全作物方案自定义、水肥药协同抗逆图谱及离线方案识别解析功能。如有任何调配心得或田间疑难杂症，欢迎在本区留言探讨！',
    createdAt: '2026-03-28 09:30',
    likesCount: 18,
    isLikedByMe: false,
    isPinned: true,
    category: '经验交流',
    replies: [
      {
        id: 'rep-1',
        authorId: 'u-expert-1',
        authorName: '张农艺师（寿光技术站）',
        authorRole: 'expert',
        content: '收到！最近寿光大棚黄瓜白粉病和霜霉病混发较多，结合傲生微生物菌剂灌根后叶片长势明显更坚挺抗逆。',
        createdAt: '2026-03-28 10:15',
      }
    ]
  },
  {
    id: 'comm-2',
    authorId: 'u-expert-2',
    authorName: '李工（新疆哈密瓜示范基地）',
    authorRole: 'expert',
    content: '请教各位老师：哈密瓜膨瓜期如果遇到连续高温干旱，农小蛙/锄头猫高钾水溶肥配合微量元素糖醇钙喷施，间隔多少天最合适？',
    createdAt: '2026-03-29 14:20',
    likesCount: 7,
    isLikedByMe: false,
    isPinned: false,
    cropTag: '哈密瓜',
    category: '技术求助',
    replies: [
      {
        id: 'rep-2',
        authorId: 'super-admin-1',
        authorName: '惠民皓天技术部（总管理员）',
        authorRole: 'super_admin',
        content: '建议每隔 5-7 天叶面喷施一次，浓度控制在 1000-1200 倍液；避开正午高温时段，早晚喷施吸收效率最佳。',
        createdAt: '2026-03-29 15:02',
      }
    ]
  }
];

export const App: React.FC = () => {
  // Storage State
  const initial = getStorageData();
  const [categories, setCategories] = useState<CropCategory[]>(initial.categories);
  const [crops, setCrops] = useState<Crop[]>(initial.crops);
  const [schemes, setSchemes] = useState<FertilizationScheme[]>(initial.schemes);
  const [pests, setPests] = useState<PestDiseaseItem[]>(initial.pests);
  const [users, setUsers] = useState<AppUser[]>(initial.users);
  const [settings, setSettings] = useState<SystemSettings>(initial.settings);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => sessionStorage.getItem('hmht_api_token') ? initial.currentUser : null);

  // Community Comments State
  const [comments, setComments] = useState<CommunityComment[]>(() => {
    const saved = localStorage.getItem('hmht_community_comments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_COMMENTS;
      }
    }
    return INITIAL_COMMENTS;
  });

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<NavTab>(() => window.location.pathname === '/admin' ? 'admin_settings' : 'dashboard');
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [cropInitialTab, setCropInitialTab] = useState<'scheme' | 'pest'>('scheme');
  const [previousSourceTab, setPreviousSourceTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [catalogStats, setCatalogStats] = useState<CatalogStats>({ products: 26, skus: 47, pesticides: 6706, products_with_legacy_images: 58, source: 'legacy' });
  const handleCatalogStatsChange = useCallback((nextStats: CatalogStats) => setCatalogStats(nextStats), []);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [exportTargetScheme, setExportTargetScheme] = useState<FertilizationScheme | undefined>(undefined);

  // Automated Crop Counter Linkage
  const updateCropCounters = (
    currentCrops: Crop[],
    currentSchemes: FertilizationScheme[],
    currentPests: PestDiseaseItem[]
  ) => {
    return currentCrops.map((c) => ({
      ...c,
      schemeCount: currentSchemes.filter((s) => s.cropId === c.id && !s.isDeleted).length,
      diseaseCount: currentPests.filter(
        (p) => p.cropId === c.id || (p.cropIds && p.cropIds.includes(c.id))
      ).length,
    }));
  };

  // Sync to localStorage
  useEffect(() => {
    saveStorageData({
      categories,
      crops,
      schemes,
      pests,
      users,
      settings,
      currentUser,
    });
  }, [categories, crops, schemes, pests, users, settings, currentUser]);

  useEffect(() => {
    localStorage.setItem('hmht_community_comments', JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    fetch('/api/catalog/stats')
      .then((response) => response.ok ? response.json() : null)
      .then((payload: CatalogStats | null) => {
        if (payload) setCatalogStats((current) => ({ ...current, ...payload, source: 'api' }));
      })
      .catch(() => undefined);
  }, []);

  // Handle Crop Selection & Navigation with History Source Tracking
  const handleSelectCrop = (cropId: string, initialTab: 'scheme' | 'pest' = 'scheme', source?: NavTab) => {
    if (source) {
      setPreviousSourceTab(source);
    } else if (activeTab !== 'crops') {
      setPreviousSourceTab(activeTab);
    }
    setSelectedCropId(cropId);
    setCropInitialTab(initialTab);
    setActiveTab('crops');
  };

  // Scheme Handlers
  const handleUpdateScheme = (updated: FertilizationScheme) => {
    const newSchemes = schemes.map((s) => (s.id === updated.id ? updated : s));
    setSchemes(newSchemes);
    setCrops(updateCropCounters(crops, newSchemes, pests));
  };

  const handleSoftDeleteScheme = (schemeId: string) => {
    const newSchemes = schemes.map((s) =>
      s.id === schemeId
        ? { ...s, isDeleted: true, deletedAt: new Date().toISOString().slice(0, 10) }
        : s
    );
    setSchemes(newSchemes);
    setCrops(updateCropCounters(crops, newSchemes, pests));
  };

  const handleRestoreScheme = (schemeId: string) => {
    const newSchemes = schemes.map((s) =>
      s.id === schemeId ? { ...s, isDeleted: false, deletedAt: undefined } : s
    );
    setSchemes(newSchemes);
    setCrops(updateCropCounters(crops, newSchemes, pests));
  };

  const handlePermanentDeleteScheme = (schemeId: string) => {
    const newSchemes = schemes.filter((s) => s.id !== schemeId);
    setSchemes(newSchemes);
    setCrops(updateCropCounters(crops, newSchemes, pests));
  };

  const handleAddScheme = (newScheme: FertilizationScheme) => {
    const newSchemes = [newScheme, ...schemes];
    setSchemes(newSchemes);
    setCrops(updateCropCounters(crops, newSchemes, pests));
  };

  // Pest Handlers
  const handleUpdatePest = (updated: PestDiseaseItem) => {
    const newPests = pests.map((p) => (p.id === updated.id ? updated : p));
    setPests(newPests);
    setCrops(updateCropCounters(crops, schemes, newPests));
  };

  const handleDeletePest = (pestId: string) => {
    const newPests = pests.filter((p) => p.id !== pestId);
    setPests(newPests);
    setCrops(updateCropCounters(crops, schemes, newPests));
  };

  const handleAddPest = (newPest: PestDiseaseItem) => {
    const newPests = [newPest, ...pests];
    setPests(newPests);
    setCrops(updateCropCounters(crops, schemes, newPests));
  };

  // Crop Handlers
  const handleAddCrop = (newCrop: Crop) => {
    const newCrops = [...crops, newCrop];
    setCrops(updateCropCounters(newCrops, schemes, pests));
  };

  const handleUpdateCrop = (updated: Crop) => {
    const newCrops = crops.map((c) => (c.id === updated.id ? updated : c));
    setCrops(updateCropCounters(newCrops, schemes, pests));
  };

  const handleDeleteCrop = (cropId: string) => {
    const newCrops = crops.filter((c) => c.id !== cropId);
    setCrops(updateCropCounters(newCrops, schemes, pests));
  };

  // Watermark Settings Handler
  const handleUpdateWatermarkConfig = (newWatermark: WatermarkConfig) => {
    setSettings({
      ...settings,
      watermarkConfig: newWatermark,
    });
  };

  // Auth Handlers
  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('hmht_api_token');
    setCurrentUser(null);
  };

  const handleUpdateUserProfile = (updatedUser: AppUser) => {
    setCurrentUser(updatedUser);
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  // Community Handlers
  const handleAddComment = (newComment: CommunityComment) => {
    setComments([newComment, ...comments]);
  };

  const handleDeleteComment = (commentId: string) => {
    setComments(comments.filter((c) => c.id !== commentId));
  };

  const handleToggleLike = (commentId: string) => {
    setComments(
      comments.map((c) => {
        if (c.id === commentId) {
          const isLiked = c.isLikedByMe;
          return {
            ...c,
            isLikedByMe: !isLiked,
            likesCount: isLiked ? c.likesCount - 1 : c.likesCount + 1,
          };
        }
        return c;
      })
    );
  };

  const handleTogglePin = (commentId: string) => {
    setComments(
      comments.map((c) => (c.id === commentId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  const handleAddReply = (commentId: string, replyContent: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const reply = {
      id: `rep-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.realName,
      authorAvatar: currentUser.avatarUrl,
      authorRole: currentUser.role,
      content: replyContent,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
    };
    setComments(
      comments.map((c) =>
        c.id === commentId
          ? { ...c, replies: [...(c.replies || []), reply] }
          : c
      )
    );
  };

  // Local Importer Handlers
  const handleLocalImportScheme = (importedScheme: FertilizationScheme) => {
    handleAddScheme(importedScheme);
  };

  const handleLocalImportPest = (importedPest: PestDiseaseItem) => {
    handleAddPest(importedPest);
  };

  const handleDataReset = () => {
    const initialData = getStorageData();
    setCategories(initialData.categories);
    setCrops(initialData.crops);
    setSchemes(initialData.schemes);
    setPests(initialData.pests);
    setUsers(initialData.users);
    setSettings(initialData.settings);
    setCurrentUser(initialData.currentUser);
    setComments(INITIAL_COMMENTS);
  };

  const selectedCrop = crops.find((c) => c.id === selectedCropId);
  const pendingUsersCount = users.filter((u) => u.status === 'pending').length;
  const activeSchemesCount = schemes.filter((s) => !s.isDeleted).length;

  return (
    <VisualEditProvider settings={settings} currentUser={currentUser} onUpdateSettings={setSettings}>
      <div className="flex h-screen bg-slate-100/70 font-sans text-slate-800 antialiased overflow-hidden selection:bg-emerald-500 selection:text-white">
        {/* Dynamic Responsive Sidebar */}
        <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'crops') {
            setSelectedCropId(null);
          }
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        currentUser={currentUser}
        settings={settings}
        totalSchemesCount={activeSchemesCount}
        totalPestsCount={pests.length}
        pendingUsersCount={pendingUsersCount}
        totalCropsCount={crops.length}
        commentsCount={comments.length}
        totalProductCatalogCount={catalogStats.products}
        totalPesticideIngredients={catalogStats.pesticides}
        hasUnreadComments={false}
        onOpenVersionModal={() => setIsVersionModalOpen(true)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Global Top Navigation Header */}
        <Header
          currentUser={currentUser}
          settings={settings}
          crops={crops}
          schemes={schemes}
          pests={pests}
          onSelectCrop={handleSelectCrop}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
          onOpenVersionModal={() => setIsVersionModalOpen(true)}
          onNavigate={(tab) => {
            setActiveTab(tab);
            if (tab !== 'crops') setSelectedCropId(null);
          }}
          pendingCount={pendingUsersCount}
        />

        {/* Dynamic Main Body Route View */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              crops={crops}
              categories={categories}
              schemes={schemes.filter((s) => !s.isDeleted)}
              pests={pests}
              currentUser={currentUser}
              settings={settings}
              onSelectCrop={(cropId, tab) => handleSelectCrop(cropId, tab, 'dashboard')}
              onNavigateToPests={() => setActiveTab('pests')}
              onNavigateToSchemes={() => {
                setSelectedCropId(null);
                setActiveTab('crops');
              }}
              onNavigateToCrops={() => {
                setSelectedCropId(null);
                setActiveTab('crops');
              }}
              onOpenProductQuiz={() => setActiveTab('product_quiz')}
              catalogStats={catalogStats}
              onNavigateToProductLibrary={() => setActiveTab('product_catalog')}
              onOpenQuickAI={() => setActiveTab('local_import')}
              onOpenNewScheme={() => {
                setSelectedCropId(crops[0]?.id || null);
                setActiveTab('crops');
              }}
              onOpenExportStudio={() => setActiveTab('export_studio')}
              onOpenLocalImport={() => setActiveTab('local_import')}
              onOpenCommunity={() => setActiveTab('community')}
            />
          )}

          {activeTab === 'crops' && (
            <>
              {selectedCrop ? (
                <CropDetailView
                  crop={selectedCrop}
                  crops={crops}
                  categories={categories}
                  schemes={schemes.filter((s) => s.cropId === selectedCrop.id)}
                  pests={pests.filter(
                    (p) =>
                      p.cropId === selectedCrop.id ||
                      (p.cropIds && p.cropIds.includes(selectedCrop.id)) ||
                      p.isGeneralCrop
                  )}
                  watermarkConfig={settings.watermarkConfig}
                  settings={settings}
                  currentUser={currentUser}
                  initialTab={cropInitialTab}
                  onUpdateScheme={handleUpdateScheme}
                  onSoftDeleteScheme={handleSoftDeleteScheme}
                  onRestoreScheme={handleRestoreScheme}
                  onPermanentDeleteScheme={handlePermanentDeleteScheme}
                  onAddScheme={handleAddScheme}
                  onUpdatePest={handleUpdatePest}
                  onDeletePest={handleDeletePest}
                  onAddPest={handleAddPest}
                  onUpdateCrop={handleUpdateCrop}
                  onUpdateWatermarkConfig={handleUpdateWatermarkConfig}
                  onOpenExportModal={(scheme) => {
                    setExportTargetScheme(scheme);
                    setPreviousSourceTab('crops');
                    setActiveTab('export_studio');
                  }}
                  onBack={() => {
                    if (previousSourceTab === 'dashboard') {
                      setActiveTab('dashboard');
                    } else {
                      setSelectedCropId(null);
                    }
                  }}
                />
              ) : (
                <CropListView
                  crops={crops}
                  categories={categories}
                  schemes={schemes.filter((s) => !s.isDeleted)}
                  pests={pests}
                  currentUser={currentUser}
                  settings={settings}
                  onSelectCrop={(cropId, tab) => handleSelectCrop(cropId, tab, 'crops')}
                  onAddCrop={handleAddCrop}
                  onUpdateCrop={handleUpdateCrop}
                  onDeleteCrop={handleDeleteCrop}
                />
              )}
            </>
          )}

          {activeTab === 'pests' && (
            <PestGalleryView
              pests={pests}
              crops={crops}
              currentUser={currentUser}
              onSelectCrop={(cropId, tab) => handleSelectCrop(cropId, tab, 'pests')}
              onAddPest={handleAddPest}
              onUpdatePest={handleUpdatePest}
              onDeletePest={handleDeletePest}
              onOpenLocalImport={() => setActiveTab('local_import')}
            />
          )}

          {activeTab === 'community' && (
            <CommunityView
              comments={comments}
              currentUser={currentUser}
              settings={settings}
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              onToggleLike={handleToggleLike}
              onTogglePin={handleTogglePin}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
          )}

          {activeTab === 'profile_settings' && (
            <ProfileSettingsView
              currentUser={currentUser}
              onUpdateProfile={handleUpdateUserProfile}
              onRequireLogin={() => setIsAuthModalOpen(true)}
            />
          )}

          {activeTab === 'product_quiz' && (
            <ProductQuizView currentUser={currentUser} />
          )}

          {activeTab === 'product_library' && (
            <ProductLibraryView
              currentUser={currentUser}
              initialMode={window.location.pathname === '/admin' ? 'admin' : 'catalog'}
              onStatsChange={handleCatalogStatsChange}
              onNavigateToCrops={() => setActiveTab('crops')}
            />
          )}

          {activeTab === 'pesticide_mixing' && <NativePesticideMixingView />}

          {activeTab === 'product_catalog' && <NativeProductCatalogView currentUser={currentUser} />}

          {activeTab === 'navigation_settings' && <NavigationSettingsView />}

          {activeTab === 'local_import' && (
            <LocalImporterView
              crops={crops}
              categories={categories}
              onImportScheme={handleLocalImportScheme}
              onImportPest={handleLocalImportPest}
              onAddCrop={handleAddCrop}
              onSelectCrop={(cropId, tab) => handleSelectCrop(cropId, tab, 'local_import')}
            />
          )}

          {activeTab === 'export_studio' && (
            <ExportStudioView
              schemes={schemes.filter((s) => !s.isDeleted)}
              selectedScheme={exportTargetScheme}
              watermarkConfig={settings.watermarkConfig}
              settings={settings}
              onUpdateWatermarkConfig={handleUpdateWatermarkConfig}
              onBack={() => {
                if (previousSourceTab === 'crops' && selectedCropId) {
                  setActiveTab('crops');
                } else if (previousSourceTab === 'dashboard') {
                  setActiveTab('dashboard');
                } else {
                  setActiveTab('crops');
                }
              }}
            />
          )}

          {activeTab === 'admin_settings' && (
            <AdminSettingsView
              settings={settings}
              currentUser={currentUser}
              onUpdateSettings={setSettings}
              onDataReset={handleDataReset}
            />
          )}

          {activeTab === 'users_approval' && (
            <ProductLibraryView
              currentUser={currentUser}
              initialMode="admin"
              onStatsChange={handleCatalogStatsChange}
              onNavigateToCrops={() => setActiveTab('crops')}
            />
          )}
        </main>
      </div>

      {/* Auth & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      {/* Version & Release Notes Modal */}
      <VersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
      />
    </div>
    </VisualEditProvider>
  );
};

export default App;
