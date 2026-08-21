import React, { useState } from 'react';
import { LogIn, UserPlus, Shield, User, CheckCircle2, AlertCircle, X, Lock } from 'lucide-react';
import { AppUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  users: AppUser[];
  onLogin: (user: AppUser) => void;
  onLogout: () => void;
  onRegisterSubmit: (newUser: Partial<AppUser>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onLogin,
  onLogout,
  onRegisterSubmit,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [registerSubmitted, setRegisterSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetUser = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (!targetUser) {
      setErrorMsg('未找到该账号，若新用户请先注册并等待管理员审核');
      return;
    }

    if (targetUser.status === 'pending') {
      setErrorMsg('该账号注册申请正在审核中，请联系管理员在后台“成员审核”中通过');
      return;
    }

    if (targetUser.status === 'rejected') {
      setErrorMsg('该账号申请已被拒绝，请联系管理员');
      return;
    }

    onLogin(targetUser);
    onClose();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !realName.trim()) {
      setErrorMsg('请填写账号和真实姓名');
      return;
    }

    const exists = users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (exists) {
      setErrorMsg('该账号已被使用，请换一个用户名');
      return;
    }

    onRegisterSubmit({
      username: username.trim(),
      realName: realName.trim(),
      phone: phone.trim(),
      department: department.trim() || '业务部',
    });

    setRegisterSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Current User Header */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold">
                {currentUser.realName ? currentUser.realName.slice(0, 1) : '用'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">{currentUser.realName}</h3>
                  <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded">
                    {currentUser.role === 'super_admin'
                      ? '超级管理员'
                      : currentUser.role === 'admin'
                      ? '管理员'
                      : currentUser.role === 'expert'
                      ? '农技专家'
                      : '公司伙伴'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  账号: {currentUser.username} · 部门: {currentUser.department}
                </p>
              </div>
            </div>

            {/* Quick Switch User Demo Bar */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600 block">
                快速切换身份体验（演示）：
              </span>
              <div className="space-y-1.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onLogin(u);
                      onClose();
                    }}
                    className={`w-full p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors border ${
                      currentUser.id === u.id
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{u.realName} ({u.role === 'super_admin' || u.role === 'admin' ? '管理员' : '普通伙伴'})</span>
                    <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                退出登录
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                完成
              </button>
            </div>
          </div>
        ) : registerSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">注册申请已提交！</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                按照公司安全管理规范，您的账号需经管理员审核通过后方可登录。请联系管理员在系统后台进行审批。
              </p>
            </div>
            <button
              onClick={() => {
                setRegisterSubmitted(false);
                setTab('login');
              }}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md"
            >
              返回登录
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                onClick={() => setTab('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  tab === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                伙伴 / 管理员登录
              </button>
              <button
                onClick={() => setTab('register')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  tab === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                注册新账号 (需审核)
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">账号 / 用户名</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="输入用户名 (如: admin 或 expert1)"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                    required
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
                  <div className="font-bold text-slate-700">💡 演示账号快速登录：</div>
                  <div>• 管理员账号: <code className="bg-slate-200 px-1 rounded text-slate-800">admin</code></div>
                  <div>• 专家账号: <code className="bg-slate-200 px-1 rounded text-slate-800">expert1</code></div>
                  <div>• 公司伙伴账号: <code className="bg-slate-200 px-1 rounded text-slate-800">partner1</code></div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors text-xs flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>立即登录</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">用户名 *</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="英文字母或拼音"
                    className="w-full p-2 border border-slate-300 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">真实姓名 *</label>
                  <input
                    type="text"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                    placeholder="如: 李伟"
                    className="w-full p-2 border border-slate-300 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">所属部门 / 区域</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="如: 华北营销部 / 农技支持部"
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">手机号码</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="用于管理员确认身份"
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-colors text-xs flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>提交审核申请</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
