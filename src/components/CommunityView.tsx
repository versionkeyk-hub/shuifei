import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Heart,
  Pin,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  User,
  Clock,
  ThumbsUp,
  X
} from 'lucide-react';
import { CommunityComment, AppUser, SystemSettings } from '../types';
import { ImageLightboxModal } from './ImageLightboxModal';
import { ImageUploader } from './ImageUploader';
import { getSiteText } from '../lib/siteTexts';

interface CommunityViewProps {
  comments: CommunityComment[];
  currentUser: AppUser | null;
  settings: SystemSettings;
  onAddComment: (comment: CommunityComment) => void;
  onDeleteComment: (commentId: string) => void;
  onTogglePin: (commentId: string) => void;
  onToggleLike: (commentId: string, userId: string) => void;
  onOpenAuth: () => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  comments,
  currentUser,
  settings,
  onAddComment,
  onDeleteComment,
  onTogglePin,
  onToggleLike,
  onOpenAuth,
}) => {
  const [newContent, setNewContent] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ images: string[]; initialIndex: number; title: string } | null>(null);

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  // Sort comments: Pinned first, then newest first
  const sortedComments = [...comments].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!newContent.trim() && uploadedImages.length === 0) {
      alert('请输入留言内容或上传图片');
      return;
    }

    const newComment: CommunityComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      authorId: currentUser.id,
      authorName: currentUser.realName || currentUser.username,
      authorAvatar: currentUser.avatarUrl,
      authorRole: currentUser.role,
      authorCompany: currentUser.company || currentUser.department || '农技团队',
      content: newContent.trim(),
      images: uploadedImages,
      likesCount: 0,
      likedUserIds: [],
      createdAt: new Date().toISOString(),
      isPinned: false,
    };

    onAddComment(newComment);
    setNewContent('');
    setUploadedImages([]);
    setShowImageUploader(false);
  };

  const handleRemoveUploadedImage = (idx: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold border border-emerald-500/30">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>农技同仁交流平台</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              {settings?.navTitles?.community || '技术交流与留言区'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl">
              {getSiteText('community_welcome_tip', settings?.siteTexts)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shrink-0 text-center">
            <span className="text-2xl md:text-3xl font-black text-emerald-400 block font-mono">
              {comments.length}
            </span>
            <span className="text-[11px] text-slate-300">累计留言交流</span>
          </div>
        </div>
      </div>

      {/* Publish Comment Box */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              {currentUser ? currentUser.realName.slice(0, 1) : '友'}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                {currentUser ? `${currentUser.realName} (${currentUser.company || currentUser.department || '成员'})` : '访客（请先登录）'}
              </span>
              <span className="text-[10px] text-slate-400">发表田间反馈、配方疑问或技术建议</span>
            </div>
          </div>

          {!currentUser && (
            <button
              onClick={onOpenAuth}
              className="text-xs text-emerald-600 font-bold hover:underline"
            >
              立即登录账号 →
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={
              currentUser
                ? '写下您的田间施肥体会、病害防治建议或平台改进想法，支持上传配图...'
                : '请登录后参与留言交流...'
            }
            rows={3}
            disabled={!currentUser}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-hidden focus:border-emerald-500 focus:bg-white transition-all resize-none text-slate-800 placeholder:text-slate-400"
          />

          {/* Uploaded Images Preview Strip */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-100">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden group border border-slate-200">
                  <img src={img} alt="upload" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveUploadedImage(idx)}
                    className="absolute top-1 right-1 p-0.5 bg-black/70 text-white rounded-md hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Image Uploader Drawer */}
          {showImageUploader && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <ImageUploader
                label="上传/粘贴/拖放配图 (支持田间实况、叶面症状等)"
                onImageSelect={(dataUrl) => {
                  setUploadedImages((prev) => [...prev, dataUrl]);
                  setShowImageUploader(false);
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowImageUploader(!showImageUploader)}
              disabled={!currentUser}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showImageUploader || uploadedImages.length > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{uploadedImages.length > 0 ? `已附图 (${uploadedImages.length})` : '添加配图 / 截图'}</span>
            </button>

            <button
              type="submit"
              disabled={!currentUser || (!newContent.trim() && uploadedImages.length === 0)}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>发布留言</span>
            </button>
          </div>
        </form>
      </div>

      {/* Comment List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <span>交流动态</span>
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-mono">
              最新排在前
            </span>
          </h2>
          <span className="text-[11px] text-slate-400">
            {sortedComments.length} 条记录
          </span>
        </div>

        {sortedComments.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">暂无留言交流</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              成为第一个在技术交流区发言的农技专家吧！分享您的配方心得与田间答疑。
            </p>
          </div>
        ) : (
          sortedComments.map((comment) => {
            const isLikedByMe = currentUser ? comment.likedUserIds?.includes(currentUser.id) : false;
            const isAuthor = currentUser?.id === comment.authorId;
            const canDelete = isAdmin || isAuthor;

            return (
              <div
                key={comment.id}
                className={`bg-white rounded-3xl p-5 md:p-6 border transition-all space-y-3 ${
                  comment.isPinned
                    ? 'border-emerald-300 shadow-md ring-2 ring-emerald-500/20 bg-gradient-to-b from-emerald-50/20 to-white'
                    : 'border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                {/* Author Info & Pin Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-black text-xs shadow-xs">
                      {comment.authorAvatar ? (
                        <img src={comment.authorAvatar} alt="" className="w-full h-full rounded-2xl object-cover" />
                      ) : (
                        comment.authorName.slice(0, 1)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{comment.authorName}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          comment.authorRole === 'super_admin'
                            ? 'bg-purple-100 text-purple-800'
                            : comment.authorRole === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : comment.authorRole === 'expert'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {comment.authorRole === 'super_admin'
                            ? '超级总管理员'
                            : comment.authorRole === 'admin'
                            ? '管理员'
                            : comment.authorRole === 'expert'
                            ? '农艺专家'
                            : '成员'}
                        </span>
                        {comment.isPinned && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500 text-white rounded-md font-bold flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" />
                            <span>置顶</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{comment.authorCompany}</span>
                        <span>•</span>
                        <span>{new Date(comment.createdAt).toLocaleString('zh-CN', { hour12: false })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin actions: Pin & Delete */}
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <button
                        onClick={() => onTogglePin(comment.id)}
                        className={`p-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          comment.isPinned
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                        title={comment.isPinned ? '取消置顶' : '置顶留言'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => {
                          if (confirm('确定删除该条留言吗？')) {
                            onDeleteComment(comment.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="删除留言"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Content Text */}
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pl-12 font-medium">
                  {comment.content}
                </p>

                {/* Images Gallery */}
                {comment.images && comment.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-12 pt-1">
                    {comment.images.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={() =>
                          setLightboxData({
                            images: comment.images!,
                            initialIndex: imgIdx,
                            title: `${comment.authorName}的留言配图`,
                          })
                        }
                        className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border border-slate-200 cursor-pointer hover:scale-105 transition-all shadow-xs"
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Likes Action Footer */}
                <div className="flex items-center justify-between pl-12 pt-2 border-t border-slate-50 text-xs">
                  <span className="text-[11px] text-slate-400">
                    {comment.likesCount > 0 ? `${comment.likesCount} 位同仁觉得很赞` : '暂无点赞'}
                  </span>

                  <button
                    onClick={() => {
                      if (!currentUser) {
                        onOpenAuth();
                        return;
                      }
                      onToggleLike(comment.id, currentUser.id);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-all ${
                      isLikedByMe
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${isLikedByMe ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{comment.likesCount || 0}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox for comment images */}
      {lightboxData && (
        <ImageLightboxModal
          images={lightboxData.images}
          initialIndex={lightboxData.initialIndex}
          title={lightboxData.title}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
};
