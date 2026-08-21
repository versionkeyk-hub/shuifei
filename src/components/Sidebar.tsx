import React from 'react';
import {
  LayoutDashboard,
  Sprout,
  Bug,
  FileSpreadsheet,
  SlidersHorizontal,
  Users,
  ChevronLeft,
  ChevronRight,
  History,
  BookOpen,
  MessageSquare,
  Settings,
  Sparkles
} from 'lucide-react';
import { NavTab, AppUser, SystemSettings } from '../types';
import { getSiteText } from '../lib/siteTexts';
import { EditableText, EditableImage } from '../context/VisualEditContext';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  currentUser: AppUser | null;
  settings: SystemSettings;
  totalSchemesCount: number;
  totalPestsCount: number;
  pendingUsersCount: number;
  totalCropsCount: number;
  commentsCount: number;
  hasUnreadComments?: boolean;
  onOpenVersionModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  currentUser,
  settings,
  totalSchemesCount,
  totalPestsCount,
  pendingUsersCount,
  totalCropsCount,
  commentsCount,
  hasUnreadComments = false,
  onOpenVersionModal,
}) => {
  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';
  const canViewLocalImport =
    isAdmin ||
    currentUser?.role === 'expert' ||
    Boolean(currentUser?.canViewLocalImport);

  // Core General Menu items
  const menuItems = [
    {
      id: 'dashboard' as NavTab,
      label: getSiteText('nav_dashboard_label', settings?.siteTexts, settings.navTitles?.dashboard || '系统看板'),
      icon: LayoutDashboard,
      badge: null,
      desc: '数据资源与施肥全景',
      visible: true,
    },
    {
      id: 'crops' as NavTab,
      label: getSiteText('nav_crops_label', settings?.siteTexts, settings.navTitles?.crops || '作物与施肥方案'),
      icon: Sprout,
      badge: `${totalSchemesCount} 套`,
      badgeColor: 'bg-emerald-100 text-emerald-800',
      desc: '大类与作物全周期施肥方案',
      visible: true,
    },
    {
      id: 'pests' as NavTab,
      label: getSiteText('nav_pests_label', settings?.siteTexts, settings.navTitles?.pests || '病虫害图谱'),
      icon: Bug,
      badge: `${totalPestsCount} 种`,
      badgeColor: 'bg-amber-100 text-amber-800',
      desc: '症状图谱、分类归属与农药配方',
      visible: true,
    },
    {
      id: 'community' as NavTab,
      label: getSiteText('nav_community_label', settings?.siteTexts, settings.navTitles?.community || '互动交流与留言'),
      icon: MessageSquare,
      badge: commentsCount > 0 ? `${commentsCount} 条` : null,
      badgeColor: 'bg-blue-500 text-white font-bold',
      hasRedDot: (isAdmin && hasUnreadComments),
      desc: '田间经验交流与在线答疑',
      visible: true,
    },
    {
      id: 'product_quiz' as NavTab,
      label: getSiteText('nav_quiz_label', settings?.siteTexts, settings.navTitles?.product_quiz || '产品分类实训'),
      icon: BookOpen,
      badge: '实训库',
      badgeColor: 'bg-teal-500 text-white font-bold',
      desc: '农小蛙/锄头猫 5 维属性与功效练习',
      visible: true,
    },
    {
      id: 'local_import' as NavTab,
      label: getSiteText('nav_local_import_label', settings?.siteTexts, settings.navTitles?.local_import || '本地离线识别录入'),
      icon: FileSpreadsheet,
      badge: '管理员',
      badgeColor: 'bg-purple-600 text-white font-bold',
      desc: 'Word/Excel 方案本地离线自动解析',
      visible: canViewLocalImport,
    },
  ].filter((item) => item.visible);

  // Admin Management Items
  const adminMenuItems = [
    {
      id: 'admin_settings' as NavTab,
      label: settings.navTitles?.admin_settings || '系统设置与产品库',
      icon: SlidersHorizontal,
      badge: null,
      desc: '自定义平台名称、LOGO、大类与产品库',
      visible: isAdmin,
    },
    {
      id: 'users_approval' as NavTab,
      label: settings.navTitles?.users_approval || '成员与权限管理',
      icon: Users,
      badge: pendingUsersCount > 0 ? `${pendingUsersCount} 待审` : null,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
      desc: '全员密码重置、角色授权与准入审核',
      visible: isAdmin,
    },
  ].filter((item) => item.visible);

  return (
    <aside
      className={`bg-slate-900 text-slate-200 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 select-none z-20 ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Branding Section */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              {settings.siteLogoImage ? (
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center overflow-hidden p-0.5 shadow-xs shrink-0 border border-emerald-500/30">
                  <EditableImage
                    imageKey="site_logo_image"
                    defaultSrc={settings.siteLogoImage}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-base shadow-sm shrink-0">
                  <EditableText textKey="site_logo_icon" defaultText={settings.siteLogo || '惠'} />
                </div>
              )}
              <div className="truncate">
                <span className="font-bold text-xs text-white tracking-wide block truncate">
                  <EditableText textKey="site_name" defaultText={settings.siteName || '惠民皓天技术平台'} />
                </span>
                <span className="text-[10px] text-emerald-400 font-mono block truncate">
                  <EditableText textKey="site_subtitle" defaultText={settings.siteSubtitle || 'HMHT AGRI TECH'} />
                </span>
              </div>
            </div>
          ) : (
            <>
              {settings.siteLogoImage ? (
                <div className="w-8 h-8 mx-auto rounded-xl bg-white flex items-center justify-center overflow-hidden p-0.5 shadow-xs border border-emerald-500/30">
                  <img
                    src={settings.siteLogoImage}
                    alt={settings.siteName || 'Logo'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-black text-base">
                  {settings.siteLogo || '惠'}
                </div>
              )}
            </>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title={isCollapsed ? '展开导航栏' : '收起导航栏'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Navigation Items */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {!isCollapsed ? '核心功能智库' : '•••'}
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {item.hasRedDot && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
                  )}
                </div>

                {!isCollapsed && (
                  <div className="flex-1 text-left flex items-center justify-between min-w-0">
                    <span className="truncate">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      {item.hasRedDot && (
                        <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                      )}
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            item.badgeColor || 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          {/* Admin Management Section */}
          {adminMenuItems.length > 0 && (
            <>
              <div className="pt-4 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {!isCollapsed ? '管理与安全中枢' : '•••'}
              </div>

              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all relative ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />

                    {!isCollapsed && (
                      <div className="flex-1 text-left flex items-center justify-between min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                              item.badgeColor || 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Bottom User Role, Profile Settings & Version Footer */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {!isCollapsed ? (
          <div className="p-2.5 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center justify-between text-xs">
            <div
              onClick={() => setActiveTab('profile_settings')}
              className="flex items-center gap-2 overflow-hidden cursor-pointer group/user flex-1 min-w-0"
              title="点击进入个人设置与名片维护"
            >
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 group-hover/user:scale-105 transition-transform overflow-hidden">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUser?.realName.slice(0, 1) || '用'
                )}
              </div>
              <div className="truncate">
                <span className="text-white font-bold block truncate group-hover/user:text-emerald-400 transition-colors">
                  {currentUser?.realName || '未登录'}
                </span>
                <span className="text-[10px] text-emerald-400">
                  {currentUser?.role === 'super_admin'
                    ? '超级总管理员'
                    : currentUser?.role === 'admin'
                    ? '技术管理员'
                    : currentUser?.role === 'expert'
                    ? '农艺专家'
                    : '团队成员'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setActiveTab('profile_settings')}
                className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === 'profile_settings'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
                title="个人资料与密码设置"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onOpenVersionModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                title="版本历史与数据备份"
              >
                <History className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setActiveTab('profile_settings')}
              className={`p-2 rounded-xl transition-colors ${
                activeTab === 'profile_settings'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="个人设置"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenVersionModal}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              title="版本信息"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
