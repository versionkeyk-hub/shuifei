import React, { useState } from 'react';
import { LogIn, UserPlus, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AppUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onLogin: (user: AppUser) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [registerSubmitted, setRegisterSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toAppRole = (role: string): AppUser['role'] => {
    if (role === 'super_admin' || role === 'admin') return role;
    if (role === 'staff') return 'member';
    if (role === 'dealer') return 'expert';
    return 'viewer';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const payload = await response.json() as {
        token?: string;
        error?: string;
        user?: { id: string; username: string; display_name: string; role: string };
      };
      if (!response.ok || !payload.token || !payload.user) throw new Error(payload.error || '账号或密码错误');
      sessionStorage.setItem('hmht_api_token', payload.token);
      onLogin({
        id: payload.user.id,
        username: payload.user.username,
        realName: payload.user.display_name,
        role: toAppRole(payload.user.role),
        status: 'approved',
        registeredAt: new Date().toISOString().slice(0, 10),
      });
      setPassword('');
      onClose();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !realName.trim() || !password) {
      setErrorMsg('请填写账号、真实姓名和密码');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), display_name: realName.trim(), password }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || '注册申请提交失败');
      setPassword('');
      setRegisterSubmitted(true);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '注册申请提交失败');
    } finally {
      setIsSubmitting(false);
    }
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
                <div>
                  <label className="font-bold text-slate-700 block mb-1">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden font-medium"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors text-xs flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? '验证中…' : '安全登录'}</span>
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
                  <label className="font-bold text-slate-700 block mb-1">登录密码 *</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 8 位"
                    className="w-full p-2 border border-slate-300 rounded-xl"
                    minLength={8}
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
                  <span>{isSubmitting ? '提交中…' : '提交审核申请'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
