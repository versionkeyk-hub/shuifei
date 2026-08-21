import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  UserPlus,
  Clock,
  Key,
  Shield,
  UserCheck,
  Trash2,
  Lock,
  Search,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { AppUser, UserRole } from '../types';

interface UserApprovalViewProps {
  users: AppUser[];
  currentUser: AppUser | null;
  onUpdateUsers: (users: AppUser[]) => void;
}

export const UserApprovalView: React.FC<UserApprovalViewProps> = ({
  users,
  currentUser,
  onUpdateUsers,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('123456');
  const [newRealName, setNewRealName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('admin');
  const [newPhone, setNewPhone] = useState('');
  const [newDept, setNewDept] = useState('农业技术中心');

  // Password reset modal
  const [resettingUser, setResettingUser] = useState<AppUser | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Permission detail modal
  const [permEditingUser, setPermEditingUser] = useState<AppUser | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const activeUsers = users.filter(
    (u) =>
      u.status !== 'pending' &&
      (!searchQuery.trim() ||
        u.realName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleApprove = (userId: string, assignedRole: UserRole) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'approved' as const,
          role: assignedRole,
          approvedAt: new Date().toISOString().slice(0, 10),
          approvedBy: currentUser?.realName || currentUser?.username || '管理员',
        };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleReject = (userId: string) => {
    if (confirm('确定拒绝该用户的准入申请吗？')) {
      const updated = users.map((u) => {
        if (u.id === userId) {
          return { ...u, status: 'rejected' as const };
        }
        return u;
      });
      onUpdateUsers(updated);
    }
  };

  const handleChangeRole = (userId: string, role: UserRole) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        return { ...u, role };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleToggleStatus = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const newStatus: AppUser['status'] = target.status === 'approved' || target.status === 'active' ? 'disabled' : 'approved';
    const updated = users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
    onUpdateUsers(updated);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('确定移除该成员账号吗？')) {
      onUpdateUsers(users.filter((u) => u.id !== userId));
    }
  };

  const handleDoResetPassword = () => {
    if (!resettingUser) return;
    if (!newResetPassword.trim()) {
      alert('请输入新密码');
      return;
    }

    const updated = users.map((u) => {
      if (u.id === resettingUser.id) {
        return { ...u, password: newResetPassword.trim() };
      }
      return u;
    });

    onUpdateUsers(updated);
    setResetSuccessMsg(`已成功将「${resettingUser.realName}」的密码重置！`);
    setTimeout(() => {
      setResetSuccessMsg('');
      setResettingUser(null);
      setNewResetPassword('');
    }, 1500);
  };

  const handleSaveUserPermissions = () => {
    if (!permEditingUser) return;
    const updated = users.map((u) => (u.id === permEditingUser.id ? permEditingUser : u));
    onUpdateUsers(updated);
    setPermEditingUser(null);
  };

  const handleCreateAdminOrUser = () => {
    if (!newUsername.trim() || !newRealName.trim()) {
      alert('请填写账号和姓名');
      return;
    }

    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      username: newUsername.trim(),
      password: newPassword.trim() || '123456',
      realName: newRealName.trim(),
      role: newRole,
      status: 'approved',
      department: newDept,
      phone: newPhone || '13800000000',
      registeredAt: new Date().toISOString().slice(0, 10),
      approvedAt: new Date().toISOString().slice(0, 10),
      approvedBy: currentUser?.realName || '总管理员直接新增',
    };

    onUpdateUsers([...users, newUser]);
    setIsAddModalOpen(false);
    setNewUsername('');
    setNewRealName('');
    setNewPhone('');
    setNewPassword('123456');
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>惠民皓天 成员准入审核与总管理员安全中枢</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            成员审核、角色授权与全员密码重置
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
            总管理员拥有最高权限，支持一键重置任意用户登录密码、分配管理员/专家权限、以及设定模块可见与隐藏规则。
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs md:text-sm font-bold shadow-md transition-all flex items-center gap-2 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>直接新增账号</span>
        </button>
      </div>

      {/* Section 1: Pending Approval Queue */}
      {pendingUsers.length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200 p-6 md:p-8 space-y-4 shadow-sm bg-gradient-to-b from-amber-50/40 to-white">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
              <h3 className="font-black text-slate-900 text-sm md:text-base">
                待审核注册申请 ({pendingUsers.length})
              </h3>
            </div>
            <span className="text-xs text-amber-700 font-semibold">请核实申请人身份后批准准入</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map((pUser) => (
              <div
                key={pUser.id}
                className="bg-white p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>{pUser.realName}</span>
                      <span className="text-xs font-mono text-slate-400">(@{pUser.username})</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {pUser.company || '个人'} · {pUser.department || '农技部门'} · 电话：{pUser.phone || '未填'}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                    待审核
                  </span>
                </div>

                {pUser.applyReason && (
                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                    <strong>申请事由：</strong>
                    {pUser.applyReason}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleApprove(pUser.id, 'admin')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      通过为管理员
                    </button>
                    <button
                      onClick={() => handleApprove(pUser.id, 'expert')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
                    >
                      通过为农艺专家
                    </button>
                    <button
                      onClick={() => handleApprove(pUser.id, 'member')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                    >
                      普通成员
                    </button>
                  </div>

                  <button
                    onClick={() => handleReject(pUser.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>拒绝</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Active User Management & Password Reset */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>系统全员账号、密码管控与角色列表 ({activeUsers.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              总管理员可直接重置任意用户密码，配置方案编辑、病虫害图谱与产品分类实训权限
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="按姓名 / 账号 / 部门检索..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:bg-white focus:border-emerald-500 outline-hidden font-medium"
            />
          </div>
        </div>

        {/* User table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">成员信息</th>
                <th className="py-3 px-4">当前角色</th>
                <th className="py-3 px-4">所属部门/职务</th>
                <th className="py-3 px-4">状态</th>
                <th className="py-3 px-4 text-right">总管理员安全操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeUsers.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                const isUserSuperAdmin = u.role === 'super_admin';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white ${
                            u.role === 'super_admin'
                              ? 'bg-purple-600'
                              : u.role === 'admin'
                              ? 'bg-emerald-600'
                              : 'bg-slate-600'
                          }`}
                        >
                          {u.realName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{u.realName}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                                当前登录
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 font-mono">@{u.username}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        disabled={isUserSuperAdmin && !isSuperAdmin}
                        onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-xl border outline-hidden transition-all ${
                          u.role === 'super_admin'
                            ? 'bg-purple-50 text-purple-900 border-purple-200'
                            : u.role === 'admin'
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : u.role === 'expert'
                            ? 'bg-blue-50 text-blue-900 border-blue-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="super_admin">超级总管理员 (全权)</option>
                        <option value="admin">内容与产品管理员</option>
                        <option value="expert">农艺技术专家</option>
                        <option value="member">正式技术成员</option>
                        <option value="viewer">只读观察员</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{u.department || '未分配'}</div>
                      <span className="text-[10px] text-slate-400">{u.phone || '-'}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          u.status === 'disabled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.status === 'disabled' ? '已停用' : '正常可用'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Reset Password Button */}
                        <button
                          onClick={() => {
                            setResettingUser(u);
                            setNewResetPassword('');
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                          title="重置登录密码"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>重置密码</span>
                        </button>

                        {/* Permission & Visibility settings button */}
                        <button
                          onClick={() => setPermEditingUser(u)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                          title="权限细分配置"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>权限</span>
                        </button>

                        {!isUserSuperAdmin && (
                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            className={`p-1.5 rounded-lg text-xs transition-colors ${
                              u.status === 'disabled'
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                            title={u.status === 'disabled' ? '启用账号' : '停用账号'}
                          >
                            {u.status === 'disabled' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        {!isUserSuperAdmin && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="删除成员"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resettingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">重置用户登录密码</h3>
                <p className="text-xs text-slate-400">
                  为用户 <strong className="text-slate-800">「{resettingUser.realName}」</strong> (账号: {resettingUser.username}) 设置新密码
                </p>
              </div>
            </div>

            {resetSuccessMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{resetSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">请输入新密码：</label>
                  <input
                    type="text"
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="输入 6 位以上新密码（例如：admin123 或 888888）"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-500 focus:bg-white outline-hidden font-mono font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewResetPassword('admin123')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium"
                  >
                    设为默认: admin123
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewResetPassword('888888')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium"
                  >
                    设为: 888888
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setResettingUser(null)}
                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleDoResetPassword}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    确认重置密码
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permission Customization Modal */}
      {permEditingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    细分权限与模块可见性配置
                  </h3>
                  <p className="text-xs text-slate-400">
                    针对成员「{permEditingUser.realName}」开启或关闭特定系统模块
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Category 1: Schemes & Crops */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block bg-emerald-50 px-2.5 py-1 rounded-lg">
                  方案与物候管理
                </span>
                
                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      修改/编辑全周期施肥方案
                    </span>
                    <span className="text-[10px] text-slate-400">
                      不受方案作者限制，可编辑物候期、用肥配方与亩用量
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permEditingUser.customPermissions?.canEditAllSchemes ?? permEditingUser.canEditAllSchemes ?? true}
                    onChange={(e) =>
                      setPermEditingUser({
                        ...permEditingUser,
                        canEditAllSchemes: e.target.checked,
                        customPermissions: {
                          ...permEditingUser.customPermissions,
                          canEditAllSchemes: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>
              </div>

              {/* Category 2: Pest Gallery */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block bg-amber-50 px-2.5 py-1 rounded-lg">
                  病虫害图谱与农药
                </span>
                
                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      新增与编辑病虫害图谱档案
                    </span>
                    <span className="text-[10px] text-slate-400">
                      维护病害图集、发生规律、症状与化学防治配方
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permEditingUser.customPermissions?.canEditPests ?? true}
                    onChange={(e) =>
                      setPermEditingUser({
                        ...permEditingUser,
                        customPermissions: {
                          ...permEditingUser.customPermissions,
                          canEditPests: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      删除病虫害档案权限
                    </span>
                    <span className="text-[10px] text-slate-400">
                      是否允许直接删除图谱库中的病害记录
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permEditingUser.customPermissions?.canDeletePests ?? (permEditingUser.role === 'admin' || permEditingUser.role === 'super_admin')}
                    onChange={(e) =>
                      setPermEditingUser({
                        ...permEditingUser,
                        customPermissions: {
                          ...permEditingUser.customPermissions,
                          canDeletePests: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>
              </div>

              {/* Category 3: Tools & Export */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block bg-purple-50 px-2.5 py-1 rounded-lg">
                  工具与导出工坊
                </span>

                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      访问「本地离线识别录入」
                    </span>
                    <span className="text-[10px] text-slate-400">
                      侧边栏显示 Word/Excel 离线识别与一键录入
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permEditingUser.canViewLocalImport ?? permEditingUser.customPermissions?.canViewLocalImport ?? true}
                    onChange={(e) =>
                      setPermEditingUser({
                        ...permEditingUser,
                        canViewLocalImport: e.target.checked,
                        customPermissions: {
                          ...permEditingUser.customPermissions,
                          canViewLocalImport: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      配置修改防伪水印与印章参数
                    </span>
                    <span className="text-[10px] text-slate-400">
                      在方案导出工坊中修改全屏水印文字和印章
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permEditingUser.customPermissions?.canManageWatermark ?? true}
                    onChange={(e) =>
                      setPermEditingUser({
                        ...permEditingUser,
                        customPermissions: {
                          ...permEditingUser.customPermissions,
                          canManageWatermark: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>
              </div>

              {/* Category 4: Operation & Admin */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block bg-blue-50 px-2.5 py-1 rounded-lg">
                  运营与中枢管理
                </span>

                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      管理互动交流与留言区
                    </span>
                    <span className="text-[10px] text-slate-400">
                      置顶推荐留言、删除不合规留言
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permEditingUser.customPermissions?.canManageCommunity ?? (permEditingUser.role === 'admin' || permEditingUser.role === 'super_admin')}
                    onChange={(e) =>
                      setPermEditingUser({
                        ...permEditingUser,
                        customPermissions: {
                          ...permEditingUser.customPermissions,
                          canManageCommunity: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      编辑全站静态字段与文案
                    </span>
                    <span className="text-[10px] text-slate-400">
                      修改导航文本、表格列名及标语文案
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permEditingUser.customPermissions?.canEditSiteTexts ?? (permEditingUser.role === 'admin' || permEditingUser.role === 'super_admin')}
                    onChange={(e) =>
                      setPermEditingUser({
                        ...permEditingUser,
                        customPermissions: {
                          ...permEditingUser.customPermissions,
                          canEditSiteTexts: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPermEditingUser(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveUserPermissions}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                保存权限设置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Direct Admin/User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-2xl bg-emerald-100 text-emerald-800">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">直接录入新管理员 / 专家账号</h3>
                <p className="text-xs text-slate-400">直接创建免审核准入账号</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">登录账号 (Username) *</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="如: zhangsan"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">初始登录密码 *</label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="默认: 123456"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden font-medium font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">真实姓名 *</label>
                  <input
                    type="text"
                    value={newRealName}
                    onChange={(e) => setNewRealName(e.target.value)}
                    placeholder="如: 张三"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">分配角色 *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden font-bold"
                  >
                    <option value="admin">内容与方案管理员</option>
                    <option value="expert">农艺植保专家</option>
                    <option value="member">技术团队成员</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">联系电话</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="手机号码"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">所属部门</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    placeholder="如: 技术研发中心"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateAdminOrUser}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                确认创建账号
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
