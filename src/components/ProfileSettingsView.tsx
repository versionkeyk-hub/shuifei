import React, { useState } from 'react';
import {
  User,
  Settings,
  ShieldCheck,
  Key,
  Phone,
  Building,
  Mail,
  CheckCircle2,
  Lock,
  Camera,
  Sparkles,
  Save
} from 'lucide-react';
import { AppUser, SystemSettings } from '../types';
import { ImageUploader } from './ImageUploader';

interface ProfileSettingsViewProps {
  currentUser: AppUser | null;
  settings: SystemSettings;
  onUpdateCurrentUser: (updatedUser: AppUser) => void;
  onOpenAuth: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  currentUser,
  settings,
  onUpdateCurrentUser,
  onOpenAuth,
}) => {
  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">尚未登录账号</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          请先登录或申请准入账号，登录后可在此修改个人信息、联系方式、头像与密码。
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all hover:scale-105"
        >
          立即登录
        </button>
      </div>
    );
  }

  const [realName, setRealName] = useState(currentUser.realName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [company, setCompany] = useState(currentUser.company || '');
  const [department, setDepartment] = useState(currentUser.department || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!realName.trim()) {
      setErrorMsg('真实姓名不能为空');
      return;
    }

    const updated: AppUser = {
      ...currentUser,
      realName: realName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      company: company.trim(),
      department: department.trim(),
      avatarUrl: avatarUrl.trim(),
    };

    onUpdateCurrentUser(updated);
    setSuccessMsg('个人资料已成功保存更新！');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newPassword.trim()) {
      setErrorMsg('新密码不能为空');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('两次输入的新密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('为了账号安全，新密码至少 6 位');
      return;
    }

    const updated: AppUser = {
      ...currentUser,
      password: newPassword.trim(),
    };

    onUpdateCurrentUser(updated);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMsg('登录密码已成功修改，请牢记新密码！');
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 rounded-3xl p-6 md:p-8 text-white shadow-xl flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
            <Settings className="w-3.5 h-3.5" />
            <span>账号与安全设置</span>
          </div>
          <h1 className="text-2xl font-black">个人中心与资料维护</h1>
          <p className="text-xs text-slate-300">
            维护您的农技专家名片、绑定手机与账号安全凭据
          </p>
        </div>

        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white/20">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full rounded-3xl object-cover" />
          ) : (
            realName.slice(0, 1) || '用'
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">专家头像设置</h3>
          
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-3xl shadow-md border-2 border-slate-200 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                realName.slice(0, 1) || '用'
              )}
            </div>

            <span className="text-xs font-bold text-slate-800">{realName || currentUser.username}</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              {currentUser.role === 'super_admin'
                ? '超级总管理员'
                : currentUser.role === 'admin'
                ? '技术管理员'
                : currentUser.role === 'expert'
                ? '农艺专家'
                : '团队成员'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <ImageUploader
              label="上传/粘贴新头像"
              currentImage={avatarUrl}
              onImageSelect={(url) => setAvatarUrl(url)}
            />
          </div>
        </div>

        {/* Middle & Right: Info & Password */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">基本信息与名片</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">登录用户名</label>
                <input
                  type="text"
                  value={currentUser.username}
                  disabled
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">真实姓名 *</label>
                <input
                  type="text"
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="如: 李农艺师"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-bold focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">联系电话 / 手机</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="手机号码"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">电子邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">所属公司 / 合作社</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="如: 惠民皓天农业科技有限公司"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">部门 / 植保技术组</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="如: 作物营养研发中心"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-105"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存基本信息</span>
              </button>
            </div>
          </form>

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>修改账号登录密码</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">输入新密码 (至少 6 位) *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">确认新密码 *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入新密码"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono focus:border-emerald-500 outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-105"
              >
                <Key className="w-3.5 h-3.5" />
                <span>确认修改密码</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
